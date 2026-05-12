/**
 * Chat API Route
 * Handles chat interactions with Claude API and tools
 */
import 'dotenv/config';
import MCPClient from "../mcp-client";
import { saveMessage, getConversationHistory, storeCustomerAccountUrls, getCustomerAccountUrls as getCustomerAccountUrlsFromDb } from "../db.server";
import AppConfig from "../services/config.server";
import { createSseStream } from "../services/streaming.server";
import { classifyIntent, generateResponse, buildToolQuery, streamText } from "../services/nlp.server";
import { createToolService } from "../services/tool.server";


/**
 * Rract Router loader function for handling GET requests
 */
export async function loader({ request }) {
  // Handle OPTIONS requests (CORS preflight)
  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: getCorsHeaders(request)
    });
  }

  const url = new URL(request.url);

  // Handle history fetch requests - matches /chat?history=true&conversation_id=XYZ
  if (url.searchParams.has('history') && url.searchParams.has('conversation_id')) {
    return handleHistoryRequest(request, url.searchParams.get('conversation_id'));
  }

  // Handle SSE requests
  if (!url.searchParams.has('history') && request.headers.get("Accept") === "text/event-stream") {
    return handleChatRequest(request);
  }

  // API-only: reject all other requests
  return new Response(JSON.stringify({ error: AppConfig.errorMessages.apiUnsupported }), { status: 400, headers: getCorsHeaders(request) });
}

/**
 * React Router action function for handling POST requests
 */
export async function action({ request }) {
  // Handle OPTIONS requests (CORS preflight) in case it hits the action path
  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: getCorsHeaders(request)
    });
  }
  return handleChatRequest(request);
}

/**
 * Handle history fetch requests
 * @param {Request} request - The request object
 * @param {string} conversationId - The conversation ID
 * @returns {Response} JSON response with chat history
 */
async function handleHistoryRequest(request, conversationId) {
  const messages = await getConversationHistory(conversationId);

  return new Response(JSON.stringify({ messages }), { headers: getCorsHeaders(request) });
}

/**
 * Handle chat requests (both GET and POST)
 * @param {Request} request - The request object
 * @returns {Response} Server-sent events stream
 */
async function handleChatRequest(request) {
  try {
    // Get message data from request body
    const body = await request.json();
    const userMessage = body.message;

    // Validate required message
    if (!userMessage) {
      return new Response(
        JSON.stringify({ error: AppConfig.errorMessages.missingMessage }),
        { status: 400, headers: getSseHeaders(request) }
      );
    }

    // Generate or use existing conversation ID
    const conversationId = body.conversation_id || Date.now().toString();
    const promptType = body.prompt_type || AppConfig.api.defaultPromptType;

    // Create a stream for the response
    const responseStream = createSseStream(async (stream) => {
      await handleChatSession({
        request,
        userMessage,
        conversationId,
        promptType,
        stream
      });
    });

    return new Response(responseStream, {
      headers: getSseHeaders(request)
    });
  } catch (error) {
    console.error('Error in chat request handler:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: getCorsHeaders(request)
    });
  }
}

/**
 * Handle a complete chat session
 * @param {Object} params - Session parameters
 * @param {Request} params.request - The request object
 * @param {string} params.userMessage - The user's message
 * @param {string} params.conversationId - The conversation ID
 * @param {string} params.promptType - The prompt type
 * @param {Object} params.stream - Stream manager for sending responses
 */
async function handleChatSession({
  request,
  userMessage,
  conversationId,
  promptType,
  stream
}) {
  const toolService = createToolService();

  // Initialize MCP client for tool access
  const shopId = request.headers.get("X-Shopify-Shop-Id");
  const shopDomain = request.headers.get("Origin");
  const { mcpApiUrl } = await getCustomerAccountUrls(shopDomain, conversationId) || {};

  const mcpClient = new MCPClient(shopDomain, conversationId, shopId, mcpApiUrl);

  // Send conversation ID to client
  stream.sendMessage({ type: 'id', conversation_id: conversationId });

  // Connect MCP tools (best-effort)
  try {
    await mcpClient.connectToStorefrontServer();
    await mcpClient.connectToCustomerServer();
  } catch (err) {
    console.warn('MCP connection failed, continuing without tools:', err.message);
  }

  // ── Step 1: Save user message ──────────────────────────────────
  await saveMessage(conversationId, 'user', userMessage);

  // ── Step 2: NLP Intent Classification ─────────────────────────
  const { intent, entities } = classifyIntent(userMessage);
  console.log(`[NLP] Intent: ${intent} | Entities:`, entities);
  
  // Debug: write available tools to a file
  import('fs').then(fs => {
    fs.writeFileSync('tools_debug.json', JSON.stringify({
      storefrontTools: mcpClient.storefrontTools,
      customerTools: mcpClient.customerTools
    }, null, 2));
  });

  // ── Step 3: Tool Call (if needed) ──────────────────────────────
  let toolData = null;
  const productsToDisplay = [];
  const toolQuery = buildToolQuery(intent, entities);

  if (toolQuery && mcpClient.tools && mcpClient.tools.length > 0) {
    try {
      stream.sendMessage({ type: 'tool_use', tool_use_message: `Searching: ${toolQuery.toolName}` });
      const toolResponse = await mcpClient.callTool(toolQuery.toolName, toolQuery.args);

      if (!toolResponse.error) {
        toolData = toolResponse.content?.[0]?.text || null;
        // Extract products if it's a catalog search
        if (toolQuery.toolName === AppConfig.tools.productSearchName) {
          const processed = toolService.processProductSearchResult(toolResponse);
          productsToDisplay.push(...processed);
        }
        stream.sendMessage({ type: 'new_message' });
      }
    } catch (err) {
      console.warn('[NLP] Tool call failed:', err.message);
    }
  }

  // ── Step 4: Generate Response ───────────────────────────────────
  const responseText = generateResponse(intent, entities, toolData);

  // ── Step 5: Stream Response word-by-word ────────────────────────
  await streamText(responseText, (chunk) => {
    stream.sendMessage({ type: 'chunk', chunk });
  });

  // ── Step 6: Save assistant message ─────────────────────────────
  await saveMessage(conversationId, 'assistant', responseText);

  // ── Step 7: Signal completion ───────────────────────────────────
  stream.sendMessage({ type: 'message_complete' });
  stream.sendMessage({ type: 'end_turn' });

  // ── Step 8: Send product cards if any ──────────────────────────
  if (productsToDisplay.length > 0) {
    stream.sendMessage({ type: 'product_results', products: productsToDisplay });
  }
}


/**
 * Get the customer MCP API URL for a shop
 * @param {string} shopDomain - The shop domain
 * @param {string} conversationId - The conversation ID
 * @returns {string} The customer MCP API URL
 */
async function getCustomerAccountUrls(shopDomain, conversationId) {
  try {
    // Check if the customer account URL exists in the DB
    const existingUrls = await getCustomerAccountUrlsFromDb(conversationId);

    // If URL exists, return early with the MCP API URL
    if (existingUrls) return existingUrls;

    // If not, query for it from the Shopify API
    const { hostname } = new URL(shopDomain);

    const urls = await Promise.all([
      fetch(`https://${hostname}/.well-known/customer-account-api`).then(res => res.json()),
      fetch(`https://${hostname}/.well-known/openid-configuration`).then(res => res.json()),
    ]).then(async ([mcpResponse, openidResponse]) => {
      const response = {
        mcpApiUrl: mcpResponse.mcp_api,
        authorizationUrl: openidResponse.authorization_endpoint,
        tokenUrl: openidResponse.token_endpoint,
      };

      await storeCustomerAccountUrls({
        conversationId,
        mcpApiUrl: mcpResponse.mcp_api,
        authorizationUrl: openidResponse.authorization_endpoint,
        tokenUrl: openidResponse.token_endpoint,
      });

      return response;
    });

    return urls;
  } catch (error) {
    console.error("Error getting customer MCP API URL:", error);
    return null;
  }
}

/**
 * Gets CORS headers for the response
 * @param {Request} request - The request object
 * @returns {Object} CORS headers object
 */
function getCorsHeaders(request) {
  const origin = request.headers.get("Origin") || "*";
  const requestHeaders = request.headers.get("Access-Control-Request-Headers") || "Content-Type, Accept";

  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": requestHeaders,
    "Access-Control-Allow-Credentials": "true",
    "Access-Control-Allow-Private-Network": "true",
    "Access-Control-Max-Age": "86400" // 24 hours
  };
}

/**
 * Get SSE headers for the response
 * @param {Request} request - The request object
 * @returns {Object} SSE headers object
 */
function getSseHeaders(request) {
  const origin = request.headers.get("Origin") || "*";

  return {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    "Connection": "keep-alive",
    "Access-Control-Allow-Credentials": "true",
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "GET,OPTIONS,POST",
    "Access-Control-Allow-Headers": "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version",
    "Access-Control-Allow-Private-Network": "true"
  };
}
