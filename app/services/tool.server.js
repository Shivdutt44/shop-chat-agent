/**
 * Tool Service
 * Manages tool execution and processing
 */
import { saveMessage } from "../db.server";
import AppConfig from "./config.server";

/**
 * Creates a tool service instance
 * @returns {Object} Tool service with methods for managing tools
 */
export function createToolService() {
  /**
   * Handles a tool error response
   * @param {Object} toolUseResponse - The error response from the tool
   * @param {string} toolName - The name of the tool
   * @param {string} toolUseId - The ID of the tool use request
   * @param {Array} conversationHistory - The conversation history
   * @param {Function} sendMessage - Function to send messages to the client
   * @param {string} conversationId - The conversation ID
   */
  const handleToolError = async (toolUseResponse, toolName, toolUseId, conversationHistory, sendMessage, conversationId) => {
    if (toolUseResponse.error.type === "auth_required") {
      console.log("Auth required for tool:", toolName);
      await addToolResultToHistory(conversationHistory, toolUseId, toolUseResponse.error.data, conversationId);
      sendMessage({ type: 'auth_required' });
    } else {
      console.log("Tool use error", toolUseResponse.error);
      await addToolResultToHistory(conversationHistory, toolUseId, toolUseResponse.error.data, conversationId);
    }
  };

  /**
   * Handles a successful tool response
   * @param {Object} toolUseResponse - The response from the tool
   * @param {string} toolName - The name of the tool
   * @param {string} toolUseId - The ID of the tool use request
   * @param {Array} conversationHistory - The conversation history
   * @param {Array} productsToDisplay - Array to add product results to
   * @param {string} conversationId - The conversation ID
   */
  const handleToolSuccess = async (toolUseResponse, toolName, toolUseId, conversationHistory, productsToDisplay, conversationId) => {
    // Check if this is a product search result
    if (toolName === AppConfig.tools.productSearchName) {
      productsToDisplay.push(...processProductSearchResult(toolUseResponse));
    }

    addToolResultToHistory(conversationHistory, toolUseId, toolUseResponse.content, conversationId);
  };

  /**
   * Processes product search results
   * @param {Object} toolUseResponse - The response from the tool
   * @returns {Array} Processed product data
   */
  const processProductSearchResult = (toolUseResponse) => {
    try {
      console.log("Processing product search result");
      let products = [];

      if (toolUseResponse.content && toolUseResponse.content.length > 0) {
        const content = toolUseResponse.content[0].text;

        try {
          let responseData;
          if (typeof content === 'object') {
            responseData = content;
          } else if (typeof content === 'string') {
            responseData = JSON.parse(content);
          }

          // Log raw shape so we can debug field names from the real MCP response
          console.log("[MCP] Raw product response keys:", responseData ? Object.keys(responseData) : 'null');

          // Resolve the array of raw products from all known response shapes
          let rawProducts = null;

          if (Array.isArray(responseData)) {
            // Shape: top-level array
            rawProducts = responseData;
          } else if (Array.isArray(responseData?.products)) {
            // Shape: { products: [...] }
            rawProducts = responseData.products;
          } else if (Array.isArray(responseData?.products?.nodes)) {
            // Shape: { products: { nodes: [...] } }
            rawProducts = responseData.products.nodes;
          } else if (Array.isArray(responseData?.nodes)) {
            // Shape: { nodes: [...] }
            rawProducts = responseData.nodes;
          } else if (Array.isArray(responseData?.results)) {
            // Shape: { results: [...] }
            rawProducts = responseData.results;
          } else if (Array.isArray(responseData?.data?.products?.nodes)) {
            // Shape: GraphQL { data: { products: { nodes: [...] } } }
            rawProducts = responseData.data.products.nodes;
          }

          if (rawProducts && rawProducts.length > 0) {
            products = rawProducts
              .slice(0, AppConfig.tools.maxProductsToDisplay)
              .map(formatProductData);
            console.log(`Found ${products.length} products to display`);
          } else {
            console.log("[MCP] No products array found in response:", JSON.stringify(responseData).slice(0, 300));
          }
        } catch (e) {
          console.error("Error parsing product data:", e);
        }
      }

      return products;
    } catch (error) {
      console.error("Error processing product search results:", error);
      return [];
    }
  };

  /**
   * Extracts a formatted price string from a product object,
   * handling all known Shopify MCP / Storefront API response shapes.
   * @param {Object} product - Raw product data
   * @returns {string} Formatted price string
   */
  const extractPrice = (product) => {
    // Shape 1: GraphQL camelCase — priceRange.minVariantPrice { amount, currencyCode }
    if (product.priceRange?.minVariantPrice?.amount !== undefined) {
      const { amount, currencyCode } = product.priceRange.minVariantPrice;
      // Handle minor units conversion if applicable
      const numericAmount = parseFloat(amount) > 1000 ? parseFloat(amount) / 100 : parseFloat(amount);
      return `${currencyCode || ''} ${numericAmount.toFixed(2)}`.trim();
    }

    // Shape 2: snake_case with nested min object — price_range.min { amount, currency_code }
    if (product.price_range?.min?.amount !== undefined) {
      const { amount, currency_code, currencyCode, currency } = product.price_range.min;
      // UCP returns minor units (e.g., 69900 = 699.00)
      const numericAmount = parseFloat(amount) / 100;
      return `${currency_code || currencyCode || currency || ''} ${numericAmount.toFixed(2)}`.trim();
    }

    // Shape 3: flat price_range — price_range { currency: "INR", min: 299 }
    if (product.price_range && typeof product.price_range.min !== 'object' && product.price_range.min !== undefined) {
      // Assume direct value unless extremely high
      const amt = parseFloat(product.price_range.min);
      const numericAmount = amt > 5000 ? amt / 100 : amt;
      return `${product.price_range.currency || ''} ${numericAmount.toFixed(2)}`.trim();
    }

    // Shape 4: variants array (nodes or plain array)
    const variant = product.variants?.nodes?.[0] || product.variants?.[0];
    if (variant) {
      if (variant.price?.amount !== undefined) {
        const { amount, currencyCode, currency_code, currency } = variant.price;
        // UCP variants also return minor units
        const numericAmount = parseFloat(amount) / 100;
        return `${currencyCode || currency_code || currency || ''} ${numericAmount.toFixed(2)}`.trim();
      }
      if (typeof variant.price === 'string' || typeof variant.price === 'number') {
        const amt = parseFloat(variant.price);
        const numericAmount = amt > 5000 ? amt / 100 : amt;
        return `${variant.currencyCode || variant.currency_code || variant.currency || ''} ${numericAmount.toFixed(2)}`.trim() || String(variant.price);
      }
    }

    // Shape 5: direct price field
    if (product.price !== undefined) {
      if (product.price !== null && typeof product.price === 'object') {
        const { amount, currencyCode, currency_code } = product.price;
        const numericAmount = parseFloat(amount) > 1000 ? parseFloat(amount) / 100 : parseFloat(amount);
        return `${currencyCode || currency_code || ''} ${numericAmount.toFixed(2)}`.trim();
      }
      return String(product.price);
    }

    return 'Price not available';
  };

  /**
   * Formats a product data object
   * @param {Object} product - Raw product data
   * @returns {Object} Formatted product data
   */
  const formatProductData = (product) => {
    // Image: try every known field name
    const imageUrl =
      product.image_url ||
      product.featuredImage?.url ||
      product.media?.[0]?.url ||
      product.media?.nodes?.[0]?.url ||
      product.images?.nodes?.[0]?.url ||
      product.images?.[0]?.url ||
      product.image?.src ||
      '';

    // URL: prefer explicit url, then onlineStoreUrl, then build from handle
    const productUrl =
      product.url ||
      product.onlineStoreUrl ||
      (product.handle ? `/products/${product.handle}` : '');

    // Description: strip HTML tags if descriptionHtml is present
    const description =
      product.description ||
      (product.descriptionHtml ? product.descriptionHtml.replace(/<[^>]*>/g, '').trim() : '') ||
      '';

    // Variant ID: Critical for direct Cart AJAX operations
    const rawVariant = product.variants?.nodes?.[0] || product.variants?.[0];
    let variantId = '';
    if (rawVariant && rawVariant.id) {
      // GID Format: gid://shopify/ProductVariant/12345678
      variantId = String(rawVariant.id).split('/').pop() || '';
    }

    return {
      id: product.product_id || product.id || `product-${Math.random().toString(36).substring(7)}`,
      variant_id: variantId,
      title: product.title || 'Product',
      price: extractPrice(product),
      image_url: imageUrl,
      description: description,
      url: productUrl
    };

  };

  /**
   * Adds a tool result to the conversation history
   * @param {Array} conversationHistory - The conversation history
   * @param {string} toolUseId - The ID of the tool use request
   * @param {string} content - The content of the tool result
   * @param {string} conversationId - The conversation ID
   */
  const addToolResultToHistory = async (conversationHistory, toolUseId, content, conversationId) => {
    const toolResultMessage = {
      role: 'user',
      content: [{
        type: "tool_result",
        tool_use_id: toolUseId,
        content: content
      }]
    };

    // Add to in-memory history
    conversationHistory.push(toolResultMessage);

    // Save to database with special format to indicate tool result
    if (conversationId) {
      try {
        await saveMessage(conversationId, 'user', JSON.stringify(toolResultMessage.content));
      } catch (error) {
        console.error('Error saving tool result to database:', error);
      }
    }
  };

  return {
    handleToolError,
    handleToolSuccess,
    processProductSearchResult,
    addToolResultToHistory
  };
}

export default {
  createToolService
};
