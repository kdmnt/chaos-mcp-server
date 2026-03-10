import OAuthProvider from "@cloudflare/workers-oauth-provider";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { McpAgent } from "agents/mcp";
import { z } from "zod";
import authHandler from "./auth-handler";

type Props = {
  userId: string;
  email: string;
};

export class ChaosMCP extends McpAgent<Env, Record<string, never>, Props> {
  server = new McpServer({
    name: "Chaos MCP Server",
    version: "1.0.0",
  });

  async init() {
    // ───────────────────────────────────────────────
    // 1. HAPPY PATH — a normal tool that works correctly
    // ───────────────────────────────────────────────
    this.server.tool(
      "echo",
      "A simple echo tool that returns exactly what you send. Use this as a baseline sanity check.",
      { message: z.string().describe("The message to echo back") },
      async ({ message }) => ({
        content: [{ type: "text", text: message }],
      })
    );

    // ───────────────────────────────────────────────
    // 2. SLOW RESPONSE — tests timeout handling
    // ───────────────────────────────────────────────
    this.server.tool(
      "slow_responder",
      "Responds after a configurable delay. Use to test timeout and loading behavior.",
      {
        delay_seconds: z
          .number()
          .min(1)
          .max(120)
          .describe("Number of seconds to wait before responding (1-120)"),
      },
      async ({ delay_seconds }) => {
        await new Promise((resolve) =>
          setTimeout(resolve, delay_seconds * 1000)
        );
        return {
          content: [
            {
              type: "text",
              text: `Responded after ${delay_seconds} second(s). Did the client wait patiently?`,
            },
          ],
        };
      }
    );

    // ───────────────────────────────────────────────
    // 3. HUGE RESPONSE — tests payload size limits
    // ───────────────────────────────────────────────
    this.server.tool(
      "huge_response",
      "Returns a very large text payload. Use to test how the client handles large responses.",
      {
        size_kb: z
          .number()
          .min(1)
          .max(10000)
          .describe("Approximate response size in kilobytes (1-10000)"),
      },
      async ({ size_kb }) => {
        const chunk = "All work and no play makes Jack a dull boy. ";
        const targetBytes = size_kb * 1024;
        const repetitions = Math.ceil(targetBytes / chunk.length);
        const payload = chunk.repeat(repetitions).slice(0, targetBytes);
        return {
          content: [{ type: "text", text: payload }],
        };
      }
    );

    // ───────────────────────────────────────────────
    // 4. ERROR RESPONSE — tests isError flag handling
    // ───────────────────────────────────────────────
    this.server.tool(
      "always_fails",
      "Always returns an error response with isError=true. Tests error display in the UI.",
      {
        error_message: z
          .string()
          .optional()
          .describe("Custom error message to return"),
      },
      async ({ error_message }) => ({
        content: [
          {
            type: "text",
            text: error_message ?? "Something went terribly wrong! 💥",
          },
        ],
        isError: true,
      })
    );

    // ───────────────────────────────────────────────
    // 5. EMPTY RESPONSE — tests empty content handling
    // ───────────────────────────────────────────────
    this.server.tool(
      "empty_response",
      "Returns an empty content array. Tests how the client handles no content.",
      {},
      async () => ({
        content: [],
      })
    );

    // ───────────────────────────────────────────────
    // 6. UNICODE & SPECIAL CHARS — tests encoding
    // ───────────────────────────────────────────────
    this.server.tool(
      "unicode_chaos",
      "Returns text with special unicode characters, emoji, RTL text, zero-width chars, and more.",
      {
        variant: z
          .enum([
            "emoji_overload",
            "rtl_text",
            "zero_width",
            "combining_chars",
            "surrogate_pairs",
            "all",
          ])
          .describe("Which unicode chaos variant to return"),
      },
      async ({ variant }) => {
        const variants: Record<string, string> = {
          emoji_overload:
            "🔥💀👻🎃🦄🌈✨🎯🚀💣🧨⚡️🌪️🦠🧬🔬🔭🛸👾🤖🎭🃏🀄️🎴🔮🧿🪬🫧🌊🏔️",
          rtl_text:
            "English مرحبا中文 עברית English again العربية back to LTR",
          zero_width:
            "This\u200Btext\u200Bhas\u200Bzero\u200Bwidth\u200Bspaces\u200Band\u200Byou\u200Bcannot\u200Bsee\u200Bthem \u200D\u200C\uFEFF",
          combining_chars:
            "Z̴̧̨̛̥̲͇̻̮̤̜̲̜̈́̅̎̒̃̾̌̚ä̵̧̡̛̲̣̭̯̯̗̟́̊̈̃̑̈́̕l̶̡̨̧̛̞̼̰̤͈̣̆̾̊̃̈́̈́̕ğ̵̢̨̛̹̺͎̲̥̤̊̈́̈́̃̒̌̕ơ̵̧̡̲̣̭̯̯̗̟̈́̊̈̃̑̈́̕ is here",
          surrogate_pairs:
            "𝕳𝖊𝖑𝖑𝖔 𝕿𝖍𝖎𝖘 𝖎𝖘 𝕱𝖗𝖆𝖐𝖙𝖚𝖗 — 𝟘𝟙𝟚𝟛 — 🏳️‍🌈🏴‍☠️👨‍👩‍👧‍👦",
        };

        if (variant === "all") {
          return {
            content: [
              {
                type: "text",
                text: Object.values(variants).join("\n\n---\n\n"),
              },
            ],
          };
        }

        return {
          content: [
            { type: "text", text: variants[variant] ?? "Unknown variant" },
          ],
        };
      }
    );

    // ───────────────────────────────────────────────
    // 7. COMPLEX SCHEMA — tests schema rendering/parsing
    // ───────────────────────────────────────────────
    this.server.tool(
      "complex_schema",
      "A tool with a deeply nested, complex input schema. Tests schema parsing and form generation.",
      {
        query: z.string().describe("Search query string"),
        filters: z
          .object({
            severity: z
              .enum(["critical", "high", "medium", "low", "info"])
              .describe("Minimum severity level"),
            time_range: z
              .object({
                start: z.string().describe("ISO 8601 start timestamp"),
                end: z.string().describe("ISO 8601 end timestamp"),
              })
              .describe("Time window for the search"),
            source_ips: z
              .array(z.string())
              .optional()
              .describe("Filter by source IP addresses"),
            tags: z
              .record(z.string(), z.string())
              .optional()
              .describe("Key-value tag filters"),
            exclude_resolved: z
              .boolean()
              .default(false)
              .describe("Whether to exclude resolved alerts"),
          })
          .describe("Structured filter object"),
        limit: z
          .number()
          .int()
          .min(1)
          .max(1000)
          .default(50)
          .describe("Max results"),
        output_format: z
          .enum(["json", "csv", "table", "markdown"])
          .default("json")
          .describe("Response format"),
      },
      async ({ query, filters, limit, output_format }) => ({
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                status: "ok",
                query,
                filters,
                limit,
                output_format,
                results: [
                  {
                    id: "alert-001",
                    title: "Suspicious login from unusual location",
                    severity: filters.severity,
                    timestamp: new Date().toISOString(),
                  },
                ],
                total: 1,
              },
              null,
              2
            ),
          },
        ],
      })
    );

    // ───────────────────────────────────────────────
    // 8. MANY PARAMETERS — tests tools with lots of params
    // ───────────────────────────────────────────────
    this.server.tool(
      "kitchen_sink",
      "A tool with many parameters of different types. Tests parameter form generation and validation.",
      {
        string_param: z.string().describe("A required string"),
        optional_string: z.string().optional().describe("An optional string"),
        number_param: z.number().describe("A required number"),
        integer_param: z.number().int().describe("Must be an integer"),
        boolean_param: z.boolean().describe("A boolean toggle"),
        enum_param: z
          .enum(["option_a", "option_b", "option_c", "option_d"])
          .describe("Pick one option"),
        array_param: z.array(z.string()).describe("An array of strings"),
        defaulted_param: z
          .string()
          .default("hello world")
          .describe("Has a default value"),
        constrained_number: z
          .number()
          .min(0)
          .max(100)
          .describe("Number between 0 and 100"),
        email_like: z.string().describe("Should look like an email"),
        nullable_param: z
          .string()
          .nullable()
          .describe("Can be null or a string"),
      },
      async (params) => ({
        content: [
          {
            type: "text",
            text: `Received ${Object.keys(params).length} parameters:\n${JSON.stringify(params, null, 2)}`,
          },
        ],
      })
    );

    // ───────────────────────────────────────────────
    // 9. MULTIPLE CONTENT BLOCKS — tests multi-block rendering
    // ───────────────────────────────────────────────
    this.server.tool(
      "multi_content",
      "Returns multiple content blocks in a single response. Tests multi-block rendering.",
      {
        block_count: z
          .number()
          .int()
          .min(1)
          .max(50)
          .describe("Number of content blocks to return"),
      },
      async ({ block_count }) => ({
        content: Array.from({ length: block_count }, (_, i) => ({
          type: "text" as const,
          text: `Block ${i + 1}/${block_count}: ${"=".repeat(40)}\nThis is content block number ${i + 1}. Each block is a separate text content item in the MCP response.\nTimestamp: ${new Date().toISOString()}`,
        })),
      })
    );

    // ───────────────────────────────────────────────
    // 10. THROW EXCEPTION — tests unhandled error handling
    // ───────────────────────────────────────────────
    this.server.tool(
      "throws_exception",
      "Throws an unhandled JavaScript exception instead of returning properly. Tests crash recovery.",
      {
        error_type: z
          .enum(["TypeError", "RangeError", "ReferenceError", "generic"])
          .describe("Type of error to throw"),
      },
      async ({ error_type }) => {
        switch (error_type) {
          case "TypeError":
            throw new TypeError(
              "Cannot read properties of undefined (reading 'foo')"
            );
          case "RangeError":
            throw new RangeError("Maximum call stack size exceeded");
          case "ReferenceError":
            throw new ReferenceError("secretVar is not defined");
          case "generic":
          default:
            throw new Error(
              "Unhandled chaos exception! The server didn't catch this."
            );
        }
      }
    );

    // ───────────────────────────────────────────────
    // 11. MARKDOWN / FORMATTED OUTPUT — tests rendering
    // ───────────────────────────────────────────────
    this.server.tool(
      "formatted_response",
      "Returns richly formatted markdown content. Tests how the client renders markdown from tool results.",
      {},
      async () => ({
        content: [
          {
            type: "text",
            text: [
              "# Alert Investigation Report",
              "",
              "## Summary",
              "| Field | Value |",
              "|-------|-------|",
              "| Alert ID | `ALT-2025-0042` |",
              "| Severity | **CRITICAL** |",
              "| Source IP | `192.168.1.42` |",
              "| Destination | `10.0.0.1:443` |",
              "",
              "## Timeline",
              "1. **14:32:01** — Initial connection detected",
              "2. **14:32:05** — Anomalous payload identified",
              "3. **14:32:12** — Lateral movement attempt blocked",
              "",
              "## Code Sample",
              "```python",
              "import example_sdk",
              "",
              "def rule(event: dict) -> bool:",
              '    return event.get("severity") == "CRITICAL"',
              "```",
              "",
              "## Recommendations",
              "- [ ] Isolate affected host",
              "- [ ] Rotate credentials for `admin@corp.example`",
              "- [x] Alert already escalated to SOC",
              "",
              "> **Note:** This is a test response from the Chaos MCP Server.",
              "",
              "---",
              "*Generated at " + new Date().toISOString() + "*",
            ].join("\n"),
          },
        ],
      })
    );

    // ───────────────────────────────────────────────
    // 12. RAPID SUCCESSION — returns instantly, for load testing
    // ───────────────────────────────────────────────
    this.server.tool(
      "instant_response",
      "Returns immediately with minimal content. Use in rapid succession to load-test the MCP client.",
      {},
      async () => ({
        content: [{ type: "text", text: "pong" }],
      })
    );

    // ───────────────────────────────────────────────
    // 13. JSON INJECTION — tests if client safely handles output
    // ───────────────────────────────────────────────
    this.server.tool(
      "tricky_output",
      "Returns content that could trip up naive parsers — embedded JSON, HTML tags, script tags, etc.",
      {
        variant: z
          .enum([
            "html_tags",
            "json_in_json",
            "newlines",
            "null_bytes",
            "sql_injection_string",
          ])
          .describe("Which tricky output to return"),
      },
      async ({ variant }) => {
        const variants: Record<string, string> = {
          html_tags:
            '<div onclick="alert(1)"><script>alert("xss")</script><img src=x onerror=alert(1)><b>bold</b><a href="javascript:void(0)">click me</a></div>',
          json_in_json: JSON.stringify({
            content: [
              {
                type: "text",
                text: '{"nested": true, "injection": "test"}',
              },
            ],
            isError: false,
          }),
          newlines:
            "line1\nline2\rline3\r\nline4\n\n\n\nmany blank lines\ttabs\there",
          null_bytes: "before\x00null\x00bytes\x00after",
          sql_injection_string:
            "Robert'); DROP TABLE alerts;-- OR 1=1 UNION SELECT * FROM credentials",
        };

        return {
          content: [
            { type: "text", text: variants[variant] ?? "Unknown variant" },
          ],
        };
      }
    );

    // ───────────────────────────────────────────────
    // 14. DESCRIPTION CHAOS — tool with extremely long description
    // ───────────────────────────────────────────────
    this.server.tool(
      "verbose_tool",
      "This tool has an extremely long description that goes on and on and on. ".repeat(
        50
      ) +
        "It tests whether the MCP client properly handles or truncates very long tool descriptions. " +
        "Some clients may have UI issues with descriptions this long. Does your client handle it gracefully?",
      {},
      async () => ({
        content: [
          {
            type: "text",
            text: "The tool with the very long description worked!",
          },
        ],
      })
    );

    // ───────────────────────────────────────────────
    // 15. NO PARAMETERS — simplest possible tool
    // ───────────────────────────────────────────────
    this.server.tool(
      "no_params",
      "A tool with zero parameters. Just call it.",
      {},
      async () => ({
        content: [
          { type: "text", text: "Called with no parameters. All good!" },
        ],
      })
    );
  }
}

// ─── OAuth-wrapped Worker entry point ───────────

export default new OAuthProvider({
  apiRoute: "/mcp",
  apiHandler: ChaosMCP.serve("/mcp"),
  defaultHandler: authHandler,
  authorizeEndpoint: "/authorize",
  tokenEndpoint: "/token",
  clientRegistrationEndpoint: "/register",
});
