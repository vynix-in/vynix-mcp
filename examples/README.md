# Example

A minimal example for Vynix MCP Server.

Get your project key from [https://vynix.in](https://vynix.in), then:

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

See the [README](../README.md) for full setup, and the [Vynix docs](https://vynix.in/docs) for the API reference.
