export type Priority = 'critical' | 'high' | 'medium' | 'low';

export type AnnotationType =
  | 'bug'
  | 'design'
  | 'enhancement'
  | 'content'
  | 'mobile'
  | 'accessibility'
  | 'performance'
  | 'seo';

export type AnnotationStatus =
  | 'open'
  | 'in_progress'
  | 'review'
  | 'completed'
  | 'rejected'
  | 'archived';

export type PromptTarget = 'claude' | 'copilot' | 'cursor' | 'gemini' | 'codex' | 'generic';

export interface AuthResult {
  token: string;
  token_type: string;
  user: { id: string; name: string; email: string };
}

export interface Project {
  id: string;
  name: string;
  website_url: string | null;
  ingest_key: string;
  allowed_origins: string[];
  created_at: string;
}

export interface Annotation {
  id: string;
  project_id: string;
  title: string;
  description: string | null;
  priority: Priority;
  type: AnnotationType;
  status: AnnotationStatus;
  page_url: string;
  page_title: string | null;
  selector: string | null;
  element: Record<string, unknown>;
  page: Record<string, unknown>;
  dom: Record<string, unknown> | null;
  reporter_name: string | null;
  reporter_email: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface AnnotationListResult {
  items: Annotation[];
  total: number;
  limit: number;
  offset: number;
}

export interface AnnotationComment {
  id: string;
  annotation_id: string;
  author_id: string | null;
  author_name: string | null;
  body: string;
  created_at: string;
}

export interface PromptResult {
  target: string;
  prompt: string;
}

export interface AnnotationFilters {
  status?: AnnotationStatus;
  type?: AnnotationType;
  priority?: Priority;
  limit?: number;
  offset?: number;
}

export interface OverviewData {
  kpis: { projects: number; annotations: number; open: number; resolved: number };
  status_breakdown: { status: AnnotationStatus; count: number }[];
  timeseries: { date: string; count: number }[];
  recent_activity: ActivityEntry[];
}

export interface ActivityEntry {
  id: string;
  project_id: string;
  annotation_id: string | null;
  annotation_title: string | null;
  actor: string | null;
  action: string;
  meta: Record<string, unknown>;
  created_at: string;
}

export interface ProjectMember {
  id: string;
  project_id: string;
  user_id: string | null;
  invited_email: string | null;
  role: string;
  status: string;
  user_name: string | null;
  user_email: string | null;
  created_at: string;
}

export interface IssueLink {
  id: string;
  annotation_id: string;
  provider: string;
  repo: string;
  issue_number: number;
  issue_url: string;
  assignee: string | null;
  state: string;
  created_at: string;
}

export interface PromptResultFull {
  target: string;
  prompt: string;
  ai_eligible: boolean;
}

/** A ranked likely cause from the AI Diagnosis Engine. */
export interface AiRootCause {
  cause: string;
  confidence?: number;
}

/** A source file the AI thinks the issue lives in. */
export interface AiSuggestedFile {
  path: string;
  reason?: string;
  lines?: string;
}

/** The AI diagnosis stored for an annotation. */
export interface AiAnalysis {
  id: string;
  annotation_id: string;
  status: string;
  provider: string | null;
  model: string | null;
  summary: string | null;
  root_causes: AiRootCause[];
  confidence: number | null;
  suggested_fix: string | null;
  suggested_files: AiSuggestedFile[];
  created_at: string;
  updated_at: string;
}

export interface AnalysisResult {
  analysis: AiAnalysis | null;
  diagnosis_enabled: boolean;
}

/** A region screenshot attached to an annotation, with an inline data URL. */
export interface AnnotationScreenshot {
  id: string;
  annotation_id: string;
  mime: string;
  width: number | null;
  height: number | null;
  byte_size: number;
  created_at: string;
  data_url: string;
}

/** A tracker issue opened from an annotation, with its live lifecycle phase. */
export interface AnnotationIssue {
  id: string;
  annotation_id: string;
  provider: string;
  repo: string | null;
  issue_number: number | null;
  issue_url: string | null;
  assignee: string | null;
  agent: boolean;
  state: string | null;
  phase?: string;
  pr_url?: string | null;
  created_at: string;
}

export interface ProjectIssuesResult {
  summary: { total: number; open: number; closed: number; agent: number };
  issues: AnnotationIssue[];
}

/** A read-only public review link for a project. */
export interface ShareLink {
  id: string;
  project_id: string;
  token: string;
  scope: string;
  path: string;
  expires_at: string | null;
  is_expired: boolean;
  created_at: string;
}
