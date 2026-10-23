const test = require("node:test");
const assert = require("node:assert/strict");

const {
  validateProduct,
  validateProductUpdate,
} = require("../models/product.validation");

const runMiddleware = (middleware, body) => {
  const req = { body };
  const res = {
    statusCode: 200,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.payload = payload;
      return this;
    },
  };
  let nextCalled = false;

  middleware(req, res, () => {
    nextCalled = true;
  });

  return { req, res, nextCalled };
};

test("product creation trims text and normalizes numeric strings", () => {
  const result = runMiddleware(validateProduct, {
    name: "  Keyboard  ",
    price: "12.50",
    description: "  Mechanical keyboard  ",
    category: "  Mobile  ",
    quantity: "3",
  });

  assert.equal(result.nextCalled, true);
  assert.deepEqual(result.req.body, {
    name: "Keyboard",
    brand: "",
    model: "",
    price: 12.5,
    description: "Mechanical keyboard",
    category: "Mobile",
    quantity: 3,
    image: "",
    imageSource: "",
  });
});

test("product creation accepts, trims and defaults brand and model", () => {
  const withBrand = runMiddleware(validateProduct, {
    name: "iPhone 16",
    brand: "  Apple  ",
    model: "  iPhone 16  ",
    price: 79900,
    description: "A flagship phone with a bright display.",
    category: "Mobile",
    quantity: 5,
  });

  assert.equal(withBrand.nextCalled, true);
  assert.equal(withBrand.req.body.brand, "Apple");
  assert.equal(withBrand.req.body.model, "iPhone 16");

  const withoutBrand = runMiddleware(validateProduct, {
    name: "Keyboard",
    price: 12.5,
    description: "Mechanical keyboard",
    category: "Laptop",
    quantity: 1,
  });

  assert.equal(withoutBrand.nextCalled, true);
  assert.equal(withoutBrand.req.body.brand, "");
  assert.equal(withoutBrand.req.body.model, "");
});

test("product update rejects an over-long brand or model", () => {
  for (const field of ["brand", "model"]) {
    const result = runMiddleware(validateProductUpdate, {
      [field]: "a".repeat(61),
    });

    assert.equal(result.nextCalled, false);
    assert.equal(result.res.statusCode, 400);
  }
});

test("product creation rejects coerced numeric types and unknown fields", () => {
  const result = runMiddleware(validateProduct, {
    name: "Keyboard",
    price: true,
    description: "Mechanical keyboard",
    category: "Mobile",
    quantity: [],
    admin: true,
  });

  assert.equal(result.nextCalled, false);
  assert.equal(result.res.statusCode, 400);
  assert.equal(result.res.payload.success, false);
  assert.equal(result.res.payload.errors.length, 3);
});

test("product update rejects empty and unknown-only payloads", () => {
  for (const body of [{}, { admin: true }]) {
    const result = runMiddleware(validateProductUpdate, body);
    assert.equal(result.nextCalled, false);
    assert.equal(result.res.statusCode, 400);
  }
});

test("product update permits valid partial updates", () => {
  const result = runMiddleware(validateProductUpdate, { quantity: "0" });

  assert.equal(result.nextCalled, true);
  assert.deepEqual(result.req.body, { quantity: 0 });
});
