/**
 * Product Filter Service
 * Pure utility functions for filtering and sorting products by price.
 * Has NO external dependencies — safe to import in tests without setting up a database.
 */

/**
 * Helper to extract numeric price from formatted price string like "INR 699.00" or "$ 49.99"
 * @param {Object} product - Formatted product data with price field
 * @returns {number} Numeric price value, or Infinity if unparseable
 */
export function parsePriceValue(product) {
  const priceStr = product.price || '';
  const match = priceStr.match(/[\d,.]+/);
  if (match) {
    return parseFloat(match[0].replace(/,/g, ''));
  }
  return Infinity;
}

/**
 * Filters and sorts products based on price criteria.
 * Used to post-process search_catalog results since the MCP tool
 * doesn't natively support price-based filtering.
 *
 * @param {Array} products - Array of formatted product data with price strings
 * @param {Object|null} filterOptions - Filter configuration
 * @param {string} [filterOptions.type] - 'budget', 'high_price', or null
 * @param {number} [filterOptions.budget] - Max price for budget filter
 * @returns {Array} Filtered and sorted products
 */
export function filterAndSortProducts(products, filterOptions) {
  if (!filterOptions || !products || products.length === 0) return products;

  if (filterOptions.type === 'budget' && filterOptions.budget) {
    const maxPrice = filterOptions.budget;
    // Filter: only products with price <= budget
    let filtered = products.filter(p => {
      const price = parsePriceValue(p);
      return price <= maxPrice;
    });
    // Sort: lowest price first
    filtered.sort((a, b) => parsePriceValue(a) - parsePriceValue(b));
    console.log(`[Price Filter] Budget \u20B9${maxPrice}: ${products.length} \u2192 ${filtered.length} products`);
    return filtered;
  }

  if (filterOptions.type === 'high_price') {
    // Sort: highest price first (Infinity will sort to the top for unparseable prices)
    let sorted = [...products];
    sorted.sort((a, b) => parsePriceValue(b) - parsePriceValue(a));
    console.log(`[Price Filter] High price: sorted ${sorted.length} products`);
    return sorted;
  }

  if (filterOptions.type === 'low_price') {
    // Sort: lowest price first (for "sasta/cheap" queries without a budget limit)
    let sorted = [...products];
    sorted.sort((a, b) => parsePriceValue(a) - parsePriceValue(b));
    console.log(`[Price Filter] Low price sort: sorted ${sorted.length} products`);
    return sorted;
  }

  return products;
}
