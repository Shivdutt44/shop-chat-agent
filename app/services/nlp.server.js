/**
 * NLP Service — Advanced eCommerce Intelligence Engine
 * Replaces Claude API with local NLP-based intent detection,
 * entity extraction, and response generation.
 * Supports: English + Hindi + Hinglish
 */

// ═══════════════════════════════════════════════════════════════
// INTENT KEYWORD MAPS (English + Hindi + Hinglish)
// ═══════════════════════════════════════════════════════════════
const INTENT_PATTERNS = {
  order_tracking: [
    'track', 'tracking', 'order status', 'where is my order', 'kahan hai', 'kaha hai',
    'mera order', 'order kaha', 'shipment', 'delivery status', 'package', 'parcel',
    'out for delivery', 'shipped', 'dispatch', 'kitne din', 'kab aayega', 'kab milega order',
    'order #', 'order number', 'order no'
  ],
  refund: [
    'refund', 'money back', 'paisa wapas', 'paise wapas', 'return money', 'refund kab',
    'refund status', 'refund milega', 'payment refund', 'amount refund', 'wapas karo',
    'paise return', 'refund ho gaya'
  ],
  return: [
    'return', 'exchange', 'replace', 'wapas karna', 'return karna', 'product return',
    'return policy', 'return request', 'exchange karna', 'badalna', 'product wapas',
    'return kaise', 'return kar sakta'
  ],
  cancel: [
    'cancel', 'cancellation', 'order cancel', 'cancel karna', 'order band karo',
    'order stop', 'order cancel karo', 'cancel kar do', 'nahi chahiye'
  ],
  shipping: [
    'shipping', 'delivery', 'deliver', 'kitne din me', 'kitne time', 'fast delivery',
    'same day', 'express delivery', 'free shipping', 'shipping charge', 'delivery charge',
    'delivery time', 'delivery kab', 'jaldi delivery', 'urgent delivery', 'aaj milega'
  ],
  discount: [
    'discount', 'offer', 'coupon', 'promo', 'sale', 'deal', 'off', 'cheap', 'sasta',
    'save', 'cashback', 'voucher', 'code', 'code do', 'coupon code', 'best price',
    'lowest price', 'kam price', 'offer hai kya', 'sale hai'
  ],
  product_search: [
    'show', 'find', 'search', 'looking for', 'want', 'need', 'chahiye', 'dikhao',
    'dikhawo', 'suggest', 'recommend', 'best', 'top', 'good', 'nice', 'buy',
    'kharidna', 'purchase', 'get me', 'do you have', 'available', 'stock mein',
    'product', 'item', 'shoes', 'hoodie', 'shirt', 't-shirt', 'phone', 'mobile',
    'laptop', 'watch', 'bag', 'jacket', 'sneakers', 'kurta', 'saree', 'dress'
  ],
  budget: [
    'under', 'below', 'less than', 'cheap', 'affordable', 'budget', 'sasta', 'kam mein',
    'andar', 'se kam', '500', '1000', '2000', '5000', '10000', '15000', '20000',
    'low price', 'cheap products', 'value for money'
  ],
  premium: [
    'premium', 'luxury', 'best quality', 'high end', 'expensive', 'top quality',
    'branded', 'original', 'genuine', 'mahenga', 'achha quality', 'best brand',
    'premium quality', 'top notch'
  ],
  support: [
    'help', 'support', 'contact', 'issue', 'problem', 'complaint', 'complain',
    'madad', 'sahayata', 'koi problem', 'issue hai', 'kaam nahi kar raha',
    'not working', 'broken', 'damaged', 'wrong product', 'galat product'
  ],
  greeting: [
    'hi', 'hello', 'hey', 'hii', 'helo', 'namaste', 'namaskar', 'good morning',
    'good evening', 'good afternoon', 'helo', 'sup', 'howdy', 'hy'
  ],
  thanks: [
    'thanks', 'thank you', 'shukriya', 'dhanyawad', 'great', 'awesome', 'perfect',
    'helpful', 'bahut acha', 'thx', 'ty', 'appreciate'
  ],
  payment: [
    'payment', 'pay', 'payment failed', 'transaction failed', 'cod', 'cash on delivery',
    'online payment', 'upi', 'credit card', 'debit card', 'emi', 'payment issue',
    'payment problem', 'paid', 'paisa kata', 'amount deducted'
  ],
  cart: [
    'cart', 'checkout', 'buy now', 'added to cart', 'abandoned', 'cart mein',
    'add to cart', 'tokri', 'bag', 'checkout kaise', 'buy karna hai'
  ]
};

// ═══════════════════════════════════════════════════════════════
// ENTITY EXTRACTORS
// ═══════════════════════════════════════════════════════════════

/**
 * Extract price/budget entity from message
 */
function extractBudget(text) {
  const patterns = [
    /under\s*(?:rs\.?|inr|₹)?\s*(\d+)/i,
    /below\s*(?:rs\.?|inr|₹)?\s*(\d+)/i,
    /(?:rs\.?|inr|₹)\s*(\d+)\s*(?:ke andar|se kam|andar|mein)/i,
    /(\d+)\s*(?:ke andar|se kam|andar|mein)/i,
    /(?:rs\.?|inr|₹)\s*(\d[\d,]+)/i,
    /(\d[\d,]+)\s*(?:rs\.?|inr|₹)/i,
  ];
  for (const pattern of patterns) {
    const m = text.match(pattern);
    if (m) return parseInt(m[1].replace(/,/g, ''), 10);
  }
  return null;
}

/**
 * Extract order number from message
 */
function extractOrderId(text) {
  const m = text.match(/#?(\d{4,})/);
  return m ? m[1] : null;
}

/**
 * Extract color entity
 */
function extractColor(text) {
  const colors = ['black', 'white', 'red', 'blue', 'green', 'yellow', 'pink', 'purple',
    'grey', 'gray', 'brown', 'orange', 'navy', 'maroon', 'golden', 'silver',
    'kala', 'safed', 'lal', 'neela', 'hara', 'peela', 'gulabi'];
  const lower = text.toLowerCase();
  return colors.find(c => lower.includes(c)) || null;
}

/**
 * Extract size entity
 */
function extractSize(text) {
  const m = text.match(/\b(xs|s|m|l|xl|xxl|xxxl|2xl|3xl|\d{1,2})\b/i);
  return m ? m[1].toUpperCase() : null;
}

/**
 * Extract product keywords from query
 */
function extractProductKeywords(text) {
  const stopwords = new Set(['i', 'me', 'my', 'the', 'a', 'an', 'and', 'or', 'to', 'in',
    'for', 'of', 'want', 'need', 'show', 'find', 'get', 'buy', 'chahiye', 'dikhao',
    'mujhe', 'please', 'karo', 'hai', 'kya', 'se', 'ke', 'do', 'yeh', 'woh', 'is']);
  const words = text.toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 2 && !stopwords.has(w));
  return [...new Set(words)];
}

// ═══════════════════════════════════════════════════════════════
// INTENT CLASSIFIER
// ═══════════════════════════════════════════════════════════════

/**
 * Classify intent from user message
 * Returns { intent, score, entities }
 */
export function classifyIntent(message) {
  const lower = message.toLowerCase().trim();
  const scores = {};

  for (const [intent, keywords] of Object.entries(INTENT_PATTERNS)) {
    scores[intent] = 0;
    for (const kw of keywords) {
      if (lower.includes(kw.toLowerCase())) {
        // Longer keyword match = higher score
        scores[intent] += kw.split(' ').length * 2;
      }
    }
  }

  // Find highest scoring intent
  let topIntent = 'product_search'; // default
  let topScore = 0;
  for (const [intent, score] of Object.entries(scores)) {
    if (score > topScore) {
      topScore = score;
      topIntent = intent;
    }
  }

  // Extract entities
  const entities = {
    orderId: extractOrderId(lower),
    budget: extractBudget(lower),
    color: extractColor(lower),
    size: extractSize(lower),
    keywords: extractProductKeywords(lower),
  };

  return { intent: topIntent, score: topScore, entities };
}

// ═══════════════════════════════════════════════════════════════
// RESPONSE GENERATOR
// ═══════════════════════════════════════════════════════════════

/**
 * Generates a response based on intent + REAL tool data.
 * When toolData is available it always wins — no hardcoded store-specific values.
 * When toolData is null an honest, generic message is shown instead.
 * @param {Object} settings - Dynamic shop settings
 */
export function generateResponse(intent, entities, toolData = null, settings = {}) {
  const { budget, color, size, keywords } = entities;
  
  // Dynamic agent details
  const agentName = settings.agentName || "AI Assistant";
  const customWelcome = settings.welcomeMessage || `👋 **Namaste!** Main aapki kaise madad kar sakta hoon?`;

  switch (intent) {
    // ── Static intents (no store-specific data needed) ─────────────
    case 'greeting':
      return `${customWelcome}\n\n[Related: Show me products]\n[Related: Track my order]\n[Related: What is the return policy?]`;

    case 'thanks':
      return `😊 **You're welcome!** Khushi hui aapki madad karke!\n\nKoi aur sawaal ho toh zaroor poochein.\n\n[Related: Show me more products]\n[Related: Track my order]`;

    // ── Order tracking ─────────────────────────────────────────────
    case 'order_tracking': {
      if (!toolData) {
        return `🔍 **Order Track Karne Ke Liye:**\n\nApna **Order ID ya Order Number** share karein (e.g. #1054) aur main aapka status check kar deta hoon.\n\n[Related: What is the return policy?]\n[Related: Contact support]`;
      }
      return formatOrderResponse(toolData);
    }

    // ── Policy intents — use real store policy from MCP ────────────
    case 'shipping': {
      if (toolData) {
        const policy = extractPolicyText(toolData, ['shipping', 'delivery']);
        if (policy) {
          return `🚚 **Shipping Policy (Store Se):**\n\n${policy}\n\n[Related: Track my order]\n[Related: What is the return policy?]`;
        }
      }
      return `🚚 **Shipping Information:**\n\nShipping details ke liye hamari store ki **Shipping Policy** page visit karein, ya apna order ID share karein delivery status check karne ke liye.\n\n[Related: Track my existing order]\n[Related: What is the return policy?]\n[Related: Contact support]`;
    }

    case 'return': {
      if (toolData) {
        const policy = extractPolicyText(toolData, ['return', 'refund', 'exchange']);
        if (policy) {
          return `📦 **Return & Exchange Policy (Store Se):**\n\n${policy}\n\n[Related: Track my order]\n[Related: Contact support]`;
        }
      }
      return `📦 **Return / Exchange:**\n\nReturn details ke liye hamari store ki **Refund Policy** page visit karein, ya apna Order ID share karein aur humari team se contact karein.\n\n[Related: Track my order]\n[Related: Contact support]`;
    }

    case 'refund': {
      if (toolData) {
        const policy = extractPolicyText(toolData, ['refund', 'return']);
        if (policy) {
          return `💰 **Refund Policy (Store Se):**\n\n${policy}\n\n[Related: Track my order]\n[Related: Start a return request]`;
        }
      }
      return `💰 **Refund Information:**\n\nRefund details ke liye hamari store ki **Refund Policy** page visit karein, ya apna Order ID share karein.\n\n[Related: Track my order]\n[Related: Start a return request]\n[Related: Contact support]`;
    }

    case 'cancel': {
      if (toolData) {
        const policy = extractPolicyText(toolData, ['cancel', 'refund']);
        if (policy) {
          return `❌ **Cancellation Policy (Store Se):**\n\n${policy}\n\n[Related: Track my order status]\n[Related: Start a return instead]`;
        }
      }
      return `❌ **Order Cancel Karna:**\n\nApna **Order ID** share karein aur main check karta hoon ki order cancel ho sakta hai ya nahi.\n\nAgar order ship ho chuka hai toh **return process** follow karna hoga.\n\n[Related: Track my order status]\n[Related: Start a return instead]\n[Related: Contact support]`;
    }

    // ── Discount — show real sale products via MCP search ──────────
    case 'discount': {
      if (toolData) {
        return `🏷️ **Store Ke Current Sale Products:**\n\nMain aapke liye store ke available sale/discount products dhundh raha hoon — neeche dekhen!\n\n[Related: Best products under budget]\n[Related: Premium collection]\n[Related: Track my order]`;
      }
      return `🏷️ **Discounts & Offers:**\n\nCurrent offers ke liye store ki website visit karein ya hamari team se contact karein.\n\n[Related: Show me all products]\n[Related: Contact support]`;
    }

    // ── Support — use real shop contact from MCP ───────────────────
    case 'support': {
      if (toolData) {
        const contact = extractShopContact(toolData);
        if (contact) {
          return `🛎️ **Customer Support:**\n\n${contact}\n\n[Related: My order hasn't arrived]\n[Related: I want to return a product]\n[Related: Payment issue help]`;
        }
      }
      return `🛎️ **Customer Support:**\n\nHum aapki madad ke liye hain! Apna issue describe karein ya store ki **Contact Us** page visit karein.\n\n[Related: My order hasn't arrived]\n[Related: I want to return a product]\n[Related: Payment issue help]`;
    }

    // ── Payment — generic honest response ─────────────────────────
    case 'payment': {
      if (toolData) {
        const shopInfo = extractShopContact(toolData);
        if (shopInfo) {
          return `💳 **Payment Support:**\n\n${shopInfo}\n\n[Related: Track my order]\n[Related: Check refund status]`;
        }
      }
      return `💳 **Payment Issue:**\n\nPayment fail hone par kuch minutes mein amount automatically return hota hai.\n\nAgar issue persist kare toh apna **Order ID** ya **Transaction ID** share karein.\n\n[Related: Track my order]\n[Related: Contact support]\n[Related: Check refund status]`;
    }

    // ── Cart — generic honest response ────────────────────────────
    case 'cart':
      return `🛒 **Your Cart:**\n\nCheckout complete karne ke liye store ki website par jaayein.\n\n[Related: Show me products]\n[Related: Are there any offers?]`;

    // ── Product search intents (all backed by MCP catalog search) ──
    case 'budget': {
      const budgetText = budget ? `₹${budget.toLocaleString('en-IN')}` : 'aapke budget mein';
      const colorText = color ? ` **${color}** color mein` : '';
      const sizeText = size ? ` size **${size}**` : '';
      const kwText = keywords.filter(k => k.length > 3).slice(0, 3).join(', ');
      if (toolData) {
        return `🔍 **${colorText}${sizeText} ${kwText || 'Products'} under ${budgetText}:**\n\nNeeche store ke matching products dekhen!\n\n[Related: Show premium alternatives]\n[Related: What is the return policy?]`;
      }
      return `🔍 **${colorText}${sizeText} ${kwText || 'Products'} under ${budgetText}:**\n\nAbhi store mein yeh products available nahi hain ya search nahi ho saka. Store ki website visit karein.\n\n[Related: Show all products]\n[Related: Contact support]`;
    }

    case 'premium': {
      const kwText = keywords.filter(k => k.length > 3).slice(0, 3).join(', ');
      if (toolData) {
        return `💎 **Premium ${kwText || 'Products'}:**\n\nStore ke top-rated products neeche dekhen!\n\n[Related: Budget alternatives]\n[Related: What is the return policy?]`;
      }
      return `💎 **Premium ${kwText || 'Products'}:**\n\nStore mein premium products dekhne ke liye website visit karein.\n\n[Related: Show all products]\n[Related: Contact support]`;
    }

    case 'product_search':
    default: {
      const colorText = color ? `**${color}** ` : '';
      const sizeText = size ? `size **${size}** ` : '';
      const kwText = keywords.filter(k => k.length > 3).slice(0, 3).join(' ');
      const budgetText = budget ? ` under **₹${budget.toLocaleString('en-IN')}**` : '';

      if (toolData) {
        return `🛍️ **${colorText}${sizeText}${kwText || 'Products'}${budgetText} — Store Results:**\n\nNeeche store ke matching products dekhen!\n\n[Related: Filter by price range]\n[Related: Show premium options]\n[Related: What is the return policy?]`;
      }
      return `🛍️ **${colorText}${sizeText}${kwText || 'Products'}${budgetText}:**\n\nAbhi yeh products search nahi ho sake. Store ki website visit karein ya kuch aur try karein.\n\n[Related: Show trending products]\n[Related: Contact support]`;
    }
  }
}

/**
 * Format real order data from MCP tool response into a readable message.
 * Handles both camelCase (GraphQL) and snake_case field names.
 */
function formatOrderResponse(orderData) {
  try {
    const raw = typeof orderData === 'string' ? JSON.parse(orderData) : orderData;

    // MCP may wrap in { order: {...} } or { orders: [...] }
    const order = raw.order || (Array.isArray(raw.orders) ? raw.orders[0] : null) ||
      (Array.isArray(raw) ? raw[0] : null) || raw;

    if (!order || typeof order !== 'object') {
      throw new Error('Unrecognised order structure');
    }

    const lines = ['📦 **Order Details:**\n'];

    // ID / name
    const name = order.name || order.orderNumber || order.order_number;
    const id = order.id || order.orderId || order.order_id;
    if (name || id) lines.push(`- **Order:** ${name || '#' + String(id).replace(/\D/g, '')}`);

    // Financial status
    const fin = order.financialStatus || order.financial_status;
    if (fin) lines.push(`- **Payment:** ${String(fin).toUpperCase()}`);

    // Fulfillment status
    const ful = order.fulfillmentStatus || order.fulfillment_status;
    lines.push(`- **Fulfillment:** ${ful ? String(ful) : 'Pending'}`);

    // Tracking info
    const fulfillments = order.fulfillments || order.fulfillmentOrders?.nodes || [];
    if (fulfillments.length > 0) {
      const f = fulfillments[0];
      const courier = f.trackingCompany || f.tracking_company;
      const trackNum = f.trackingNumber || f.tracking_number;
      const trackUrl = f.trackingUrl || f.tracking_url ||
        (Array.isArray(f.trackingInfo) ? f.trackingInfo[0]?.url : null);

      if (courier) lines.push(`- **Courier:** ${courier}`);
      if (trackNum) lines.push(`- **Tracking #:** \`${trackNum}\``);
      if (trackUrl) lines.push(`- [🔗 Track your package](${trackUrl})`);
    }

    // Shipping address
    const addr = order.shippingAddress || order.shipping_address;
    if (addr) {
      const city = addr.city;
      const province = addr.province || addr.provinceCode || addr.province_code;
      if (city || province) lines.push(`- **Delivering to:** ${[city, province].filter(Boolean).join(', ')}`);
    }

    // Total price
    const total = order.totalPrice || order.total_price ||
      order.currentTotalPrice?.amount || order.currentTotalPrice;
    const currency = order.currencyCode || order.currency ||
      order.currentTotalPrice?.currencyCode || '';
    if (total) lines.push(`- **Total:** ${currency} ${total}`);

    lines.push('\n[Related: What is the return policy?]');
    lines.push('[Related: I want to cancel this order]');
    lines.push('[Related: Contact support about this order]');

    return lines.join('\n');
  } catch (e) {
    console.warn('[NLP] formatOrderResponse error:', e.message);
    return `📦 **Order Status:**\n\nApna Order ID share karein aur main exact status check kar deta hoon.\n\n[Related: Contact support]\n[Related: Return policy kya hai?]`;
  }
}

/**
 * Extract a readable policy section from MCP policy tool response.
 * Searches for matching keywords to pick the right policy block.
 * @param {string|Object} data - Raw tool response text or object
 * @param {string[]} keywords - Keywords to look for (e.g. ['shipping', 'delivery'])
 * @returns {string|null} Cleaned policy text or null
 */
function extractPolicyText(data, keywords) {
  try {
    const parsed = typeof data === 'string' ? JSON.parse(data) : data;

    // Flatten all possible policy fields into a list of { title, body } pairs
    const candidates = [];
    const addCandidate = (obj) => {
      if (!obj || typeof obj !== 'object') return;
      const body = obj.body || obj.content || obj.text || obj.description || '';
      const title = obj.title || obj.name || '';
      if (body) candidates.push({ title, body });
    };

    // Known Shopify policy field names (camelCase + snake_case)
    const policyKeys = [
      'shippingPolicy', 'shipping_policy',
      'refundPolicy', 'refund_policy',
      'returnPolicy', 'return_policy',
      'privacyPolicy', 'privacy_policy',
      'termsOfService', 'terms_of_service',
      'legalNotice', 'legal_notice',
    ];
    for (const key of policyKeys) {
      if (parsed[key]) addCandidate(parsed[key]);
    }

    // Top-level body/text (when tool returns the policy directly)
    if (parsed.body || parsed.text || parsed.content) addCandidate(parsed);

    // Array of policies
    if (Array.isArray(parsed)) parsed.forEach(addCandidate);
    if (Array.isArray(parsed.policies)) parsed.policies.forEach(addCandidate);

    // Score candidates by keyword overlap
    const kwLower = keywords.map(k => k.toLowerCase());
    let best = null;
    let bestScore = 0;

    for (const c of candidates) {
      const combined = (c.title + ' ' + c.body).toLowerCase();
      const score = kwLower.filter(k => combined.includes(k)).length;
      if (score > bestScore) { bestScore = score; best = c; }
    }

    // Fallback: first candidate if nothing keyword-matched
    if (!best && candidates.length > 0) best = candidates[0];

    if (!best) return null;

    // Strip HTML tags and trim
    const clean = best.body.replace(/<[^>]*>/g, ' ').replace(/\s{2,}/g, ' ').trim();
    // Truncate if very long (keep first ~800 chars)
    return clean.length > 800 ? clean.slice(0, 800) + '…' : clean;
  } catch {
    return null;
  }
}

/**
 * Extract contact details from MCP shop/store info response.
 * @param {string|Object} data - Raw tool response
 * @returns {string|null} Formatted contact string or null
 */
function extractShopContact(data) {
  try {
    const parsed = typeof data === 'string' ? JSON.parse(data) : data;
    const shop = parsed.shop || parsed.store || parsed;

    const lines = [];
    const email = shop.email || shop.contactEmail || shop.contact_email;
    const phone = shop.phone || shop.phoneNumber || shop.phone_number;
    const name = shop.name || shop.storeName || shop.store_name;
    const url = shop.url || shop.domain || shop.primaryDomain?.url;

    if (name) lines.push(`**${name}**`);
    if (email) lines.push(`- 📧 Email: [${email}](mailto:${email})`);
    if (phone) lines.push(`- 📞 Phone: ${phone}`);
    if (url) lines.push(`- 🌐 Website: [${url}](https://${url.replace(/^https?:\/\//, '')})`);

    return lines.length > 0 ? lines.join('\n') : null;
  } catch {
    return null;
  }
}

// ═══════════════════════════════════════════════════════════════
// TOOL QUERY BUILDER
// ═══════════════════════════════════════════════════════════════

/**
 * Builds the correct MCP tool call based on detected intent.
 * Every intent that can benefit from real store data gets a tool query.
 * resolveToolName() in chat.jsx will fuzzy-match to the actual MCP tool name.
 */
export function buildToolQuery(intent, entities) {
  const { orderId, budget, color, size, keywords } = entities;

  // ── Order tracking ────────────────────────────────────────────
  if (intent === 'order_tracking') {
    if (orderId) {
      return { toolName: 'get_order', args: { order_id: orderId } };
    }
    // No order ID yet — fetch the customer's recent orders list
    return { toolName: 'get_orders', args: {} };
  }

  // ── Product catalog search (product_search, budget, premium, discount) ─
  if (['product_search', 'budget', 'premium', 'discount'].includes(intent)) {
    let queryStr = [color, size, ...keywords.filter(k => k.length > 3).slice(0, 4)]
      .filter(Boolean).join(' ');

    if (intent === 'budget' && budget) {
      queryStr += ` under ${budget}`;
    } else if (intent === 'premium') {
      queryStr = `premium ${queryStr}`;
    } else if (intent === 'discount') {
      queryStr = queryStr ? `${queryStr} sale` : 'sale offer discount';
    }

    return { toolName: 'search_shop_catalog', args: { query: queryStr || 'products' } };
  }

  // ── Store policies (shipping, return, refund, cancel) ─────────
  if (['shipping', 'return', 'refund', 'cancel'].includes(intent)) {
    return { toolName: 'read_shop_policies', args: {} };
  }

  // ── Support / contact info ────────────────────────────────────
  if (['support', 'payment'].includes(intent)) {
    return { toolName: 'get_shop', args: {} };
  }

  return null; // greeting, thanks, cart — no tool call needed
}

// ═══════════════════════════════════════════════════════════════
// STREAMING SIMULATION
// ═══════════════════════════════════════════════════════════════

/**
 * Simulates word-by-word streaming of a response text
 * to maintain the existing SSE stream experience
 */
export async function streamText(text, onChunk) {
  const words = text.split(' ');
  for (let i = 0; i < words.length; i++) {
    const chunk = (i === 0 ? '' : ' ') + words[i];
    onChunk(chunk);
    // Small async yield to keep stream non-blocking
    if (i % 8 === 7) await new Promise(r => setTimeout(r, 1));
  }
}

export default { classifyIntent, generateResponse, buildToolQuery, streamText };
