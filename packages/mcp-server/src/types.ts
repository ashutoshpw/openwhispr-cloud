import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

/**
 * Function that verifies the caller has admin privileges.
 * Should throw an Error if the caller is not authenticated or not an admin.
 */
export type RequireAdmin = () => Promise<void>;

/**
 * Configuration for registering ChatGPT widget tools.
 */
export interface WidgetConfig {
  baseURL: string;
}

/**
 * Metadata for a ChatGPT Apps SDK content widget.
 */
export type ContentWidget = {
  id: string;
  title: string;
  templateUri: string;
  invoking: string;
  invoked: string;
  html: string;
  description: string;
  widgetDomain: string;
};

export type { McpServer };
