import type { AuthInfo } from "@modelcontextprotocol/sdk/server/auth/types.js";
import { vi } from "vitest";
import {
  MCP_AUTH_CONTEXT_PROP,
  type McpToolAuthContext,
  type ToolExtra,
} from "@/server/mcp/context";

export function makeMcpAuthContext(
  overrides: Partial<McpToolAuthContext> = {},
): McpToolAuthContext {
  const baseUrl = overrides.baseUrl ?? "https://open-seo.test";
  return {
    userId: "user_123",
    userEmail: "alice@example.com",
    organizationId: "org_123",
    clientId: "client_123",
    scopes: ["mcp"],
    audience: `${baseUrl}/mcp`,
    subject: "user_123",
    baseUrl,
    ...overrides,
  };
}

export function makeToolExtra(
  authContext: McpToolAuthContext = makeMcpAuthContext(),
  requestId: ToolExtra["requestId"] = 1,
): ToolExtra {
  return {
    signal: new AbortController().signal,
    requestId,
    sendNotification: vi.fn(),
    sendRequest: vi.fn(),
    authInfo: {
      token: "token",
      clientId: authContext.clientId ?? "client_123",
      scopes: authContext.scopes,
      resource: new URL(`${authContext.baseUrl}/mcp`),
      extra: { [MCP_AUTH_CONTEXT_PROP]: authContext },
    } satisfies AuthInfo,
  };
}

export function textContent(result: {
  content?: Array<{ type: string; text?: string }>;
}) {
  const first = result.content?.[0];
  return first?.type === "text" ? (first.text ?? "") : "";
}
