// Smoke test: launches the built MCP server over stdio with a dummy token (listing
// capabilities makes no API calls), then asserts the tool + prompt surface is correct,
// including the safety annotations. Run with: node scripts/smoke.mjs
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const entry = resolve(here, '..', 'dist', 'index.js');

let pass = 0;
let fail = 0;
function assert(label, ok) {
  console.log(`${ok ? 'PASS' : 'FAIL'} ${label}`);
  ok ? pass++ : fail++;
}

const transport = new StdioClientTransport({
  command: 'node',
  args: [entry],
  env: { ...process.env, VYNIX_API_TOKEN: 'dummy-token-for-listing', VYNIX_API_URL: 'http://127.0.0.1:9' },
});

const client = new Client({ name: 'smoke', version: '0.0.0' });
await client.connect(transport);

const { tools } = await client.listTools();
const byName = new Map(tools.map((t) => [t.name, t]));

const expected = [
  'list_projects',
  'list_annotations',
  'get_annotation',
  'list_comments',
  'get_annotation_analysis',
  'get_annotation_screenshots',
  'list_annotation_issues',
  'list_project_issues',
  'generate_prompt',
  'get_metrics',
  'list_members',
  'get_activity',
  'update_annotation_status',
  'add_comment',
  'diagnose_annotation',
  'create_github_issue',
  'create_share_link',
];
for (const name of expected) {
  assert(`tool present: ${name}`, byName.has(name));
}
assert(`tool count >= ${expected.length}`, tools.length >= expected.length);

// Every tool should carry a human title.
assert(
  'all tools have a title',
  tools.every((t) => typeof t.title === 'string' && t.title.length > 0 ||
    (t.annotations && typeof t.annotations.title === 'string')),
);

// Read-only hints on the safe reads.
assert('list_projects is readOnly', byName.get('list_projects')?.annotations?.readOnlyHint === true);
assert('get_annotation is readOnly', byName.get('get_annotation')?.annotations?.readOnlyHint === true);

// Write / external hints on the mutating + AI + GitHub tools.
assert(
  'diagnose_annotation is open-world + not read-only',
  byName.get('diagnose_annotation')?.annotations?.openWorldHint === true &&
    byName.get('diagnose_annotation')?.annotations?.readOnlyHint === false,
);
assert(
  'create_github_issue is open-world',
  byName.get('create_github_issue')?.annotations?.openWorldHint === true,
);
assert(
  'update_annotation_status is idempotent write',
  byName.get('update_annotation_status')?.annotations?.idempotentHint === true,
);

// Input schema sanity: list_annotations requires project_id.
const listAnn = byName.get('list_annotations');
assert(
  'list_annotations exposes project_id input',
  Boolean(listAnn?.inputSchema?.properties?.project_id),
);

// Prompt surface.
const { prompts } = await client.listPrompts();
assert('fix_annotation prompt present', prompts.some((p) => p.name === 'fix_annotation'));

await client.close();

console.log(`\nMCP SMOKE: ${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
