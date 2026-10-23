const test = require("node:test");
const assert = require("node:assert/strict");
const {
  hasProductManagementAccess,
  loadProductAccessUser,
  requireProductManagement,
  restrictProductUpdateAccess,
} = require("../middleware/productAccess");

function responseRecorder() {
  return {
    statusCode: null,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
  };
}

test("Admins and explicitly permitted users can manage products", () => {
  assert.equal(hasProductManagementAccess({ role: "admin" }), true);
  assert.equal(hasProductManagementAccess({ role: "user", canManageProducts: true }), true);
  assert.equal(hasProductManagementAccess({ role: "staff" }), false);
  assert.equal(hasProductManagementAccess({ role: "user", canManageProducts: false }), false);
});

test("product-management middleware loads the current persisted permission", async () => {
  const user = { role: "user", canManageProducts: true };
  const userModel = {
    findById(id) {
      assert.equal(id, "user-123");
      return { select: async () => user };
    },
  };
  const req = { user: { sub: "user-123" } };
  const res = responseRecorder();
  let continued = false;

  await loadProductAccessUser(userModel)(req, res, () => {
    continued = true;
  });
  requireProductManagement(req, res, () => {
    continued = true;
  });

  assert.equal(req.productAccessUser, user);
  assert.equal(continued, true);
  assert.equal(res.statusCode, null);
});

test("unpermitted users cannot create or delete products", () => {
  const req = { productAccessUser: { role: "user", canManageProducts: false } };
  const res = responseRecorder();
  let continued = false;

  requireProductManagement(req, res, () => {
    continued = true;
  });

  assert.equal(continued, false);
  assert.equal(res.statusCode, 403);
  assert.match(res.body.message, /Admin must grant/i);
});

test("Staff can change stock only; granted product access allows full updates", () => {
  const res = responseRecorder();
  let stockUpdateContinued = false;
  restrictProductUpdateAccess(
    { productAccessUser: { role: "staff" }, body: { quantity: 4 } },
    res,
    () => {
      stockUpdateContinued = true;
    },
  );
  assert.equal(stockUpdateContinued, true);

  let productUpdateContinued = false;
  restrictProductUpdateAccess(
    {
      productAccessUser: { role: "user", canManageProducts: true },
      body: { name: "Updated product", price: 5 },
    },
    res,
    () => {
      productUpdateContinued = true;
    },
  );
  assert.equal(productUpdateContinued, true);

  let deniedUserContinued = false;
  restrictProductUpdateAccess(
    { productAccessUser: { role: "user" }, body: { name: "Updated product" } },
    res,
    () => {
      deniedUserContinued = true;
    },
  );
  assert.equal(deniedUserContinued, false);
  assert.equal(res.statusCode, 403);
});
