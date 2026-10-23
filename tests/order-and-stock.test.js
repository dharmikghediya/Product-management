const test = require("node:test");
const assert = require("node:assert/strict");

const { calculateOrderSummary } = require("../controller/orderController");

test("calculateOrderSummary totals order items correctly", () => {
  const result = calculateOrderSummary([
    { productId: "64d4d5d4f7a1c3b8a8b2c1a1", productName: "Keyboard", quantity: 2, price: 30 },
    { productId: "64d4d5d4f7a1c3b8a8b2c1a2", productName: "Mouse", quantity: 3, price: 20 },
  ]);

  assert.equal(result.totalAmount, 120);
  assert.equal(result.items.length, 2);
  assert.equal(result.items[0].quantity, 2);
  assert.equal(result.items[1].quantity, 3);
});

test("calculateOrderSummary rejects invalid item quantities", () => {
  assert.throws(
    () => calculateOrderSummary([
      { productId: "64d4d5d4f7a1c3b8a8b2c1a1", productName: "Keyboard", quantity: 0, price: 30 },
    ]),
    /greater than zero/
  );
});
