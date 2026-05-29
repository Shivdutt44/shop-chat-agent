/**
 * Unit tests for filterAndSortProducts() and parsePriceValue()
 * Uses Node.js built-in test runner (node --test)
 *
 * Run with: node --test app/services/tool.server.test.js
 * Or: npm run test:tool
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { filterAndSortProducts, parsePriceValue } from './product-filter.server.js';

// ---------------------------------------------------------------------------
// parsePriceValue
// ---------------------------------------------------------------------------
describe('parsePriceValue()', () => {
  it('parses a standard INR price string', () => {
    assert.strictEqual(parsePriceValue({ price: 'INR 699.00' }), 699);
  });

  it('parses a USD price string', () => {
    assert.strictEqual(parsePriceValue({ price: '$ 49.99' }), 49.99);
  });

  it('parses a comma-formatted Indian price (e.g. INR 1,299.00)', () => {
    assert.strictEqual(parsePriceValue({ price: 'INR 1,299.00' }), 1299);
  });

  it('parses a large comma-formatted price (e.g. INR 15,999.00)', () => {
    assert.strictEqual(parsePriceValue({ price: 'INR 15,999.00' }), 15999);
  });

  it('parses price without currency symbol', () => {
    assert.strictEqual(parsePriceValue({ price: '999.00' }), 999);
  });

  it('parses an integer price string', () => {
    assert.strictEqual(parsePriceValue({ price: '499' }), 499);
  });

  it('returns Infinity for missing price field', () => {
    assert.strictEqual(parsePriceValue({ price: undefined }), Infinity);
  });

  it('returns Infinity for empty price string', () => {
    assert.strictEqual(parsePriceValue({ price: '' }), Infinity);
  });

  it('returns Infinity for product with no price field', () => {
    assert.strictEqual(parsePriceValue({ title: 'Something' }), Infinity);
  });

  it('returns Infinity for "Price not available" string', () => {
    assert.strictEqual(parsePriceValue({ price: 'Price not available' }), Infinity);
  });

  it('parses price with only INR and no space (INR699.00)', () => {
    assert.strictEqual(parsePriceValue({ price: 'INR699.00' }), 699);
  });
});

// ---------------------------------------------------------------------------
// filterAndSortProducts – basic guards
// ---------------------------------------------------------------------------
describe('filterAndSortProducts() – edge guards', () => {
  it('returns the same array when filterOptions is null', () => {
    const products = [
      { title: 'A', price: 'INR 100.00' },
      { title: 'B', price: 'INR 200.00' },
    ];
    const result = filterAndSortProducts(products, null);
    assert.strictEqual(result, products); // same reference
  });

  it('returns the same array when filterOptions is undefined', () => {
    const products = [{ title: 'A', price: 'INR 50.00' }];
    const result = filterAndSortProducts(products, undefined);
    assert.strictEqual(result, products);
  });

  it('returns the same array when products is empty', () => {
    const result = filterAndSortProducts([], { type: 'budget', budget: 500 });
    assert.deepStrictEqual(result, []);
  });

  it('returns the same array when products is null', () => {
    assert.strictEqual(filterAndSortProducts(null, { type: 'budget' }), null);
  });
});

// ---------------------------------------------------------------------------
// filterAndSortProducts – budget type
// ---------------------------------------------------------------------------
describe('filterAndSortProducts() – budget filter', () => {
  const products = [
    { title: 'Cheap Item', price: 'INR 150.00' },
    { title: 'Mid Item', price: 'INR 500.00' },
    { title: 'Expensive Item', price: 'INR 2,000.00' },
    { title: 'Budget Item', price: 'INR 299.00' },
    { title: 'Luxury Item', price: 'INR 9,999.00' },
  ];

  it('returns only products <= budget and sorts ascending', () => {
    const result = filterAndSortProducts(products, {
      type: 'budget',
      budget: 500,
    });
    assert.strictEqual(result.length, 3);
    assert.strictEqual(result[0].title, 'Cheap Item');   // 150
    assert.strictEqual(result[1].title, 'Budget Item');  // 299
    assert.strictEqual(result[2].title, 'Mid Item');     // 500
  });

  it('returns all products when budget covers everything', () => {
    const result = filterAndSortProducts(products, {
      type: 'budget',
      budget: 10000,
    });
    assert.strictEqual(result.length, 5);
    // Should be sorted ascending
    assert.strictEqual(result[0].price, 'INR 150.00');
    assert.strictEqual(result[4].price, 'INR 9,999.00');
  });

  it('returns empty array when no product fits the budget', () => {
    const result = filterAndSortProducts(products, {
      type: 'budget',
      budget: 100,
    });
    assert.strictEqual(result.length, 0);
  });

  it('handles single product within budget', () => {
    const single = [{ title: 'Solo', price: 'INR 50.00' }];
    const result = filterAndSortProducts(single, {
      type: 'budget',
      budget: 100,
    });
    assert.strictEqual(result.length, 1);
    assert.strictEqual(result[0].title, 'Solo');
  });

  it('excludes products with unparseable prices', () => {
    const mixed = [
      { title: 'Good', price: 'INR 300.00' },
      { title: 'No Price', price: 'Price not available' },
      { title: 'Also Good', price: 'INR 100.00' },
    ];
    const result = filterAndSortProducts(mixed, {
      type: 'budget',
      budget: 500,
    });
    assert.strictEqual(result.length, 2);
    // Only the ones with valid prices should remain, sorted ascending
    assert.strictEqual(result[0].title, 'Also Good');
    assert.strictEqual(result[1].title, 'Good');
  });

  it('does not mutate the original array order', () => {
    const original = [...products];
    filterAndSortProducts(products, { type: 'budget', budget: 500 });
    // Original should still be in original order
    assert.strictEqual(original[0].title, 'Cheap Item');
    assert.strictEqual(original[1].title, 'Mid Item');
    assert.strictEqual(original[2].title, 'Expensive Item');
  });
});

// ---------------------------------------------------------------------------
// filterAndSortProducts – high_price type
// ---------------------------------------------------------------------------
describe('filterAndSortProducts() – high price sort', () => {
  const products = [
    { title: 'Cheap', price: 'INR 150.00' },
    { title: 'Mid', price: 'INR 500.00' },
    { title: 'Expensive', price: 'INR 2,000.00' },
    { title: 'Luxury', price: 'INR 9,999.00' },
  ];

  it('sorts products from highest to lowest price', () => {
    const result = filterAndSortProducts(products, {
      type: 'high_price',
    });
    assert.strictEqual(result.length, 4);
    assert.strictEqual(result[0].title, 'Luxury');     // 9999
    assert.strictEqual(result[1].title, 'Expensive');  // 2000
    assert.strictEqual(result[2].title, 'Mid');         // 500
    assert.strictEqual(result[3].title, 'Cheap');       // 150
  });

  it('works with a single product', () => {
    const single = [{ title: 'Only One', price: 'INR 799.00' }];
    const result = filterAndSortProducts(single, { type: 'high_price' });
    assert.strictEqual(result.length, 1);
    assert.strictEqual(result[0].title, 'Only One');
  });

  it('does not mutate the original array', () => {
    const original = [...products];
    filterAndSortProducts(products, { type: 'high_price' });
    assert.strictEqual(original[0].title, 'Cheap');
    assert.strictEqual(original[3].title, 'Luxury');
  });

  it('places products with unparseable prices first (Infinity sorts highest)', () => {
    const mixed = [
      { title: 'Cheap', price: 'INR 100.00' },
      { title: 'No Price', price: undefined },
      { title: 'Mid', price: 'INR 500.00' },
    ];
    const result = filterAndSortProducts(mixed, { type: 'high_price' });
    assert.strictEqual(result.length, 3);
    // Infinity is greater than any finite number, so it sorts to the top
    assert.strictEqual(result[0].title, 'No Price');
    assert.strictEqual(result[1].title, 'Mid');
    assert.strictEqual(result[2].title, 'Cheap');
  });
});
