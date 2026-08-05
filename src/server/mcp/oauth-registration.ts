import { z } from "zod";

const PUBLIC_CLIENT_AUTH_METHOD = "none";
const COMPAT_CLIENT_AUTH_METHOD = "client_secret_post";
const MAX_CLIENT_REGISTRATION_BODY_BYTES = 1024 * 1024;

// Loose so every field the provider cares about survives the round trip; these
// shims only read the auth method and secret.
const clientMetadataSchema = z.looseObject({
  token_endpoint_auth_method: z.string().optional(),
});

const clientRegistrationSchema = z.looseObject({
  token_endpoint_auth_method: z.string().optional(),
  client_secret: z.string().optional(),
});

export async function normalizeClientRegistrationRequest(request: Request) {
  if (request.method !== "POST") {
    return request;
  }

  const contentLength = request.headers.get("Content-Length");
  if (
    contentLength &&
    Number.parseInt(contentLength, 10) > MAX_CLIENT_REGISTRATION_BODY_BYTES
  ) {
    // Keep Cloudflare's registration endpoint responsible for its own payload
    // limit errors; this shim only handles small, valid metadata requests.
    return request;
  }

  let rawMetadata: unknown;
  try {
    const text = await request.clone().text();
    if (text.length > MAX_CLIENT_REGISTRATION_BODY_BYTES) {
      // Match the provider's 1 MiB guard before parsing so the compatibility
      // shim cannot consume unusually large DCR payloads first.
      return request;
    }

    rawMetadata = JSON.parse(text);
  } catch {
    return request;
  }

  const parsed = clientMetadataSchema.safeParse(rawMetadata);
  if (!parsed.success || parsed.data.token_endpoint_auth_method !== undefined) {
    return request;
  }

  // The provider defaults an omitted auth method to client_secret_basic,
  // which requires client authentication on every grant — including refresh.
  // MCP clients that discard the secret (Codex did) then lose their session
  // at first token expiry with "invalid_client: missing client_secret".
  // Register them as public clients instead; PKCE plus the provider's
  // grant-to-client binding secure the public-client flow.
  const metadata = {
    ...parsed.data,
    token_endpoint_auth_method: PUBLIC_CLIENT_AUTH_METHOD,
  };

  const headers = new Headers(request.headers);
  headers.set("Content-Type", "application/json");
  headers.delete("Content-Length");

  return new Request(request.url, {
    method: request.method,
    headers,
    body: JSON.stringify(metadata),
  });
}

export async function withCompatibilityClientSecret(response: Response) {
  if (response.status !== 201) {
    return response;
  }

  let rawBody: unknown;
  try {
    rawBody = await response.clone().json();
  } catch {
    return response;
  }

  const parsed = clientRegistrationSchema.safeParse(rawBody);
  if (
    !parsed.success ||
    parsed.data.token_endpoint_auth_method !== PUBLIC_CLIENT_AUTH_METHOD ||
    parsed.data.client_secret !== undefined
  ) {
    return response;
  }

  // Perplexity registers as a public client but rejects DCR responses without
  // a client_secret (its validator accepts client_secret_post but not
  // client_secret_basic). Dress the response as confidential while the stored
  // client stays public: the token endpoint skips secret validation for public
  // clients, so clients that send this placeholder and clients that never
  // store it both keep working — including refresh grants.
  const compatBody = {
    ...parsed.data,
    token_endpoint_auth_method: COMPAT_CLIENT_AUTH_METHOD,
    client_secret: crypto.randomUUID().replaceAll("-", ""),
    client_secret_expires_at: 0,
    client_secret_issued_at: parsed.data.client_id_issued_at,
  };

  const headers = new Headers(response.headers);
  headers.delete("Content-Length");

  return new Response(JSON.stringify(compatBody), {
    status: response.status,
    headers,
  });
}
