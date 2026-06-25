# Vynix MCP server

A [Model Context Protocol](https://modelcontextprotocol.io) server that gives AI coding
agents (Claude, Copilot, Cursor and more) direct access to your [Vynix](https://vynix.in) annotations, so an
agent can read the feedback, see the captured context and screenshots, run an AI
diagnosis, generate a fix prompt, open a GitHub issue, update status, and comment, all
without leaving the editor.

Every tool carries MCP **annotations** (read-only / idempotent / open-world hints) so a
client can auto-approve safe reads and confirm before writes, AI spend, or GitHub calls.

## Tools

Read-only:

| Tool | Description |
| --- | --- |
| `list_projects` | List the projects you own. |
| `list_annotations` | List a project's annotations, filtered by status / type / priority. |
| `get_annotation` | Fetch one annotation with full page / element / DOM / diagnostics context. |
| `list_comments` | Read an annotation's discussion thread. |
| `get_annotation_analysis` | Read the latest AI diagnosis (root causes, fix, likely files). |
| `get_annotation_screenshots` | Return attached screenshots as viewable images. |
| `list_annotation_issues` | List the GitHub issues opened from an annotation (optionally live). |
| `list_project_issues` | List every tracker issue across a project, with a summary. |
| `generate_prompt` | Produce a ready-to-paste prompt (`claude`/`copilot`/`cursor`/`gemini`/`codex`/`generic`). |
| `get_metrics` | KPI counts, status breakdown, time series, recent activity. |
| `list_members` | A project's team members. |
| `get_activity` | A project's recent activity feed. |

Writes (a client should confirm these):

| Tool | Description |
| --- | --- |
| `update_annotation_status` | Move an annotation to `in_progress`, `completed`, etc. |
| `add_comment` | Post a comment to an annotation's thread (notifies the team). |
| `diagnose_annotation` | Run the AI Diagnosis Engine (uses an AI provider; stores the result). |
| `create_github_issue` | File a GitHub issue from an annotation. |
| `create_share_link` | Mint a read-only public review link for a project. |

## Prompts

| Prompt | Description |
| --- | --- |
| `fix_annotation` | A guided, step-by-step workflow that walks the agent from an annotation through context → screenshots → AI diagnosis → fix → status + comment. |

## Install

The server is published on npm. Most MCP clients (Cursor, VS Code, Claude Desktop and more)
just need a command and a token, and `npx` fetches and runs it automatically with no global
install. Requires Node.js 18+:

```json
{
  "mcpServers": {
    "vynix": {
      "command": "npx",
      "args": ["-y", "@usevynix/mcp-server"],
      "env": {
        "VYNIX_API_URL": "https://www.vynix.in",
        "VYNIX_API_TOKEN": "PASTE_YOUR_TOKEN_HERE"
      }
    }
  }
}
```

Generate your token from the Vynix dashboard at <https://www.vynix.in/mcp>. Config file
locations: Cursor `~/.cursor/mcp.json`, VS Code `.vscode/mcp.json`, Claude Desktop
`claude_desktop_config.json`. VS Code uses a top-level `"servers"` key instead of
`"mcpServers"`; everything else is identical.

## Configure

Authenticate with either a token (recommended) or email and password:

- `VYNIX_API_URL` - your Vynix API base URL (default `https://www.vynix.in`).
- `VYNIX_API_TOKEN` - a token generated at <https://www.vynix.in/mcp>, **or**
- `VYNIX_API_EMAIL` + `VYNIX_API_PASSWORD` - the server logs in on demand and refreshes
  the token automatically when it expires.

## Build from source

For contributors who want to run the server from a local checkout:

```bash
git clone https://github.com/vynix-in/vynix-mcp.git
cd vynix-mcp
npm install
npm run build
npm start          # runs dist/index.js over stdio
npm run dev        # watch mode with tsx
npm test           # smoke test: launches the server and verifies the tool + prompt surface
```

Then point your client at the built file instead of `npx`:

```json
{
  "mcpServers": {
    "vynix": {
      "command": "node",
      "args": ["/absolute/path/to/vynix-mcp/dist/index.js"],
      "env": {
        "VYNIX_API_URL": "https://www.vynix.in",
        "VYNIX_API_TOKEN": "PASTE_YOUR_TOKEN_HERE"
      }
    }
  }
}
```

Diagnostics are written to stderr; stdout is reserved for the protocol stream.
