import { describe, expect, it } from "vitest";
import { z } from "zod";
import {
  normalizeClientRegistrationRequest,
  withCompatibilityClientSecret,
} from "@/server/mcp/oauth-registration";

const registrationBodySchema = z.looseObject({ client_secret: z.string() });

describe("normalizeClientRegistrationRequest", () => {
  it("keeps explicit public registrations public", async () => {
    const request = new Request(
      "https://app.openseo.so/api/auth/oauth2/register",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          redirect_uris: ["http://localhost:1455/auth/callback"],
          client_name: "Codex",
          token_endpoint_auth_method: "none",
        }),
      },
    );

    const normalized = await normalizeClientRegistrationRequest(request);

    await expect(normalized.json()).resolves.toMatchObject({
      token_endpoint_auth_method: "none",
    });
  });

  it("defaults omitted token auth methods to public clients", async () => {
    const request = new Request(
      "https://app.openseo.so/api/auth/oauth2/register",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          redirect_uris: ["https://www.perplexity.ai/api/mcp/oauth/callback"],
          client_name: "Perplexity",
        }),
      },
    );

    const normalized = await normalizeClientRegistrationRequest(request);

    await expect(normalized.json()).resolves.toMatchObject({
      token_endpoint_auth_method: "none",
    });
  });

  it("keeps explicit confidential registration methods", async () => {
    const request = new Request(
      "https://app.openseo.so/api/auth/oauth2/register",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          redirect_uris: ["https://www.perplexity.ai/api/mcp/oauth/callback"],
          token_endpoint_auth_method: "client_secret_post",
        }),
      },
    );

    const normalized = await normalizeClientRegistrationRequest(request);

    await expect(normalized.json()).resolves.toMatchObject({
      token_endpoint_auth_method: "client_secret_post",
    });
  });

  it("leaves oversized registration payloads for the provider to reject", async () => {
    const body = JSON.stringify({
      redirect_uris: ["https://www.perplexity.ai/api/mcp/oauth/callback"],
      client_name: "a".repeat(1024 * 1024),
      token_endpoint_auth_method: "none",
    });
    const request = new Request(
      "https://app.openseo.so/api/auth/oauth2/register",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Content-Length": String(body.length),
        },
        body,
      },
    );

    await expect(normalizeClientRegistrationRequest(request)).resolves.toBe(
      request,
    );
  });
});

function registrationResponse(body: Record<string, unknown>, status = 201) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("withCompatibilityClientSecret", () => {
  it("adds a placeholder secret to public client registrations", async () => {
    const response = await withCompatibilityClientSecret(
      registrationResponse({
        client_id: "abc123",
        token_endpoint_auth_method: "none",
        client_id_issued_at: 1753228800,
      }),
    );

    const body = registrationBodySchema.parse(await response.json());

    expect(body).toMatchObject({
      client_id: "abc123",
      token_endpoint_auth_method: "client_secret_post",
      client_secret_expires_at: 0,
      client_secret_issued_at: 1753228800,
    });
    expect(body.client_secret).toMatch(/^[0-9a-f]{32}$/);
  });

  it("leaves confidential registrations untouched", async () => {
    const original = registrationResponse({
      client_id: "abc123",
      token_endpoint_auth_method: "client_secret_post",
      client_secret: "real-secret",
    });

    const response = await withCompatibilityClientSecret(original);

    expect(response).toBe(original);
  });

  it("leaves registration errors untouched", async () => {
    const original = registrationResponse(
      { error: "invalid_client_metadata" },
      400,
    );

    const response = await withCompatibilityClientSecret(original);

    expect(response).toBe(original);
  });
});
