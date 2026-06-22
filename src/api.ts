import type { VynixConfig } from './config.js';
import type {
  ActivityEntry,
  AiAnalysis,
  AnalysisResult,
  Annotation,
  AnnotationComment,
  AnnotationFilters,
  AnnotationIssue,
  AnnotationListResult,
  AnnotationScreenshot,
  AnnotationStatus,
  AuthResult,
  IssueLink,
  OverviewData,
  Project,
  ProjectIssuesResult,
  ProjectMember,
  PromptResult,
  PromptTarget,
  ShareLink,
} from './types.js';

/** Thrown for any non-2xx response from the Vynix API. */
export class VynixApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'VynixApiError';
  }
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH';
  body?: unknown;
  query?: Record<string, string | number | undefined>;
  auth?: boolean;
}

/**
 * A thin, typed client over the Vynix REST API.
 *
 * It authenticates with a configured token, or by logging in with account
 * credentials. When a request comes back 401 and credentials are available, it
 * transparently refreshes the token once and retries.
 */
export class VynixClient {
  private token: string | undefined;

  constructor(private readonly config: VynixConfig) {
    this.token = config.token;
  }

  listProjects(): Promise<Project[]> {
    return this.authed<Project[]>('/api/v1/projects');
  }

  listAnnotations(projectId: string, filters: AnnotationFilters = {}): Promise<AnnotationListResult> {
    return this.authed<AnnotationListResult>(
      `/api/v1/projects/${encodeURIComponent(projectId)}/annotations`,
      {
        query: {
          status: filters.status,
          type: filters.type,
          priority: filters.priority,
          limit: filters.limit,
          offset: filters.offset,
        },
      },
    );
  }

  getAnnotation(id: string): Promise<Annotation> {
    return this.authed<Annotation>(`/api/v1/annotations/${encodeURIComponent(id)}`);
  }

  generatePrompt(id: string, target: PromptTarget): Promise<PromptResult> {
    return this.authed<PromptResult>(`/api/v1/annotations/${encodeURIComponent(id)}/prompt`, {
      method: 'POST',
      body: { target },
    });
  }

  updateStatus(id: string, status: AnnotationStatus): Promise<Annotation> {
    return this.authed<Annotation>(`/api/v1/annotations/${encodeURIComponent(id)}/status`, {
      method: 'PATCH',
      body: { status },
    });
  }

  addComment(id: string, body: string): Promise<AnnotationComment> {
    return this.authed<AnnotationComment>(
      `/api/v1/annotations/${encodeURIComponent(id)}/comments`,
      { method: 'POST', body: { body } },
    );
  }

  listComments(id: string): Promise<AnnotationComment[]> {
    return this.authed<AnnotationComment[]>(
      `/api/v1/annotations/${encodeURIComponent(id)}/comments`,
    );
  }

  /** Run the AI Diagnosis Engine on an annotation and return the stored result. */
  diagnoseAnnotation(
    id: string,
    options: { provider?: string; model?: string } = {},
  ): Promise<AiAnalysis> {
    return this.authed<AiAnalysis>(`/api/v1/annotations/${encodeURIComponent(id)}/diagnose`, {
      method: 'POST',
      body: { provider: options.provider, model: options.model },
    });
  }

  /** Read the latest stored AI diagnosis for an annotation (null when none has run). */
  getAnalysis(id: string): Promise<AnalysisResult> {
    return this.authed<AnalysisResult>(`/api/v1/annotations/${encodeURIComponent(id)}/analysis`);
  }

  getScreenshots(id: string): Promise<AnnotationScreenshot[]> {
    return this.authed<AnnotationScreenshot[]>(
      `/api/v1/annotations/${encodeURIComponent(id)}/screenshots`,
    );
  }

  listAnnotationIssues(id: string, refresh = false): Promise<{ issues: AnnotationIssue[] }> {
    return this.authed<{ issues: AnnotationIssue[] }>(
      `/api/v1/annotations/${encodeURIComponent(id)}/issues`,
      { query: { refresh: refresh ? '1' : undefined } },
    );
  }

  listProjectIssues(projectId: string): Promise<ProjectIssuesResult> {
    return this.authed<ProjectIssuesResult>(
      `/api/v1/projects/${encodeURIComponent(projectId)}/issues`,
    );
  }

  createShareLink(projectId: string, expiresInDays?: number): Promise<ShareLink> {
    return this.authed<ShareLink>(
      `/api/v1/projects/${encodeURIComponent(projectId)}/share-links`,
      { method: 'POST', body: { expires_in_days: expiresInDays ?? 0 } },
    );
  }

  getOverview(): Promise<OverviewData> {
    return this.authed<OverviewData>('/api/v1/me/overview');
  }

  listMembers(projectId: string): Promise<ProjectMember[]> {
    return this.authed<ProjectMember[]>(
      `/api/v1/projects/${encodeURIComponent(projectId)}/members`,
    );
  }

  listActivity(projectId: string): Promise<ActivityEntry[]> {
    return this.authed<ActivityEntry[]>(
      `/api/v1/projects/${encodeURIComponent(projectId)}/activity`,
    );
  }

  createIssue(
    annotationId: string,
    input: { repo?: string; assignees?: string[] } = {},
  ): Promise<IssueLink> {
    return this.authed<IssueLink>(`/api/v1/annotations/${encodeURIComponent(annotationId)}/issue`, {
      method: 'POST',
      body: input,
    });
  }

  private async ensureToken(): Promise<void> {
    if (!this.token) {
      await this.login();
    }
  }

  private async login(): Promise<void> {
    if (!this.config.email || !this.config.password) {
      throw new Error(
        'Not authenticated. Set VYNIX_API_TOKEN, or VYNIX_API_EMAIL and VYNIX_API_PASSWORD.',
      );
    }
    const result = await this.request<AuthResult>('/api/v1/auth/login', {
      method: 'POST',
      body: { email: this.config.email, password: this.config.password },
      auth: false,
    });
    this.token = result.token;
  }

  private async authed<T>(path: string, options: RequestOptions = {}): Promise<T> {
    await this.ensureToken();
    try {
      return await this.request<T>(path, { ...options, auth: true });
    } catch (error) {
      const canRetry =
        error instanceof VynixApiError &&
        error.status === 401 &&
        Boolean(this.config.email && this.config.password);

      if (!canRetry) {
        throw error;
      }

      this.token = undefined;
      await this.login();
      return this.request<T>(path, { ...options, auth: true });
    }
  }

  private async request<T>(path: string, options: RequestOptions = {}): Promise<T> {
    const { method = 'GET', body, query, auth = true } = options;

    const url = new URL(`${this.config.apiUrl}${path}`);
    if (query) {
      for (const [key, value] of Object.entries(query)) {
        if (value !== undefined && value !== '') {
          url.searchParams.set(key, String(value));
        }
      }
    }

    const headers: Record<string, string> = { Accept: 'application/json' };
    if (body !== undefined) {
      headers['Content-Type'] = 'application/json';
    }
    if (auth && this.token) {
      headers.Authorization = `Bearer ${this.token}`;
    }

    let response: Response;
    try {
      response = await fetch(url.toString(), {
        method,
        headers,
        body: body === undefined ? undefined : JSON.stringify(body),
      });
    } catch {
      throw new VynixApiError(0, 'network_error', `Could not reach the API at ${this.config.apiUrl}.`);
    }

    const payload: unknown = await response.json().catch(() => null);

    if (!response.ok) {
      const error = extractError(payload);
      throw new VynixApiError(
        response.status,
        error.code ?? 'http_error',
        error.message ?? `Request failed with status ${response.status}.`,
      );
    }

    return (payload as { data: T }).data;
  }
}

interface ApiErrorBody {
  code?: string;
  message?: string;
}

function extractError(payload: unknown): ApiErrorBody {
  if (payload && typeof payload === 'object' && 'error' in payload) {
    const error = (payload as { error: unknown }).error;
    if (error && typeof error === 'object') {
      return error as ApiErrorBody;
    }
  }
  return {};
}
