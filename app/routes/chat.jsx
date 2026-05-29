/**
 * Chat API Route
 * Handles chat interactions with Claude API and tools
 */
import 'dotenv/config';
import MCPClient from "../mcp-client";
import { saveMessage, getConversationHistory, storeCustomerAccountUrls, getCustomerAccountUrls as getCustomerAccountUrlsFromDb } from "../db.server";
import AppConfig from "../services/config.server";
import prisma from "../db.server";
import { createSseStream } from "../services/streaming.server";
import { classifyIntent, generateResponse, buildToolQuery, streamText } from "../services/nlp.server";
import { createToolService } from "../services/tool.server";
import { createClaudeService } from "../services/claude.server";


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
  stream
}) {
  const toolService = createToolService();
  const useClaude = Boolean(process.env.CLAUDE_API_KEY);

  // Initialize MCP client for tool access
  const shopId = request.headers.get("X-Shopify-Shop-Id");
  const shopDomain = request.headers.get("Origin");
  const hostname = shopDomain ? new URL(shopDomain).hostname : null;

  // Load dynamic settings via raw SQL to bypass Prisma node-module locks
  let settings = null;
  if (hostname) {
    try {
      const rows = await prisma.$queryRaw`SELECT * FROM AppSettings WHERE shop = ${hostname} LIMIT 1`;
      if (rows && rows.length > 0) {
        settings = rows[0];
      }
    } catch (e) {
      console.warn("[Prisma] Failed to fetch settings via raw query", e.message);
    }
  }

  // Default Fallback
  const activeSettings = settings || {
    agentName: "AI Assistant",
    welcomeMessage: "Namaste! Main aapki kaise madad kar sakta hoon?"
  };

  const customerUrls = await getCustomerAccountUrls(shopDomain, conversationId);
  const { mcpApiUrl } = customerUrls || {};

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

  console.log(`[MCP] Available tools: ${mcpClient.tools.map(t => t.name).join(', ') || '(none)'}`);

  const previousMessages = await getConversationHistory(conversationId);
  const conversationMessages = previousMessages.map((message) => ({
    role: message.role,
    content: message.content
  }));

  // ── Step 1: Save user message ──────────────────────────────────
  await saveMessage(conversationId, 'user', userMessage);
  conversationMessages.push({ role: 'user', content: userMessage });

  // ── Step 2: NLP Intent Classification ─────────────────────────
  const { intent, entities } = classifyIntent(userMessage);
  console.log(`[NLP] Intent: ${intent} | Entities:`, entities);

  // ── Step 3: Tool Call (if needed) ──────────────────────────────
  let toolData = null;
  let assistantStarted = false;
  const productsToDisplay = [];
  const toolQuery = buildToolQuery(intent, entities);

  if (toolQuery && mcpClient.tools && mcpClient.tools.length > 0) {
    const resolvedToolName = resolveToolName(toolQuery.toolName, mcpClient.tools);

    if (resolvedToolName) {
      try {
        stream.sendMessage({ type: 'tool_use', tool_use_message: `Searching: ${resolvedToolName}` });
        const toolResponse = await mcpClient.callTool(resolvedToolName, toolQuery.args);

        if (!toolResponse.error) {
          toolData = toolResponse.content?.[0]?.text || null;
          // Extract products if this is the catalog search tool
          if (toolQuery.toolName === AppConfig.tools.productSearchName) {
            const processed = toolService.processProductSearchResult(toolResponse);
            productsToDisplay.push(...processed);
          }
          if (toolData) {
            conversationMessages.push({ role: 'assistant', content: toolData });
          }
          stream.sendMessage({ type: 'new_message' });
          assistantStarted = true;
        } else {
          console.warn(`[NLP] Tool "${resolvedToolName}" returned error:`, toolResponse.error);
        }
      } catch (err) {
        console.warn(`[NLP] Tool call failed: ${err.message}`);
      }
    } else {
      console.warn(
        `[NLP] Tool call skipped: "${toolQuery.toolName}" not found in MCP tools [${mcpClient.tools.map(t => t.name).join(', ')}]`
      );
    }
  }

  const extractClaudeText = (finalMessage) => {
    if (!finalMessage) return '';
    if (typeof finalMessage.content === 'string') return finalMessage.content;
    if (Array.isArray(finalMessage.content)) {
      return finalMessage.content.map((block) => {
        if (typeof block === 'string') return block;
        return block?.text || block?.content || '';
      }).join('');
    }
    if (typeof finalMessage.content === 'object') {
      return finalMessage.content.text || finalMessage.content.content || '';
    }
    return '';
  };

  let responseText;

  if (useClaude) {
    const claudeService = createClaudeService();

    if (!assistantStarted) {
      stream.sendMessage({ type: 'new_message' });
      assistantStarted = true;
    }

    const finalMessage = await claudeService.streamConversation(
      {
        messages: conversationMessages,
        promptType,
        tools: mcpClient.tools
      },
      {
        onText: (chunk) => {
          stream.sendMessage({ type: 'chunk', chunk });
        },
        onMessage: () => {},
        onToolUse: async () => {
          // Tool use via Claude is not wired through this flow.
          // Local NLP tool calls are handled separately above.
        }
      }
    );

    responseText = extractClaudeText(finalMessage) || AppConfig.errorMessages.genericError;
  } else {
    if (!assistantStarted) {
      stream.sendMessage({ type: 'new_message' });
      assistantStarted = true;
    }

    // ── Step 4: Generate Response ───────────────────────────────────
    responseText = generateResponse(intent, entities, toolData, activeSettings);

    // ── Step 5: Stream Response word-by-word ────────────────────────
    await streamText(responseText, (chunk) => {
      stream.sendMessage({ type: 'chunk', chunk });
    });
  }

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
 * @returns {Promise<{mcpApiUrl:string,authorizationUrl:string,tokenUrl:string}|null>} Customer account URLs or null
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
 * Resolves a desired NLP tool name to an actual available MCP tool name.
 * Tries exact match first, then fuzzy keyword-based matching so the app
 * works even when Shopify renames or versions its MCP tools.
 *
 * @param {string} desiredName - The tool name from buildToolQuery (e.g. "search_shop_catalog")
 * @param {Array<{name:string}>} availableTools - Tools returned by the MCP server
 * @returns {string|null} Resolved tool name, or null if nothing suitable found
 */
function resolveToolName(desiredName, availableTools) {
  // 1. Exact match
  if (availableTools.some(t => t.name === desiredName)) return desiredName;

  // 2. Case-insensitive exact match
  const lowerDesired = desiredName.toLowerCase();
  const caseMatch = availableTools.find(t => t.name.toLowerCase() === lowerDesired);
  if (caseMatch) return caseMatch.name;

  // 3. Fuzzy matchers keyed by canonical NLP tool name
  const FUZZY_MATCHERS = {
    search_shop_catalog: (n) =>
      (n.includes('search') && (n.includes('catalog') || n.includes('product'))) ||
      n === 'search_catalog' || n === 'search_products' || n === 'product_search',
    get_order: (n) =>
      n.includes('order') && (n.includes('get') || n.includes('fetch') || n.includes('lookup') || n.includes('read')),
    get_orders: (n) =>
      (n.includes('order') && (n.includes('list') || n.includes('history') || n.includes('customer'))) ||
      n === 'get_orders' || n === 'list_orders',
    read_shop_policies: (n) =>
      n.includes('polic') || (n.includes('shop') && n.includes('read')) || n === 'get_policies',
    get_shop: (n) =>
      n === 'get_shop' || n === 'read_shop' || n === 'shop_info' || n === 'get_store' ||
      (n.includes('shop') && !n.includes('catalog') && !n.includes('search') && !n.includes('polic')),
  };

  const matcher = FUZZY_MATCHERS[desiredName];
  if (matcher) {
    const fuzzyMatch = availableTools.find(t => matcher(t.name.toLowerCase()));
    if (fuzzyMatch) {
      console.log(`[NLP] Resolved tool "${desiredName}" → "${fuzzyMatch.name}"`);
      return fuzzyMatch.name;
    }

    // 4. Loose fallback: first keyword in the name
    const firstKeyword = desiredName.split('_')[0];
    const looseMatch = availableTools.find(t => t.name.toLowerCase().includes(firstKeyword));
    if (looseMatch) {
      console.log(`[NLP] Loosely resolved tool "${desiredName}" → "${looseMatch.name}"`);
      return looseMatch.name;
    }
  }

  return null;
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
