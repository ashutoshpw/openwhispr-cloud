# Testing ChatGPT Apps SDK Integration

This guide will help you test the ChatGPT Apps SDK integration locally and in production.

## Testing Locally

### 1. Start the Development Server

Make sure you have a PostgreSQL database running (via Docker or locally):

```bash
# Start database with Docker
docker compose up -d postgres

# Sync database schema
npm run db:push

# Start development server
npm run dev
```

The app will be available at `http://localhost:3000` and the MCP endpoint at `http://localhost:3000/mcp`.

### 2. Test the MCP Endpoint

Verify the MCP server is responding:

```bash
curl http://localhost:3000/mcp
```

You should see a JSON response with MCP protocol information.

### 3. Test Hook Components

Create a test page to verify the hooks work correctly:

**`src/app/test-widget/page.tsx`**:

```tsx
"use client";

import {
  useWidgetProps,
  useDisplayMode,
  useMaxHeight,
  useOpenExternal,
  useSendMessage,
  useRequestDisplayMode,
} from "@/app/hooks";

export default function TestWidgetPage() {
  const widgetProps = useWidgetProps<{ name?: string }>();
  const displayMode = useDisplayMode();
  const maxHeight = useMaxHeight();
  const openExternal = useOpenExternal();
  const sendMessage = useSendMessage();
  const requestDisplayMode = useRequestDisplayMode();

  return (
    <div className="p-8 space-y-4" style={{ maxHeight: maxHeight ? `${maxHeight}px` : undefined }}>
      <h1 className="text-2xl font-bold">ChatGPT SDK Test Page</h1>
      
      <div className="space-y-2">
        <h2 className="text-xl font-semibold">State</h2>
        <p>Widget Props: {JSON.stringify(widgetProps)}</p>
        <p>Display Mode: {displayMode || "null"}</p>
        <p>Max Height: {maxHeight || "null"}</p>
      </div>

      <div className="space-y-2">
        <h2 className="text-xl font-semibold">Actions</h2>
        <button
          onClick={() => openExternal("https://github.com")}
          className="px-4 py-2 bg-blue-500 text-white rounded"
        >
          Open External Link
        </button>
        
        <button
          onClick={() => sendMessage("Hello from widget!")}
          className="px-4 py-2 bg-green-500 text-white rounded ml-2"
        >
          Send Message
        </button>
        
        <button
          onClick={() => requestDisplayMode("fullscreen")}
          className="px-4 py-2 bg-purple-500 text-white rounded ml-2"
        >
          Request Fullscreen
        </button>
      </div>

      <div className="mt-4 p-4 bg-gray-100 rounded">
        <p className="text-sm text-gray-600">
          When running in ChatGPT, the hooks will access window.openai API.
          Outside ChatGPT, hooks will return null or no-op functions.
        </p>
      </div>
    </div>
  );
}
```

Visit `http://localhost:3000/test-widget` to see the test page. The hooks should return null values when not in ChatGPT context.

## Testing in Production (Vercel)

### 1. Deploy to Vercel

```bash
# Install Vercel CLI
npm install -g vercel

# Deploy to production
vercel --prod
```

Note your deployment URL (e.g., `https://your-app.vercel.app`).

### 2. Verify MCP Endpoint

Test the production MCP endpoint:

```bash
curl https://your-app.vercel.app/mcp
```

### 3. Connect to ChatGPT

**Note**: As of now, ChatGPT Apps SDK support requires:
- ChatGPT with developer mode enabled
- Access to MCP connectors feature

**Steps**:

1. Open ChatGPT (web or desktop app)
2. Go to Settings → Connectors
3. Click "Add Connector" or "Create New Connector"
4. Enter your MCP URL: `https://your-app.vercel.app/mcp`
5. Save the connector

### 4. Test in ChatGPT

Once connected, try these prompts in ChatGPT:

1. **Basic Tool Invocation**:
   ```
   Show me the content
   ```
   ChatGPT should discover the `show_content` tool and invoke it.

2. **With Parameters**:
   ```
   Show me the content for John Doe
   ```
   The tool should receive the name parameter.

3. **Widget Rendering**:
   The widget should render your app's homepage inside ChatGPT's interface as an iframe.

### Expected Behavior

✅ **Tool Discovery**: ChatGPT should list your registered tools
✅ **Widget Rendering**: Your app should render in an iframe without 404 errors for assets
✅ **Interactivity**: Navigation and interactions should work within the iframe
✅ **External Links**: Links to external sites should open in new window/tab
✅ **State Access**: Hooks should receive values from ChatGPT's context

## Troubleshooting

### Assets Return 404

**Issue**: JavaScript/CSS files fail to load

**Solution**: Verify `baseUrl.js` is correctly detecting the environment:

```bash
# Check deployed environment variables
vercel env ls
```

Make sure these are set:
- `VERCEL_ENV`
- `VERCEL_PROJECT_PRODUCTION_URL`

### CORS Errors

**Issue**: Cross-origin errors in console

**Check**:
1. Middleware includes CORS headers
2. OPTIONS requests return 204 status
3. All responses include `Access-Control-Allow-Origin: *`

Test CORS:
```bash
curl -X OPTIONS https://your-app.vercel.app/mcp \
  -H "Origin: https://chatgpt.com" \
  -H "Access-Control-Request-Method: POST" \
  -v
```

### Widget Not Appearing

**Issue**: ChatGPT doesn't show the widget

**Check**:
1. MCP endpoint is accessible
2. Tool metadata includes `_meta` with OpenAI-specific fields
3. Resource returns `text/html+skybridge` MIME type
4. HTML includes NextChatSDKBootstrap script

### Hooks Return Null

**Issue**: All hooks return null in ChatGPT

**This is expected outside ChatGPT**. When running locally or in a regular browser, hooks will return null because `window.openai` doesn't exist.

In ChatGPT, the platform injects `window.openai` API into your iframe, and hooks will receive actual values.

## Debug Mode

Enable verbose logging by checking browser console (when in ChatGPT):

```javascript
// In browser console
console.log(window.openai); // Should show the OpenAI API object
console.log(window.innerBaseUrl); // Should show your app's base URL
```

## Integration Checklist

Before considering the integration complete, verify:

- [ ] MCP endpoint responds at `/mcp`
- [ ] Tools are registered with correct metadata
- [ ] Resources return HTML with proper MIME type
- [ ] NextChatSDKBootstrap is in layout `<head>`
- [ ] Middleware adds CORS headers
- [ ] `next.config.js` includes `assetPrefix`
- [ ] All hooks are exported from `src/app/hooks/index.ts`
- [ ] Build succeeds without errors
- [ ] Deploy to Vercel succeeds
- [ ] Connection to ChatGPT succeeds
- [ ] Widget renders in ChatGPT interface
- [ ] Navigation works within iframe
- [ ] External links open correctly

## Next Steps

Once basic integration is verified:

1. **Customize the widget**: Edit components to show your app's unique content
2. **Add more tools**: Register additional tools in `src/app/mcp/route.ts`
3. **Enhance interactivity**: Use hooks to respond to ChatGPT state changes
4. **Add analytics**: Track tool invocations and user interactions
5. **Optimize performance**: Ensure widget loads quickly in iframe context

## Resources

- [Full Documentation](./CHATGPT_APPS_SDK.md)
- [Vercel Blog Post](https://vercel.com/blog/running-next-js-inside-chatgpt-a-deep-dive-into-native-app-integration)
- [Example Starter](https://github.com/vercel-labs/chatgpt-apps-sdk-nextjs-starter)
- [Model Context Protocol](https://modelcontextprotocol.io)

## Support

If you encounter issues:
1. Check this guide's troubleshooting section
2. Review the main documentation
3. Check example implementations in the starter repo
4. Open an issue with reproduction steps
