# Vynix MCP Server

> Give AI coding agents access to Vynix visual feedback and bug reports.

[![Website](https://img.shields.io/badge/website-vynix.in-008448)](https://vynix.in)
[![Docs](https://img.shields.io/badge/docs-vynix.in%2Fdocs-008448)](https://vynix.in/docs)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue)](./LICENSE)

Vynix MCP Server connects [Vynix](https://vynix.in) to MCP-aware AI coding tools. It lets agents read visual feedback, bug reports, captured browser context, and AI diagnosis from Vynix so issues can move from report to fix faster.

Vynix MCP Server is part of the Vynix developer toolkit for teams that build with AI coding agents.

## What is Vynix?

Vynix is a website annotation and developer-context tool. Add a lightweight widget to any site, click what is wrong, and Vynix captures the element, a screenshot, console and network context, and an AI diagnosis of the likely root cause.

From there, you can copy a ready-to-build prompt or open a GitHub issue and assign it to a coding agent.

Learn more at **[vynix.in](https://vynix.in)** or read the **[documentation](https://vynix.in/docs)**.

## Why teams use Vynix

- **Click-to-annotate any page.** Point at an element, region, or selected text and leave a note pinned to the relevant part of the page.
- **Automatic developer context.** Each note includes the element selector, page URL, screenshot, and privacy-safe console and network context.
- **AI root-cause diagnosis.** Vynix reviews the captured context and suggests the likely cause, a possible fix, and the files most likely involved.
- **Hand off to a coding agent.** Convert a note into a prompt or GitHub issue, then assign it through Copilot or your existing workflow.

## Install

```bash
npx -y @vynix/mcp
```

> Note: the Vynix toolkit is rolling out. If a package or command above does not resolve yet, watch this repo for the release and use the hosted product at [vynix.in](https://vynix.in) in the meantime.

## Usage

Add the Vynix MCP server to your AI client, such as Claude Desktop, Cursor, or another MCP-aware agent.

```json
{
 "mcpServers": {
 "vynix": {
 "command": "npx",
 "args": ["-y", "@vynix/mcp"],
 "env": { "VYNIX_API_TOKEN": "YOUR_TOKEN" }
 }
 }
}
```

After it is configured, your AI client can use the Vynix MCP server to read Vynix feedback and work with related issues.

## Documentation

Full guides and the API reference live at [https://vynix.in/docs](https://vynix.in/docs).

## Related Vynix projects

- [Vynix Browser Extension](https://github.com/vynix-in/vynix-browser-extension)
- [Vynix JavaScript SDK](https://github.com/vynix-in/vynix-sdk-js)
- [Vynix PHP SDK](https://github.com/vynix-in/vynix-sdk-php)
- [Vynix Python SDK](https://github.com/vynix-in/vynix-sdk-python)
- [Vynix GitHub Action](https://github.com/vynix-in/vynix-github-action)
- [Vynix VS Code Extension](https://github.com/vynix-in/vynix-vscode-extension)

Browse the full toolkit at the [Vynix GitHub organisation](https://github.com/vynix-in).

## Keywords

vynix, bug-reporting, visual-feedback, website-annotation, ai-diagnosis, developer-tools, feedback-tool, mcp, model-context-protocol, ai-agents, claude, copilot

## About Vynix

Vynix is the feedback layer for teams building with AI coding agents. Point at a bug on any live website, and Vynix captures the context, diagnoses the likely cause, and hands it to your coding agent. Start free at [vynix.in](https://vynix.in).

## License

MIT, see [LICENSE](./LICENSE).