---
title: ChatGPT Apps SDK integration
description: How the Next.js application integrates with the ChatGPT Apps SDK and MCP.
---

# ChatGPT Apps SDK Integration Guide

This Next.js application now supports the ChatGPT Apps SDK, allowing it to be embedded and run as a widget inside ChatGPT's native interface using the Model Context Protocol (MCP).

## Overview

The integration enables your Next.js app to:
- ✅ Run as an embedded widget inside ChatGPT
- ✅ Register tools discoverable by ChatGPT via MCP
- ✅ Render dynamic HTML content in ChatGPT's interface
- ✅ Maintain full Next.js functionality (SSR, client-side navigation, etc.)
- ✅ Communicate bidirectionally with ChatGPT via hooks

## Architecture

### Key Components

1. **MCP Server** (`src/app/mcp/route.ts`)
   - Exposes tools and resources to ChatGPT via Model Context Protocol
   - Handles tool invocations and returns widget HTML
   - Accessible at `/mcp` endpoint

2. **Hooks System** (`src/app/hooks/`)
   - React hooks for integrating with ChatGPT's `window.openai` API
   - State access: `useDisplayMode`, `useMaxHeight`, `useWidgetProps`
   - Actions: `useCallTool`, `useSendMessage`, `useOpenExternal`, `useRequestDisplayMode`

3. **NextChatSDKBootstrap** (`src/components/NextChatSDKBootstrap.tsx`)
   - Patches browser APIs (fetch, history) for iframe compatibility
   - Handles cross-origin asset loading
   - Manages external link clicks

4. **Base URL Configuration** (`baseUrl.js`)
   - Automatically detects environment (development/production/preview)
   - Provides correct URLs for asset prefixing

5. **CORS Middleware** (`src/middleware.ts`)
   - Handles OPTIONS preflight requests
   - Adds necessary CORS headers for cross-origin embedding

## Setup and Deployment

### 1. Local Development

The integration works automatically in development:

```bash
npm run dev
```

Your MCP endpoint will be available at: `http://localhost:3000/mcp`

### 2. Deploy to Vercel

The easiest way to use ChatGPT Apps SDK is via Vercel:

```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
vercel

# Or deploy to production
vercel --prod
```

Environment variables are automatically configured by Vercel:
- `VERCEL_ENV` - deployment environment
- `VERCEL_PROJECT_PRODUCTION_URL` - production domain
- `VERCEL_BRANCH_URL` - preview deployment URL

### 3. Connect to ChatGPT

1. **Enable Developer Mode** in ChatGPT settings
2. **Add MCP Connector**:
   - Go to ChatGPT Settings → Connectors
   - Click "Create New Connector"
   - Enter your MCP URL: `https://your-app.vercel.app/mcp`
   - Save the connector

3. **Test the Integration**:
   - In ChatGPT, try: "Show me the content"
   - ChatGPT will discover the `show_content` tool
   - Your app will render as a widget in the chat

## Using the Hooks System

### Example: Creating a Widget Component

```tsx
"use client";

import {
  useWidgetProps,
  useDisplayMode,
  useMaxHeight,
  useRequestDisplayMode
} from "@/app/hooks";

export default function MyWidget() {
  // Access tool output data
  const toolOutput = useWidgetProps<{ name?: string }>();
  
  // Get display constraints
  const displayMode = useDisplayMode();
  const maxHeight = useMaxHeight();
  
  // Action to request fullscreen
  const requestDisplayMode = useRequestDisplayMode();

  const goFullscreen = () => {
    requestDisplayMode("fullscreen");
  };

  return (
    <div style={{ maxHeight: maxHeight ? `${maxHeight}px` : undefined }}>
      <h1>Hello, {toolOutput?.name || "User"}!</h1>
      
      {displayMode !== "fullscreen" && (
        <button onClick={goFullscreen}>
          Go Fullscreen
        </button>
      )}
      
      <p>Current mode: {displayMode}</p>
    </div>
  );
}
```

### Available Hooks

#### State Access Hooks

- **`useWidgetProps<T>()`** - Get tool invocation output data
- **`useDisplayMode()`** - Get current display mode (`"pip"` | `"inline"` | `"fullscreen"`)
- **`useMaxHeight()`** - Get maximum height constraint in pixels

#### Action Hooks

- **`useCallTool()`** - Invoke other MCP tools
- **`useSendMessage()`** - Send messages to ChatGPT conversation
- **`useOpenExternal()`** - Open external URLs safely
- **`useRequestDisplayMode()`** - Request display mode changes

## Adding Custom Tools

To add new tools to your MCP server, edit `src/app/mcp/route.ts`:

```typescript
// Register a new tool
server.registerTool(
  "my_custom_tool",
  {
    title: "My Custom Tool",
    description: "Description of what this tool does",
    inputSchema: {
      name: z.string().describe("User's name"),
      age: z.number().optional().describe("User's age"),
    },
    _meta: widgetMeta(contentWidget),
  },
  async ({ name, age }) => {
    // Tool handler logic
    return {
      content: [
        {
          type: "text",
          text: `Processing for ${name}${age ? `, age ${age}` : ""}`,
        },
      ],
      structuredContent: {
        name,
        age,
        timestamp: new Date().toISOString(),
      },
      _meta: widgetMeta(contentWidget),
    };
  }
);
```

## How It Works

### Widget-in-IFrame Pattern

1. ChatGPT invokes your MCP tool via POST request to `/mcp`
2. Your server returns a `templateUri` pointing to the HTML resource
3. ChatGPT fetches the HTML from the `templateUri`
4. ChatGPT renders the HTML in a sandboxed iframe
5. The NextChatSDKBootstrap patches browser APIs for iframe compatibility
6. Your React components can access ChatGPT state via `window.openai` hooks

### Asset Loading

The `assetPrefix` configuration ensures static assets load correctly:
- **Without assetPrefix**: Assets try to load from ChatGPT's origin → 404 errors
- **With assetPrefix**: Assets load from your app's actual origin → success

### CORS Handling

The middleware ensures cross-origin requests work:
- Handles OPTIONS preflight requests
- Adds `Access-Control-Allow-Origin: *` header
- Enables client-side navigation in iframe context

## Troubleshooting

### Assets returning 404

**Problem**: JavaScript/CSS files fail to load with 404 errors

**Solution**: Verify `baseUrl.js` is correctly configured and `next.config.js` includes:
```javascript
const { baseURL } = require("./baseUrl");
module.exports = {
  assetPrefix: baseURL,
  // ... other config
};
```

### CORS errors

**Problem**: Cross-origin errors in browser console

**Solution**: Check that `src/middleware.ts` includes CORS headers:
```typescript
response.headers.set("Access-Control-Allow-Origin", "*");
response.headers.set("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
response.headers.set("Access-Control-Allow-Headers", "*");
```

### Widget not discoverable

**Problem**: ChatGPT can't find your tools

**Solution**:
1. Verify MCP endpoint is accessible: `curl https://your-app.vercel.app/mcp`
2. Check that `mcp-handler` is properly installed
3. Ensure tools are registered with correct metadata

### Hydration errors

**Problem**: React hydration warnings

**Solution**: The `suppressHydrationWarning` attribute on `<html>` in `layout.tsx` should handle this. If persisting, check that NextChatSDKBootstrap is in the `<head>`.

## References

- [Vercel Blog: Running Next.js inside ChatGPT](https://vercel.com/blog/running-next-js-inside-chatgpt-a-deep-dive-into-native-app-integration)
- [ChatGPT Apps SDK Starter](https://github.com/vercel-labs/chatgpt-apps-sdk-nextjs-starter)
- [Model Context Protocol](https://modelcontextprotocol.io)
- [OpenAI Apps SDK Documentation](https://developers.openai.com/apps-sdk)

## Next Steps

1. **Customize the widget UI** - Edit components to show your app's content
2. **Add more tools** - Register additional MCP tools in `route.ts`
3. **Enhance interactivity** - Use hooks to make your widget reactive
4. **Test in ChatGPT** - Deploy and connect to ChatGPT for testing
5. **Monitor usage** - Add analytics to track tool invocations

## Support

For issues or questions:
- Review the [ChatGPT Apps SDK Next.js Starter](https://github.com/vercel-labs/chatgpt-apps-sdk-nextjs-starter) examples
- Check [Vercel's documentation](https://vercel.com/docs)
- Open an issue in the repository
