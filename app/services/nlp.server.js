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
 * Generates a smart, structured response based on intent + tool data
 */
export function generateResponse(intent, entities, toolData = null) {
  const { orderId, budget, color, size, keywords } = entities;

  switch (intent) {
    case 'greeting':
      return `👋 **Namaste!** Welcome to our store!\n\nMain aapki kaise madad kar sakta hoon? Aap kisi **product ke baare mein pooch sakte hain**, **order track** kar sakte hain, ya **support** le sakte hain.\n\n[Related: Show me trending products]\n[Related: Track my order]\n[Related: Are there any discounts?]`;

    case 'thanks':
      return `😊 **You're welcome!** Khushi hui aapki madad karke!\n\nKoi aur sawaal ho toh zaroor poochein. Main hamesha yahan hoon!\n\n[Related: Show me more products]\n[Related: Track my order]\n[Related: What are today's offers?]`;

    case 'order_tracking': {
      if (!toolData) {
        return `🔍 Aapka order track karne ke liye mujhe **Order ID** chahiye.\n\nKripya apna **Order ID ya Order Number** share karein (example: #1054).\n\n[Related: How long does delivery take?]\n[Related: What is your return policy?]\n[Related: Contact customer support]`;
      }
      return formatOrderResponse(toolData);
    }

    case 'refund':
      return `💰 **Refund Process — Step by Step:**\n\n- **Refund Timeline:** 5-7 business days after approval\n- **Process:** Refund is credited to your original payment method\n- **Status Check:** Share your Order ID to check refund status\n\n> ⚠️ Agar aapka order 7 din se zyada purana hai, toh exchange eligible ho sakta hai.\n\n📞 Support se contact karen: [support@store.com](mailto:support@store.com)\n\n[Related: Track my order]\n[Related: Start a return request]\n[Related: How long does refund take?]`;

    case 'return':
      return `📦 **Return Request Process:**\n\n1. **Check Eligibility:** Product delivery ke **7 din ke andar** return eligible hai\n2. **Condition:** Product unused, original packaging mein hona chahiye\n3. **Initiate:** Apna Order ID share karein return start karne ke liye\n\n> 💡 Exchange bhi possible hai agar size ya color change karna ho.\n\n[Related: Start my refund]\n[Related: Track my order]\n[Related: What is the return policy?]`;

    case 'cancel':
      return `❌ **Order Cancellation:**\n\n- Order **shipped hone se pehle** cancel ho sakta hai\n- **Cancel karne ke liye:** Apna Order ID share karein\n- Agar order already shipped hai, toh **return process** follow karein\n\n📌 Cancellation ke baad refund 5-7 din mein process hoga.\n\n[Related: Track my order status]\n[Related: Start a return instead]\n[Related: Check refund status]`;

    case 'shipping':
      return `🚚 **Shipping Information:**\n\n| Type | Delivery Time | Cost |\n|------|--------------|------|\n| Standard | 5-7 Business Days | FREE above ₹499 |\n| Express | 2-3 Business Days | ₹99 |\n| Same Day | Same Day | ₹149 (Select cities) |\n\n> 📍 **COD** (Cash on Delivery) available on all orders!\n\n[Related: Track my existing order]\n[Related: Are there any shipping offers?]\n[Related: What is the return policy?]`;

    case 'discount':
      return `🏷️ **Current Offers & Discounts:**\n\n- 🔥 **Sale On:** Use code **SAVE10** for 10% off\n- 🎉 **Free Shipping** on orders above ₹499\n- 💎 **VIP Members** get extra 15% off\n\n> 💡 Tip: Search for **"sale"** ya **"offer"** products dekhne ke liye poochein!\n\n[Related: Show me sale products]\n[Related: Best products under ₹1000]\n[Related: Premium collection dikhao]`;

    case 'payment':
      return `💳 **Payment Support:**\n\n**Accepted Payment Methods:**\n- UPI (Google Pay, PhonePe, Paytm)\n- Credit / Debit Cards (Visa, Mastercard, RuPay)\n- Net Banking\n- EMI (No Cost EMI available)\n- **COD** (Cash on Delivery)\n\n> ⚠️ Payment fail hone par **2-3 minutes wait** karein — amount automatically return hoga.\n\n[Related: Track my order]\n[Related: Contact support]\n[Related: Check refund status]`;

    case 'support':
      return `🛎️ **Customer Support:**\n\n**Hum aapki poori madad ke liye hain!**\n\n- 📧 Email: support@store.com\n- 📞 Phone: Available Mon-Sat, 10 AM - 7 PM\n- 💬 Chat: Main abhi available hoon!\n\n**Kya issue hai?** Neeche se select karein:\n\n[Related: My order hasn't arrived]\n[Related: I want to return a product]\n[Related: Payment issue help]`;

    case 'cart':
      return `🛒 **Smart Cart Engine:**\n\nAapke cart mein items wait kar rahe hain! Checkout complete karein aur payein:\n- ✨ **Extra 5% OFF** on prepaid orders\n- 🚚 **Free Express Shipping**\n\n> 💡 Tip: Checkout jaldi karein, kuch items out of stock ho sakte hain.\n\n[Related: Complete checkout now]\n[Related: Show me my cart]\n[Related: Are there any discount codes?]`;

    case 'budget': {
      const budgetText = budget ? `₹${budget.toLocaleString('en-IN')}` : 'aapke budget mein';
      const colorText = color ? ` **${color}** color mein` : '';
      const sizeText = size ? ` size **${size}**` : '';
      const kwText = keywords.filter(k => k.length > 3).slice(0, 3).join(', ');
      return `🔍 **Searching for${colorText}${sizeText} ${kwText || 'products'} under ${budgetText}...**\n\nMain aapke liye best value-for-money products dhundh raha hoon. Ek second...\n\n**🤖 Automation Engine Upsell:** Agar aap budget thoda badhate hain toh aapko premium durability wale products mil sakte hain.\n\n[Related: Show premium alternatives]\n[Related: Are there any discount codes?]\n[Related: Free shipping products dikhao]`;
    }

    case 'premium': {
      const kwText = keywords.filter(k => k.length > 3).slice(0, 3).join(', ');
      return `💎 **Premium ${kwText || 'Products'} Collection:**\n\nMain aapke liye **top-rated, high-quality** products dhundh raha hoon...\n\n- ✅ Trusted brands\n- ✅ Highest rated\n- ✅ Premium quality guarantee\n- ✅ Best sellers\n\n**🤖 Automation Engine VIP Offer:** Premium buyers ke liye humari special VIP shipping free hai.\n\n[Related: Compare two products]\n[Related: Budget alternatives bhi dikhao]\n[Related: What are the return policies?]`;
    }

    case 'product_search':
    default: {
      const colorText = color ? `**${color}** ` : '';
      const sizeText = size ? `size **${size}** ` : '';
      const kwText = keywords.filter(k => k.length > 3).slice(0, 3).join(' ');
      const budgetText = budget ? ` under **₹${budget.toLocaleString('en-IN')}**` : '';
      
      let crossSell = '';
      if (kwText.includes('shoe') || kwText.includes('sneaker')) {
        crossSell = '\n\n**🤖 Automation Engine Suggests:** Shoes ke saath humare premium **sports socks** zaroor check karein!';
      } else if (kwText.includes('phone') || kwText.includes('mobile')) {
        crossSell = '\n\n**🤖 Automation Engine Suggests:** Naye phone ke liye **screen protector aur case** add karna na bhoolein!';
      } else if (kwText.includes('laptop')) {
        crossSell = '\n\n**🤖 Automation Engine Suggests:** Laptop ke liye **cooling pad aur wireless mouse** best combo rahega!';
      } else {
        crossSell = '\n\n**🤖 Automation Engine Suggests:** In products par abhi limited time offer chal raha hai, jaldi check karein!';
      }

      return `🛍️ **Searching for ${colorText}${sizeText}${kwText || 'products'}${budgetText}...**\n\nMain aapke liye best matching products dhundh raha hoon! Ek moment...${crossSell}\n\n[Related: Filter by price range]\n[Related: Show trending products]\n[Related: Premium alternatives dikhao]`;
    }
  }
}

/**
 * Format order data from tool response into a readable message
 */
function formatOrderResponse(orderData) {
  try {
    const order = typeof orderData === 'string' ? JSON.parse(orderData) : orderData;
    const lines = ['📦 **Order Details:**\n'];

    if (order.id || order.name) lines.push(`- **Order:** ${order.name || '#' + order.id}`);
    if (order.financial_status) lines.push(`- **Payment:** ${order.financial_status.toUpperCase()}`);
    if (order.fulfillment_status) lines.push(`- **Fulfillment:** ${order.fulfillment_status || 'Unfulfilled'}`);

    if (order.fulfillments && order.fulfillments.length > 0) {
      const f = order.fulfillments[0];
      if (f.tracking_company) lines.push(`- **Courier:** ${f.tracking_company}`);
      if (f.tracking_number) lines.push(`- **Tracking #:** \`${f.tracking_number}\``);
      if (f.tracking_url) lines.push(`- [🔗 Track your package](${f.tracking_url})`);
    }

    if (order.shipping_address) {
      const a = order.shipping_address;
      lines.push(`- **Delivering to:** ${a.city}, ${a.province}`);
    }

    lines.push('\n[Related: What is the return policy?]');
    lines.push('[Related: I want to cancel this order]');
    lines.push('[Related: Contact support about this order]');

    return lines.join('\n');
  } catch {
    return `📦 **Order Found!**\n\nMain aapka order status check kar raha hoon. Kripya thoda intezaar karein.\n\n[Related: What is the expected delivery?]\n[Related: Contact support]\n[Related: Return policy kya hai?]`;
  }
}

// ═══════════════════════════════════════════════════════════════
// TOOL QUERY BUILDER
// ═══════════════════════════════════════════════════════════════

/**
 * Builds the correct tool name and arguments based on detected intent
 */
export function buildToolQuery(intent, entities) {
  const { orderId, budget, color, size, keywords } = entities;

  if (intent === 'order_tracking' && orderId) {
    return { toolName: 'get_order', args: { order_id: orderId } };
  }

  if (['product_search', 'budget', 'premium'].includes(intent)) {
    let queryStr = [
      color,
      size,
      ...keywords.filter(k => k.length > 3).slice(0, 4)
    ].filter(Boolean).join(' ');

    if (intent === 'budget' && budget) {
      queryStr += ` under ${budget}`;
    } else if (intent === 'premium') {
      queryStr = `premium ${queryStr}`;
    }

    return {
      toolName: 'search_shop_catalog',
      args: {
        query: queryStr || 'products'
      }
    };
  }

  return null; // No tool call needed for this intent
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
