import type {
  McpServer,
  ToolCallback,
} from "@modelcontextprotocol/sdk/server/mcp.js";
import type {
  AnySchema,
  ZodRawShapeCompat,
} from "@modelcontextprotocol/sdk/server/zod-compat.js";
import type { ToolAnnotations } from "@modelcontextprotocol/sdk/types.js";
import { instrumentMcpToolHandler } from "@/server/mcp/instrumentation";
import { getBacklinksOverviewTool } from "@/server/mcp/tools/get-backlinks-overview";
import { getBacklinksProfileTool } from "@/server/mcp/tools/get-backlinks-profile";
import { getDomainKeywordSuggestionsTool } from "@/server/mcp/tools/get-domain-keyword-suggestions";
import { getDomainOverviewTool } from "@/server/mcp/tools/get-domain-overview";
import { addRankTrackingKeywordsTool } from "@/server/mcp/tools/add-rank-tracking-keywords";
import { createRankTrackerTool } from "@/server/mcp/tools/create-rank-tracker";
import { estimateRankTrackerCostTool } from "@/server/mcp/tools/estimate-rank-tracker-cost";
import { getRankTrackerTool } from "@/server/mcp/tools/get-rank-tracker";
import { removeRankTrackingKeywordsTool } from "@/server/mcp/tools/remove-rank-tracking-keywords";
import { runRankTrackerTool } from "@/server/mcp/tools/run-rank-tracker";
import { getSerpResultsTool } from "@/server/mcp/tools/get-serp-results";
import { createProjectTool } from "@/server/mcp/tools/create-project";
import { listProjectsTool } from "@/server/mcp/tools/list-projects";
import { listSavedKeywordsTool } from "@/server/mcp/tools/list-saved-keywords";
import {
  getGoogleAnalyticsAudienceBreakdownTool,
  getGoogleAnalyticsEcommercePerformanceTool,
  getGoogleAnalyticsKeyEventsTool,
  getGoogleAnalyticsMeasurementHealthTool,
  getGoogleAnalyticsOrganicLandingPagesTool,
  getGoogleAnalyticsOrganicOverviewTool,
  getGoogleAnalyticsPagePerformanceTool,
  getGoogleAnalyticsSiteSearchTool,
  getGoogleAnalyticsTrafficAcquisitionTool,
  getSearchOpportunitiesTool,
} from "@/server/mcp/tools/google-analytics-tools";
import {
  findSerpCompetitorsTool,
  getGoogleBusinessQuestionsTool,
  getKeywordMetricsTool,
  getLocalSerpResultsTool,
  getRankedKeywordsTool,
  searchLocalBusinessesTool,
} from "@/server/mcp/tools/dataforseo-research-tools";
import { researchKeywordsTool } from "@/server/mcp/tools/research-keywords";
import { saveKeywordsTool } from "@/server/mcp/tools/save-keywords";
import {
  getSearchConsolePerformanceTool,
  inspectUrlsTool,
} from "@/server/mcp/tools/search-console-tools";
import {
  getAuditIssuesTool,
  getAuditPagesTool,
  getAuditStatusTool,
  runSiteAuditTool,
} from "@/server/mcp/tools/site-audit-tools";
import { whoamiTool } from "@/server/mcp/tools/whoami";

// Each handler is wrapped so failures reach PostHog because the MCP route has
// no error middleware of its own.
function registerInstrumentedTool<
  In extends ZodRawShapeCompat | AnySchema,
  Out extends ZodRawShapeCompat | AnySchema,
>(
  server: McpServer,
  tool: {
    name: string;
    config: {
      inputSchema?: In;
      outputSchema?: Out;
      title?: string;
      description?: string;
      annotations?: ToolAnnotations;
    };
    handler: ToolCallback<In>;
  },
) {
  server.registerTool(
    tool.name,
    tool.config,
    // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- instrumentation preserves the callback arguments validated by ToolCallback<In>
    instrumentMcpToolHandler(
      tool.name,
      tool.config.outputSchema,
      tool.handler,
    ) as ToolCallback<In>,
  );
}

export function registerOpenSeoMcpTools(server: McpServer) {
  registerInstrumentedTool(server, whoamiTool);
  registerInstrumentedTool(server, listProjectsTool);
  registerInstrumentedTool(server, createProjectTool);
  registerInstrumentedTool(server, listSavedKeywordsTool);
  registerInstrumentedTool(server, researchKeywordsTool);
  registerInstrumentedTool(server, saveKeywordsTool);
  registerInstrumentedTool(server, getDomainOverviewTool);
  registerInstrumentedTool(server, getDomainKeywordSuggestionsTool);
  registerInstrumentedTool(server, getBacklinksOverviewTool);
  registerInstrumentedTool(server, getBacklinksProfileTool);
  registerInstrumentedTool(server, getSerpResultsTool);
  registerInstrumentedTool(server, createRankTrackerTool);
  registerInstrumentedTool(server, getRankTrackerTool);
  registerInstrumentedTool(server, addRankTrackingKeywordsTool);
  registerInstrumentedTool(server, removeRankTrackingKeywordsTool);
  registerInstrumentedTool(server, estimateRankTrackerCostTool);
  registerInstrumentedTool(server, runRankTrackerTool);
  registerInstrumentedTool(server, getRankedKeywordsTool);
  registerInstrumentedTool(server, findSerpCompetitorsTool);
  registerInstrumentedTool(server, searchLocalBusinessesTool);
  registerInstrumentedTool(server, getLocalSerpResultsTool);
  registerInstrumentedTool(server, getGoogleBusinessQuestionsTool);
  registerInstrumentedTool(server, getKeywordMetricsTool);
  registerInstrumentedTool(server, getSearchConsolePerformanceTool);
  registerInstrumentedTool(server, inspectUrlsTool);
  registerInstrumentedTool(server, getGoogleAnalyticsOrganicLandingPagesTool);
  registerInstrumentedTool(server, getGoogleAnalyticsPagePerformanceTool);
  registerInstrumentedTool(server, getGoogleAnalyticsKeyEventsTool);
  registerInstrumentedTool(server, getSearchOpportunitiesTool);
  registerInstrumentedTool(server, getGoogleAnalyticsOrganicOverviewTool);
  registerInstrumentedTool(server, getGoogleAnalyticsTrafficAcquisitionTool);
  registerInstrumentedTool(server, getGoogleAnalyticsMeasurementHealthTool);
  registerInstrumentedTool(server, getGoogleAnalyticsEcommercePerformanceTool);
  registerInstrumentedTool(server, getGoogleAnalyticsSiteSearchTool);
  registerInstrumentedTool(server, getGoogleAnalyticsAudienceBreakdownTool);
  registerInstrumentedTool(server, runSiteAuditTool);
  registerInstrumentedTool(server, getAuditStatusTool);
  registerInstrumentedTool(server, getAuditIssuesTool);
  registerInstrumentedTool(server, getAuditPagesTool);
}
