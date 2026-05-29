/**
 * Integration tests for processProductSearchResult()
 *
 * Tests the full pipeline: mock MCP response → parse response → format products →
 * filter/sort → limit to maxProductsToDisplay.
 *
 * Run with: node --test app/services/tool.server.integration.test.js
 */
import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import { createToolService } from './tool.server.js';

let processProductSearchResult;

before(() => {
  const service = createToolService();
  processProductSearchResult = service.processProductSearchResult;
});

// ---------------------------------------------------------------------------
// Helper: build a mock MCP tool response
// ---------------------------------------------------------------------------
function mockMcpResponse(rawProducts) {
  return {
    content: [
      {
        text: JSON.stringify({ products: rawProducts }),
      },
    ],
  };
}

// ---------------------------------------------------------------------------
// Integration: full pipeline with no filters
// ---------------------------------------------------------------------------
describe('processProductSearchResult() – basic pipeline (no filter)', () => {
  it('formats products with correct fields', () => {
    const raw = [
      { title: 'Test Product', price: 'INR 499.00', image_url: 'https://example.com/img.jpg' },
    ];
    const result = processProductSearchResult(mockMcpResponse(raw));
    assert.strictEqual(result.length, 1);
    assert.strictEqual(result[0].title, 'Test Product');
    assert.strictEqual(result[0].price, 'INR 499.00');
    assert.strictEqual(result[0].image_url, 'https://example.com/img.jpg');
    assert.ok(result[0].id, 'should have an id');
    assert.ok(typeof result[0].id === 'string', 'id should be a string');
  });

  it('returns multiple products without filtering', () => {
    const raw = [
      { title: 'A', price: 'INR 100.00' },
      { title: 'B', price: 'INR 200.00' },
      { title: 'C', price: 'INR 300.00' },
    ];
    const result = processProductSearchResult(mockMcpResponse(raw));
    assert.strictEqual(result.length, 3);
  });

  it('handles product with minimal fields', () => {
    const raw = [{ id: 'gid://shopify/Product/123' }];
    const result = processProductSearchResult(mockMcpResponse(raw));
    assert.strictEqual(result.length, 1);
    assert.strictEqual(result[0].title, 'Product'); // default title
    assert.strictEqual(result[0].price, 'Price not available');
  });

  it('handles product with handle and builds URL', () => {
    const raw = [{ title: 'Blue Shoes', price: 'INR 999.00', handle: 'blue-shoes' }];
    const result = processProductSearchResult(mockMcpResponse(raw));
    assert.strictEqual(result[0].url, '/products/blue-shoes');
  });

  it('preserves all MCP response shape: top-level array', () => {
    const response = {
      content: [{ text: JSON.stringify([{ title: 'ArrayItem', price: 'INR 50.00' }]) }],
    };
    const result = processProductSearchResult(response);
    assert.strictEqual(result.length, 1);
    assert.strictEqual(result[0].title, 'ArrayItem');
  });

  it('preserves all MCP response shape: { nodes: [...] }', () => {
    const response = {
      content: [{ text: JSON.stringify({ nodes: [{ title: 'NodeItem', price: 'INR 75.00' }] }) }],
    };
    const result = processProductSearchResult(response);
    assert.strictEqual(result.length, 1);
    assert.strictEqual(result[0].title, 'NodeItem');
  });

  it('preserves all MCP response shape: { results: [...] }', () => {
    const response = {
      content: [{ text: JSON.stringify({ results: [{ title: 'ResultItem', price: 'INR 125.00' }] }) }],
    };
    const result = processProductSearchResult(response);
    assert.strictEqual(result.length, 1);
    assert.strictEqual(result[0].title, 'ResultItem');
  });

  it('preserves all MCP response shape: { products: { nodes: [...] } } (GraphQL connection)', () => {
    const response = {
      content: [{
        text: JSON.stringify({ products: { nodes: [{ title: 'GQL Product', price: 'INR 199.00' }] } }),
      }],
    };
    const result = processProductSearchResult(response);
    assert.strictEqual(result.length, 1);
    assert.strictEqual(result[0].title, 'GQL Product');
  });

  it('preserves all MCP response shape: { data: { products: { nodes: [...] } } } (deep GraphQL)', () => {
    const response = {
      content: [{
        text: JSON.stringify({
          data: { products: { nodes: [{ title: 'Deep GQL', price: 'INR 349.00' }] } },
        }),
      }],
    };
    const result = processProductSearchResult(response);
    assert.strictEqual(result.length, 1);
    assert.strictEqual(result[0].title, 'Deep GQL');
  });

  it('extracts URL from onlineStoreUrl field', () => {
    const raw = [{
      title: 'Online Item',
      price: 'INR 99.00',
      onlineStoreUrl: 'https://store.example.com/products/my-item',
    }];
    const result = processProductSearchResult(mockMcpResponse(raw));
    assert.strictEqual(result[0].url, 'https://store.example.com/products/my-item');
  });

  it('extracts variant_id from product variants', () => {
    const raw = [{
      title: 'With Variant',
      price: 'INR 299.00',
      variants: { nodes: [{ id: 'gid://shopify/ProductVariant/98765' }] },
    }];
    const result = processProductSearchResult(mockMcpResponse(raw));
    assert.strictEqual(result[0].variant_id, '98765');
  });
});

// ---------------------------------------------------------------------------
// Integration: budget filter
// ---------------------------------------------------------------------------
describe('processProductSearchResult() – budget filter', () => {
  const rawProducts = [
    { title: 'Cheap', price: 'INR 150.00' },
    { title: 'Mid', price: 'INR 500.00' },
    { title: 'Expensive', price: 'INR 2,000.00' },
    { title: 'Budget Pick', price: 'INR 299.00' },
    { title: 'Luxury', price: 'INR 9,999.00' },
  ];

  it('filters products ≤ budget and sorts ascending', () => {
    const result = processProductSearchResult(mockMcpResponse(rawProducts), {
      type: 'budget',
      budget: 500,
    });
    assert.strictEqual(result.length, 3);
    assert.strictEqual(result[0].title, 'Cheap');      // 150
    assert.strictEqual(result[1].title, 'Budget Pick'); // 299
    assert.strictEqual(result[2].title, 'Mid');         // 500
  });

  it('returns all products when budget covers everything', () => {
    const result = processProductSearchResult(mockMcpResponse(rawProducts), {
      type: 'budget',
      budget: 10000,
    });
    assert.strictEqual(result.length, 5);
    assert.strictEqual(result[0].price, 'INR 150.00');
    assert.strictEqual(result[4].price, 'INR 9,999.00');
  });

  it('returns empty when nothing fits the budget', () => {
    const result = processProductSearchResult(mockMcpResponse(rawProducts), {
      type: 'budget',
      budget: 100,
    });
    assert.strictEqual(result.length, 0);
  });

  it('does not crash when some products have no price', () => {
    const mixed = [
      { title: 'Has Price', price: 'INR 300.00' },
      { title: 'No Price', price: undefined },
      { title: 'Cheaper', price: 'INR 100.00' },
    ];
    // Products with unparseable price (Infinity) are excluded from budget filter
    const result = processProductSearchResult(mockMcpResponse(mixed), {
      type: 'budget',
      budget: 500,
    });
    assert.strictEqual(result.length, 2);
    assert.strictEqual(result[0].title, 'Cheaper');
    assert.strictEqual(result[1].title, 'Has Price');
  });
});

// ---------------------------------------------------------------------------
// Integration: high_price sort
// ---------------------------------------------------------------------------
describe('processProductSearchResult() – high_price sort', () => {
  const rawProducts = [
    { title: 'Cheap', price: 'INR 150.00' },
    { title: 'Mid', price: 'INR 500.00' },
    { title: 'Expensive', price: 'INR 2,000.00' },
    { title: 'Luxury', price: 'INR 9,999.00' },
  ];

  it('sorts products from highest to lowest price', () => {
    const result = processProductSearchResult(mockMcpResponse(rawProducts), {
      type: 'high_price',
    });
    assert.strictEqual(result.length, 4);
    assert.strictEqual(result[0].title, 'Luxury');     // 9999
    assert.strictEqual(result[1].title, 'Expensive');  // 2000
    assert.strictEqual(result[2].title, 'Mid');         // 500
    assert.strictEqual(result[3].title, 'Cheap');       // 150
  });
});

// ---------------------------------------------------------------------------
// Integration: edge cases
// ---------------------------------------------------------------------------
describe('processProductSearchResult() – edge cases', () => {
  it('returns empty array when response has no content', () => {
    const result = processProductSearchResult({ content: [] });
    assert.deepStrictEqual(result, []);
  });

  it('returns empty array when response content is empty string', () => {
    const response = { content: [{ text: '' }] };
    const result = processProductSearchResult(response);
    assert.deepStrictEqual(result, []);
  });

  it('returns empty array when response has no products key', () => {
    const response = { content: [{ text: JSON.stringify({ not_products: [] }) }] };
    const result = processProductSearchResult(response);
    assert.deepStrictEqual(result, []);
  });

  it('returns empty array when products array is empty', () => {
    const result = processProductSearchResult(mockMcpResponse([]));
    assert.deepStrictEqual(result, []);
  });

  it('handles invalid JSON gracefully (returns empty array)', () => {
    const response = { content: [{ text: 'not valid json {{{' }] };
    const result = processProductSearchResult(response);
    assert.deepStrictEqual(result, []);
  });

  it('handles null response gracefully', () => {
    const result = processProductSearchResult({ content: [{ text: JSON.stringify(null) }] });
    assert.deepStrictEqual(result, []);
  });
});
