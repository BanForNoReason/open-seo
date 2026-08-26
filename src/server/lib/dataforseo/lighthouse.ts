import {
  parseDataforseoLighthousePayload,
  requestCategories,
  type LighthouseStrategy,
} from "@/server/lib/dataforseoLighthousePayload";
import type { StoredLighthousePayload } from "@/server/lib/lighthouseStoredPayload";
import { dataforseoPost } from "@/server/lib/dataforseo/core";
import {
  assertOk,
  buildTaskBilling,
  DataforseoChargedTaskError,
  type DataforseoApiResponse,
} from "@/server/lib/dataforseo/envelope";

export async function fetchLighthouseResult(input: {
  url: string;
  strategy: LighthouseStrategy;
}): Promise<DataforseoApiResponse<StoredLighthousePayload>> {
  const response = await dataforseoPost(
    "/v3/on_page/lighthouse/live/json",
    [
      {
        url: input.url,
        for_mobile: input.strategy === "mobile",
        categories: [...requestCategories],
      },
    ],
    // Billed, non-idempotent POST: a 5xx does not prove the provider skipped
    // the charge, so never replay it.
    { maxServerErrorRetries: 0 },
  );

  // Build the metering envelope before parsing. The provider has already
  // charged a successful task, so a malformed payload must carry its billing
  // metadata out to the metered client instead of looking retryable.
  const task = assertOk(response);
  const billing = buildTaskBilling(task);
  try {
    const data = parseDataforseoLighthousePayload(response, input);
    return { data, billing };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new DataforseoChargedTaskError(message, billing);
  }
}
