# Chaos MCP Server

A stress-test [Model Context Protocol (MCP)](https://modelcontextprotocol.io/) server designed to probe and "roast" MCP client implementations. Built on [Cloudflare Workers](https://developers.cloudflare.com/workers/) with OAuth 2.0 support.

## Purpose

MCP clients should gracefully handle slow responses, large payloads, malformed data, unusual schemas, and security-sensitive content. This server exposes 15 purpose-built tools that exercise these edge cases, making it easy to evaluate any MCP client's robustness.

## Tools

| # | Tool | What It Tests |
|---|------|---------------|
| 1 | `echo` | Baseline happy path — returns exactly what you send |
| 2 | `slow_responder` | Timeout handling — configurable delay (1–120s) |
| 3 | `huge_response` | Payload size limits — configurable response size (1KB–10MB) |
| 4 | `always_fails` | Error flag handling — returns `isError: true` |
| 5 | `empty_response` | Empty content array — edge case for no data |
| 6 | `unicode_chaos` | Encoding — emoji, RTL text, zero-width chars, Zalgo, surrogate pairs |
| 7 | `complex_schema` | Schema parsing — deeply nested objects, arrays, records |
| 8 | `kitchen_sink` | Parameter variety — 11 params of different types (string, number, bool, enum, array, nullable) |
| 9 | `multi_content` | Multi-block rendering — up to 50 content blocks per response |
| 10 | `throws_exception` | Crash recovery — unhandled TypeError, RangeError, ReferenceError |
| 11 | `formatted_response` | Markdown rendering — tables, code blocks, checklists, blockquotes |
| 12 | `instant_response` | Load testing — near-zero latency, for rapid-fire calls |
| 13 | `tricky_output` | Security — HTML/script injection, JSON-in-JSON, null bytes, SQL injection strings |
| 14 | `verbose_tool` | Long descriptions — ~3500 character tool description |
| 15 | `no_params` | Zero parameters — simplest possible tool call |

## Architecture

- **Runtime:** Cloudflare Workers (Durable Objects)
- **MCP Transport:** Streamable HTTP (SSE)
- **Auth:** OAuth 2.0 via [`@cloudflare/workers-oauth-provider`](https://github.com/cloudflare/workers-oauth-provider) with auto-approve (no real login required)
- **State:** Per-session via `McpAgent` (Durable Object-backed)
- **Storage:** Cloudflare KV for OAuth tokens and client registrations

## Quick Start

### Prerequisites

- [Node.js](https://nodejs.org/) >= 18
- A [Cloudflare account](https://dash.cloudflare.com/sign-up) (free tier works)
- [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/) (included as a dev dependency)

### Setup

```bash
# Clone and install
git clone <repo-url>
cd chaos-mcp-server
npm install

# Create a KV namespace for OAuth storage
npx wrangler kv namespace create OAUTH_KV

# Update wrangler.jsonc with your KV namespace ID from the output above
```

### Local Development

```bash
npm run dev
# Server runs at http://localhost:8787/mcp
```

### Deploy

```bash
npx wrangler login
npx wrangler deploy
```

> **Note:** If this is your first Cloudflare Workers deployment, you may need to enable your `workers.dev` subdomain.
> Go to **Cloudflare Dashboard → Workers & Pages → your worker → Settings → Domains & Routes** and activate the `workers.dev` route. SSL may take 2–5 minutes to propagate after activation.

Once deployed, your server will be available at:
```
https://chaos-mcp-server.<your-subdomain>.workers.dev/mcp
```

### Test with MCP Inspector

```bash
npx @modelcontextprotocol/inspector@latest
# Connect to your deployed URL or http://localhost:8787/mcp
```

## Connecting to an MCP Client

Use the `/mcp` endpoint as your Remote MCP Server URL:

```
https://chaos-mcp-server.<your-subdomain>.workers.dev/mcp
```

The server uses OAuth 2.0 with auto-approve — the OAuth flow will complete automatically without requiring credentials.

## Test Plan

See **[TEST_PLAN.md](./TEST_PLAN.md)** for detailed test prompts, expected behavior, and checklists for each of the 15 tools.

## License

MIT
