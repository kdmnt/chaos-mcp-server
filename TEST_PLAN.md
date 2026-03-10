# Chaos MCP Server — Test Plan

**Server URL:** `https://chaos-mcp-server.<your-subdomain>.workers.dev/mcp`
**Tools:** 15 edge-case tools designed to stress-test any MCP client implementation

---

## Test 1: Baseline — Happy Path

**Prompt:**
> Use the echo tool to echo back "Hello World!"

**Expected:**
- Returns `Hello World!` exactly
- Tool call is visible in the UI
- If this fails, stop — nothing else will work

**Pass criteria:** Response matches input string exactly

---

## Test 2: Timeout Handling

**Prompt (mild):**
> Use the slow_responder tool with a delay of 30 seconds

**Prompt (aggressive):**
> Use slow_responder with delay_seconds set to 90

**Expected:**
- UI shows a loading/spinner state while waiting
- Response appears after the delay: `Responded after N second(s). Did the client wait patiently?`
- OR: a clear timeout error message if the client has a cutoff

**What to watch for:**
- [ ] Does the UI freeze during the wait?
- [ ] Is there a visible loading indicator?
- [ ] What is the timeout cutoff (if any)?
- [ ] Does a timeout fail silently or with a message?
- [ ] Can the user cancel a long-running tool call?

---

## Test 3: Payload Size Limits

**Prompt (small):**
> Use the huge_response tool with size_kb set to 100

**Prompt (large):**
> Use huge_response with size_kb set to 5000

**Expected:**
- Small: ~100KB of repeated text renders fine
- Large: ~5MB response — may hit limits

**What to watch for:**
- [ ] Does the UI lag or crash with a 5MB response?
- [ ] Is the text truncated? If so, is there an indicator?
- [ ] Does the browser tab become unresponsive?
- [ ] Does the AI's context window overflow?
- [ ] Does the client stream the response or wait for the full payload?

---

## Test 4: Error Flag Handling

**Prompt:**
> Use the always_fails tool

**Prompt (custom message):**
> Use always_fails with error_message "CRITICAL: Database connection lost"

**Expected:**
- Tool returns `isError: true` in the MCP response
- Client should display this as an error state (e.g., red styling, error icon)

**What to watch for:**
- [ ] Is the error visually distinct from a successful response?
- [ ] Does the AI retry automatically? (it should NOT)
- [ ] Does the AI acknowledge the error in its response?
- [ ] Is `isError: true` surfaced to the user or only to the AI?

---

## Test 5: Empty Response

**Prompt:**
> Use the empty_response tool

**Expected:**
- Tool returns an empty content array `[]`

**What to watch for:**
- [ ] Does the UI crash or show an exception?
- [ ] Is there a blank message, "no content" indicator, or nothing at all?
- [ ] Does the AI hallucinate a response that never came?
- [ ] Does the AI handle the empty result gracefully in its response?

---

## Test 6: Unicode & Encoding

**Prompt (all variants):**
> Use the unicode_chaos tool with variant "all"

**Individual variants to isolate bugs:**
> Use unicode_chaos with variant "zero_width"
> Use unicode_chaos with variant "combining_chars"
> Use unicode_chaos with variant "rtl_text"
> Use unicode_chaos with variant "emoji_overload"
> Use unicode_chaos with variant "surrogate_pairs"

**Expected:**
- `all`: Returns emoji, RTL text, zero-width chars, Zalgo text, and math symbols
- Each variant returns its specific unicode content

**What to watch for:**
- [ ] Does RTL Arabic/Hebrew text break the layout direction?
- [ ] Does Zalgo text (combining chars) overflow its container vertically?
- [ ] Are zero-width characters invisible but present? (copy-paste test)
- [ ] Do surrogate pairs (𝕳𝖊𝖑𝖑𝖔) render correctly?
- [ ] Do emoji render or show as boxes?
- [ ] Does the response container resize properly?

---

## Test 7: Complex Schema Parsing

**Prompt:**
> Use the complex_schema tool to search for "lateral movement" with severity "critical", time_range start "2025-01-01T00:00:00Z" and end "2025-12-31T23:59:59Z", source_ips ["10.0.0.1", "192.168.1.100"], limit 10, output_format "json"

**Expected:**
- AI correctly constructs a nested JSON call with `filters.severity`, `filters.time_range.start`, `filters.time_range.end`, `filters.source_ips`
- Server returns a JSON result with the echoed parameters

**What to watch for:**
- [ ] Does the AI correctly nest `severity` and `time_range` inside `filters`?
- [ ] Is the `source_ips` array passed correctly?
- [ ] Is the optional `tags` record omitted cleanly?
- [ ] Does the AI struggle to build the deeply nested arguments?
- [ ] Does the client's schema validation catch malformed calls?

---

## Test 8: Many Parameters

**Prompt:**
> Use the kitchen_sink tool with string_param "test", number_param 42, integer_param 7, boolean_param true, enum_param "option_b", array_param ["a","b","c"], constrained_number 50, email_like "test@example.com", and nullable_param null

**Expected:**
- All 11 parameters passed correctly
- `defaulted_param` should use default value `"hello world"`
- `optional_string` should be omitted

**What to watch for:**
- [ ] Does `nullable_param: null` get sent as null or omitted?
- [ ] Does `defaulted_param` use its default?
- [ ] Is `optional_string` omitted cleanly?
- [ ] Does the AI struggle to construct a call with this many params?
- [ ] Are type constraints respected (integer, min/max, enum)?

---

## Test 9: Multiple Content Blocks

**Prompt:**
> Use the multi_content tool with block_count 20

**Expected:**
- Returns 20 separate text content blocks, each timestamped

**What to watch for:**
- [ ] Are all 20 blocks displayed, or only the first one?
- [ ] Does the AI concatenate them or treat them separately?
- [ ] Does the UI handle rendering many blocks?
- [ ] Is there a content block limit?

---

## Test 10: Unhandled Exceptions (Critical)

**Prompt:**
> Use the throws_exception tool with error_type "TypeError"

**Follow-up (session resilience):**
> Now use the echo tool to verify the connection still works

**Expected:**
- Server throws an unhandled JS exception
- MCP SDK catches it and returns an error to the client

**What to watch for:**
- [ ] Does the client show the error gracefully?
- [ ] Does it expose the stack trace? (potential info leak)
- [ ] Does the MCP connection break/disconnect after the error?
- [ ] **CRITICAL:** Does the `echo` follow-up still work? (session survival)
- [ ] Does the AI attempt to retry the crashed tool?

**Additional variants:**
> Use throws_exception with error_type "RangeError"
> Use throws_exception with error_type "ReferenceError"

---

## Test 11: Markdown Rendering

**Prompt:**
> Use the formatted_response tool

**Expected:**
- Returns rich markdown with: heading, table, ordered list, code block, checkboxes, blockquote, horizontal rule

**What to watch for:**
- [ ] Does the client render the markdown or show raw text?
- [ ] Is the table formatted correctly?
- [ ] Does the Python code block get syntax highlighting?
- [ ] Do checkboxes render as interactive or static?
- [ ] Is the blockquote styled?
- [ ] Does the horizontal rule render?

---

## Test 12: Rapid-Fire / Load Test

**Prompt:**
> Call the instant_response tool 20 times in a row as fast as possible

**Expected:**
- Each call returns "pong" instantly

**What to watch for:**
- [ ] Does the client serialize the calls or run them in parallel?
- [ ] Any rate limiting?
- [ ] Does the UI handle rapid sequential tool calls cleanly?
- [ ] Are all results displayed?

---

## Test 13: Security — Injection Strings (Critical)

**Prompt (XSS):**
> Use the tricky_output tool with variant "html_tags"

**Prompt (SQL injection):**
> Use tricky_output with variant "sql_injection_string"

**Prompt (null bytes):**
> Use tricky_output with variant "null_bytes"

**Prompt (parser confusion):**
> Use tricky_output with variant "json_in_json"

**Prompt (whitespace):**
> Use tricky_output with variant "newlines"

**Expected:**
- `html_tags`: Returns `<script>alert("xss")</script>` and other HTML as plain text
- `sql_injection_string`: Returns `Robert'); DROP TABLE alerts;--` as plain text
- `null_bytes`: Returns text with embedded `\x00` null bytes
- `json_in_json`: Returns nested JSON strings
- `newlines`: Returns text with mixed line endings (`\n`, `\r`, `\r\n`, tabs)

**What to watch for:**
- [ ] **SHOWSTOPPER:** Does the `<script>` tag execute? (XSS vulnerability!)
- [ ] Is HTML escaped/sanitized in the display?
- [ ] Does the `onclick` handler get rendered as active HTML?
- [ ] Does the SQL injection string pass through to any backend queries?
- [ ] Does the response get truncated at null bytes?
- [ ] Does nested JSON confuse the parser?
- [ ] Do mixed line endings render correctly?

---

## Test 14: Long Description Handling

**Prompt:**
> What tools are available from the Chaos MCP server?

**Expected:**
- AI lists all 15 tools with descriptions
- `verbose_tool` has a ~3500 character description

**What to watch for:**
- [ ] Does the tool list load correctly?
- [ ] Is the verbose description truncated in the UI/listing?
- [ ] Does the long description slow down tool discovery?
- [ ] Does the AI summarize or show the full description?

---

## Test 15: Zero-Parameter Tool

**Prompt:**
> Use the no_params tool

**Expected:**
- Returns "Called with no parameters. All good!"

**What to watch for:**
- [ ] Does the AI pass `{}` or omit arguments entirely?
- [ ] Does the call succeed without issues?

---

## Combo Tests

### Session Resilience After Crash
**Prompt:**
> Use throws_exception with "RangeError", then immediately use echo with message "still alive?"

**Expected:** Echo should work after the exception. If the session is broken, this is a critical bug.

### Context Window Stress
**Prompt:**
> Use huge_response with size_kb 2000, then summarize what it returned

**Expected:** Tests if the LLM context can handle a ~2MB tool result without choking.

### Schema Validation — Client vs Server
**Prompt:**
> Use complex_schema with query "test" but don't provide the filters object

**Expected:** Either the client validates client-side and shows a helpful error, or the server rejects it with a schema validation error.

---

## Findings Log

### Finding #1:
- **Severity:**
- **Test:**
- **Description:**

### Finding #2:
- **Severity:**
- **Test:**
- **Description:**

_(Add more findings as you test)_

---

## Priority Order

| Priority | Test | Risk Area |
|----------|------|-----------|
| P0 | Test 13 (html_tags) | **Security** — XSS |
| P0 | Test 10 → echo | **Resilience** — session survival after crash |
| P1 | Test 4 (always_fails) | **UX** — error display |
| P1 | Test 5 (empty_response) | **Resilience** — empty content handling |
| P1 | Test 2 (slow_responder) | **UX** — timeout behavior |
| P2 | Test 3 (huge_response) | **Performance** — payload limits |
| P2 | Test 8 (kitchen_sink) | **Correctness** — parameter passing |
| P2 | Test 7 (complex_schema) | **Correctness** — nested schema |
| P3 | Test 6 (unicode_chaos) | **Rendering** — encoding |
| P3 | Test 11 (formatted_response) | **Rendering** — markdown |
| P3 | Test 9 (multi_content) | **Rendering** — multiple blocks |
| P3 | Test 14 (verbose_tool) | **UX** — long descriptions |
| P4 | Test 12 (instant_response) | **Performance** — rapid calls |
| P4 | Test 15 (no_params) | **Correctness** — zero params |
| P4 | Test 1 (echo) | **Baseline** — sanity check |
