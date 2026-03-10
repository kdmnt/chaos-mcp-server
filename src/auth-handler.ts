import type { OAuthHelpers } from "@cloudflare/workers-oauth-provider";
import { Hono } from "hono";

type Bindings = Env & { OAUTH_PROVIDER: OAuthHelpers };

const app = new Hono<{ Bindings: Bindings }>();

// Auto-approve authorization — no login form, just approve immediately.
// This is a test/chaos server, so we skip real authentication.
app.get("/authorize", async (c) => {
  const oauthReqInfo = await c.env.OAUTH_PROVIDER.parseAuthRequest(c.req.raw);

  const { redirectTo } = await c.env.OAUTH_PROVIDER.completeAuthorization({
    request: oauthReqInfo,
    userId: "chaos-user",
    metadata: { label: "Chaos Test User" },
    scope: oauthReqInfo.scope,
    props: {
      userId: "chaos-user",
      email: "chaos@test.dev",
    },
  });

  return Response.redirect(redirectTo, 302);
});

// Landing page
app.get("/", (c) =>
  c.json({
    name: "Chaos MCP Server",
    version: "1.0.0",
    description:
      "A stress-test MCP server for roasting MCP client implementations",
    mcp_endpoint: "/mcp",
    auth: "OAuth 2.0 (auto-approve)",
  })
);

export default app;
