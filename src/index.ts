#!/usr/bin/env node
import { createRequire } from 'node:module';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { VynixApiError, VynixClient } from './api.js';
import { assertConfigured, loadConfig } from './config.js';
import type { AnnotationScreenshot } from './types.js';

const STATUS_VALUES = [
  'open',
  'in_progress',
  'review',
  'completed',
  'rejected',
  'archived',
] as const;
const TYPE_VALUES = [
  'bug',
  'design',
  'enhancement',
  'content',
  'mobile',
  'accessibility',
  'performance',
  'seo',
] as const;
const PRIORITY_VALUES = ['critical', 'high', 'medium', 'low'] as const;
const TARGET_VALUES = ['claude', 'copilot', 'cursor', 'gemini', 'codex', 'generic'] as const;
const PROVIDER_VALUES = ['openai', 'anthropic', 'gemini', 'openrouter', 'mistral', 'groq'] as const;

type Content =
  | { type: 'text'; text: string }
  | { type: 'image'; data: string; mimeType: string };

type ToolResult = {
  content: Content[];
  isError?: boolean;
};

function text(value: string): ToolResult {
  return { content: [{ type: 'text', text: value }] };
}

function json(value: unknown): ToolResult {
  return text(JSON.stringify(value, null, 2));
}

function fail(message: string): ToolResult {
  return { content: [{ type: 'text', text: message }], isError: true };
}

function describeError(error: unknown): string {
  if (error instanceof VynixApiError) {
    return `Vynix API error (${error.status} ${error.code}): ${error.message}`;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return 'An unknown error occurred.';
}

/** Wrap a tool body so every failure becomes a clean, readable tool error. */
function guarded(run: () => Promise<ToolResult>): Promise<ToolResult> {
  return run().catch((error: unknown) => fail(describeError(error)));
}

/** Turn an annotation's screenshots into MCP image content a multimodal agent can see. */
function screenshotContent(shots: AnnotationScreenshot[]): ToolResult {
  if (shots.length === 0) {
    return text('This annotation has no attached screenshots.');
  }

  const content: Content[] = [
    { type: 'text', text: `${shots.length} screenshot(s) attached to this annotation:` },
  ];
  for (const shot of shots) {
    const match = /^data:([^;]+);base64,(.*)$/s.exec(shot.data_url);
    if (match) {
      content.push({ type: 'image', mimeType: match[1], data: match[2] });
    }
  }
  return { content };
}

function readVersion(): string {
  try {
    const require = createRequire(import.meta.url);
    const pkg = require('../package.json') as { version?: string };
    return pkg.version ?? '0.0.0';
  } catch {
    return '0.0.0';
  }
}

async function main(): Promise<void> {
  const config = loadConfig();
  // Fail fast with an actionable message instead of erroring on the first tool call.
  assertConfigured(config);

  const client = new VynixClient(config);
  const server = new McpServer({ name: 'vynix', version: readVersion() });

  // --- Read-only tools ------------------------------------------------------
  // readOnlyHint lets MCP clients auto-approve these without a per-call prompt.

  server.registerTool(
    'list_projects',
    {
      title: 'List projects',
      description: 'List the Vynix projects you own.',
      annotations: { readOnlyHint: true },
    },
    () => guarded(async () => json(await client.listProjects())),
  );

  server.registerTool(
    'list_annotations',
    {
      title: 'List annotations',
      description:
        'List a project\u2019s annotations, optionally filtered by status, type, or priority. ' +
        'Start here with status "open" to see what needs fixing.',
      inputSchema: {
        project_id: z.string().describe('The id of the project to list annotations for.'),
        status: z.enum(STATUS_VALUES).optional(),
        type: z.enum(TYPE_VALUES).optional(),
        priority: z.enum(PRIORITY_VALUES).optional(),
        limit: z.number().int().min(1).max(200).optional().describe('Page size, 1-200 (default 50).'),
        offset: z.number().int().min(0).optional(),
      },
      annotations: { readOnlyHint: true },
    },
    (args) =>
      guarded(async () =>
        json(
          await client.listAnnotations(args.project_id, {
            status: args.status,
            type: args.type,
            priority: args.priority,
            limit: args.limit,
            offset: args.offset,
          }),
        ),
      ),
  );

  server.registerTool(
    'get_annotation',
    {
      title: 'Get annotation',
      description:
        'Fetch one annotation with its full captured context: page, target element ' +
        '(selector, XPath, styles), surrounding DOM, and runtime diagnostics (console + network).',
      inputSchema: { annotation_id: z.string().describe('The id of the annotation to fetch.') },
      annotations: { readOnlyHint: true },
    },
    (args) => guarded(async () => json(await client.getAnnotation(args.annotation_id))),
  );

  server.registerTool(
    'list_comments',
    {
      title: 'List comments',
      description: 'Read the discussion thread on an annotation.',
      inputSchema: { annotation_id: z.string() },
      annotations: { readOnlyHint: true },
    },
    (args) => guarded(async () => json(await client.listComments(args.annotation_id))),
  );

  server.registerTool(
    'get_annotation_analysis',
    {
      title: 'Get AI diagnosis',
      description:
        'Read the latest stored AI diagnosis for an annotation (root causes, confidence, ' +
        'suggested fix, and likely source files). Returns null when none has been generated yet; ' +
        'run diagnose_annotation to create one.',
      inputSchema: { annotation_id: z.string() },
      annotations: { readOnlyHint: true },
    },
    (args) => guarded(async () => json(await client.getAnalysis(args.annotation_id))),
  );

  server.registerTool(
    'get_annotation_screenshots',
    {
      title: 'Get screenshots',
      description:
        'Return the region screenshots attached to an annotation as viewable images, so you ' +
        'can see exactly what the reporter pointed at.',
      inputSchema: { annotation_id: z.string() },
      annotations: { readOnlyHint: true },
    },
    (args) =>
      guarded(async () => screenshotContent(await client.getScreenshots(args.annotation_id))),
  );

  server.registerTool(
    'list_annotation_issues',
    {
      title: 'List annotation issues',
      description:
        'List the tracker (GitHub) issues opened from an annotation, with each issue\u2019s live ' +
        'state. Set refresh to reconcile against GitHub (open/closed + any linked pull request).',
      inputSchema: {
        annotation_id: z.string(),
        refresh: z.boolean().optional().describe('Reconcile live state from GitHub. Optional.'),
      },
      annotations: { readOnlyHint: true, openWorldHint: true },
    },
    (args) =>
      guarded(async () =>
        json(await client.listAnnotationIssues(args.annotation_id, args.refresh ?? false)),
      ),
  );

  server.registerTool(
    'list_project_issues',
    {
      title: 'List project issues',
      description: 'List every tracker issue across a project, with an open/closed/agent summary.',
      inputSchema: { project_id: z.string() },
      annotations: { readOnlyHint: true },
    },
    (args) => guarded(async () => json(await client.listProjectIssues(args.project_id))),
  );

  server.registerTool(
    'generate_prompt',
    {
      title: 'Generate coding prompt',
      description:
        'Render a ready-to-paste coding prompt for an annotation, formatted for a target ' +
        'assistant. A deterministic template (no AI spend); for a deeper analysis use diagnose_annotation.',
      inputSchema: {
        annotation_id: z.string().describe('The id of the annotation to turn into a prompt.'),
        target: z
          .enum(TARGET_VALUES)
          .optional()
          .describe('Which assistant to format for. Defaults to generic.'),
      },
      annotations: { readOnlyHint: true },
    },
    (args) =>
      guarded(async () => {
        const result = await client.generatePrompt(args.annotation_id, args.target ?? 'generic');
        return text(result.prompt);
      }),
  );

  server.registerTool(
    'get_metrics',
    {
      title: 'Get metrics',
      description:
        'Overview of your projects: KPI counts, status breakdown, a daily time series, and recent activity.',
      annotations: { readOnlyHint: true },
    },
    () => guarded(async () => json(await client.getOverview())),
  );

  server.registerTool(
    'list_members',
    {
      title: 'List members',
      description: 'List a project\u2019s team members, including role and status.',
      inputSchema: { project_id: z.string() },
      annotations: { readOnlyHint: true },
    },
    (args) => guarded(async () => json(await client.listMembers(args.project_id))),
  );

  server.registerTool(
    'get_activity',
    {
      title: 'Get activity',
      description: 'Recent activity feed for a project (status changes, comments, issues, members).',
      inputSchema: { project_id: z.string() },
      annotations: { readOnlyHint: true },
    },
    (args) => guarded(async () => json(await client.listActivity(args.project_id))),
  );

  // --- Write tools ----------------------------------------------------------
  // These mutate state; the hints tell clients to confirm before running.

  server.registerTool(
    'update_annotation_status',
    {
      title: 'Update status',
      description: 'Update an annotation\u2019s status, e.g. to mark it in_progress or completed.',
      inputSchema: { annotation_id: z.string(), status: z.enum(STATUS_VALUES) },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true },
    },
    (args) =>
      guarded(async () => json(await client.updateStatus(args.annotation_id, args.status))),
  );

  server.registerTool(
    'add_comment',
    {
      title: 'Add comment',
      description:
        'Add a comment to an annotation\u2019s thread, e.g. to record what you changed. Notifies the team.',
      inputSchema: {
        annotation_id: z.string(),
        body: z.string().min(1).describe('The comment text.'),
      },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false },
    },
    (args) => guarded(async () => json(await client.addComment(args.annotation_id, args.body))),
  );

  server.registerTool(
    'diagnose_annotation',
    {
      title: 'Run AI diagnosis',
      description:
        'Run the AI Diagnosis Engine on an annotation: it analyses the captured page, element, ' +
        'DOM, and runtime errors to produce ranked root causes, a confidence score, a suggested ' +
        'fix, and the likely source files. Calls an AI provider (uses tokens / may cost money) and ' +
        'stores the result. Requires AI + diagnosis enabled by the workspace admin and a key set.',
      inputSchema: {
        annotation_id: z.string(),
        provider: z
          .enum(PROVIDER_VALUES)
          .optional()
          .describe('Override the AI provider. Defaults to the workspace default.'),
        model: z.string().optional().describe('Override the model. Optional.'),
      },
      // Not read-only (writes an analysis), not idempotent (re-runs cost tokens), and
      // open-world (reaches an external AI provider) so clients confirm before each run.
      annotations: { readOnlyHint: false, idempotentHint: false, openWorldHint: true },
    },
    (args) =>
      guarded(async () =>
        json(
          await client.diagnoseAnnotation(args.annotation_id, {
            provider: args.provider,
            model: args.model,
          }),
        ),
      ),
  );

  server.registerTool(
    'create_github_issue',
    {
      title: 'Create GitHub issue',
      description:
        'Create a GitHub issue from an annotation. Uses the project\u2019s configured repo and ' +
        'assignee unless overridden. Embeds the generated AI prompt in the issue body.',
      inputSchema: {
        annotation_id: z.string().describe('The id of the annotation to file as an issue.'),
        repo: z.string().optional().describe('owner/repository to file the issue in. Optional.'),
        assignees: z.array(z.string()).optional().describe('GitHub usernames to assign. Optional.'),
      },
      annotations: { readOnlyHint: false, idempotentHint: false, openWorldHint: true },
    },
    (args) =>
      guarded(async () =>
        json(
          await client.createIssue(args.annotation_id, {
            repo: args.repo,
            assignees: args.assignees,
          }),
        ),
      ),
  );

  server.registerTool(
    'create_share_link',
    {
      title: 'Create share link',
      description:
        'Mint a read-only public review link for a project, so a stakeholder can review its ' +
        'annotations without an account. Reporter emails are hidden on shared views.',
      inputSchema: {
        project_id: z.string(),
        expires_in_days: z
          .number()
          .int()
          .min(0)
          .max(365)
          .optional()
          .describe('Days until the link expires. 0 or omitted means it never expires.'),
      },
      annotations: { readOnlyHint: false, idempotentHint: false },
    },
    (args) =>
      guarded(async () =>
        json(await client.createShareLink(args.project_id, args.expires_in_days)),
      ),
  );

  // --- Prompt: a guided end-to-end fix loop ---------------------------------

  server.registerPrompt(
    'fix_annotation',
    {
      title: 'Fix a Vynix annotation',
      description:
        'A guided workflow to take one annotation from report to fix using the captured context ' +
        'and the AI diagnosis.',
      argsSchema: { annotation_id: z.string().describe('The annotation to fix.') },
    },
    (args) => ({
      messages: [
        {
          role: 'user',
          content: {
            type: 'text',
            text:
              `Fix the Vynix annotation ${args.annotation_id}. Work through these steps:\n` +
              `1. Call get_annotation to read the full captured context (page, element, DOM, diagnostics).\n` +
              `2. Call get_annotation_screenshots to see what the reporter pointed at.\n` +
              `3. Call get_annotation_analysis for an existing AI diagnosis; if none, call ` +
              `diagnose_annotation to generate root causes, a suggested fix, and the likely files.\n` +
              `4. Make the minimal code change in the indicated files.\n` +
              `5. Call update_annotation_status to "in_progress" while working and "completed" when done.\n` +
              `6. Call add_comment to record what you changed.\n` +
              `Be precise and only touch the relevant component.`,
          },
        },
      ],
    }),
  );

  const transport = new StdioServerTransport();
  await server.connect(transport);

  // Diagnostics must go to stderr; stdout is reserved for the MCP protocol.
  console.error(`Vynix MCP server v${readVersion()} is running on stdio.`);
}

main().catch((error) => {
  console.error('Fatal error starting the Vynix MCP server:', error);
  process.exit(1);
});
