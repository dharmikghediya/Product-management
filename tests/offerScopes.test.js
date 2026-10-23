const test = require("node:test");
const assert = require("node:assert/strict");
const {
  getOfferScopesForRole,
  getOffersForProduct,
  mergeOffersByScope,
  sanitizeOffers,
} = require("../services/productOfferService");

const mobileOffer = {
  title: "Mobile festival",
  description: "Cashback on mobiles",
  discountType: "percentage",
  value: 10,
  minQuantity: 1,
  category: "Mobile",
};

const watchOffer = {
  title: "Watch cashback",
  description: "Cashback on smartwatches",
  discountType: "fixed",
  value: 1000,
  minQuantity: 1,
  category: "Smartwatch",
};

test("each role owns the offer scopes of the categories it trades in", () => {
  assert.deepEqual(getOfferScopesForRole("admin"), ["Mobile", "Laptop", "all"]);
  assert.deepEqual(getOfferScopesForRole("vendor"), ["Smartwatch", "Earbuds", "Headphones", "all"]);
  assert.deepEqual(getOfferScopesForRole("staff"), [
    "Mobile",
    "Laptop",
    "Smartwatch",
    "Earbuds",
    "Headphones",
    "all",
  ]);
});

test("saving one category keeps the offers of the other categories", () => {
  const merged = mergeOffersByScope(
    [mobileOffer],
    [watchOffer],
    getOfferScopesForRole("vendor"),
  );

  assert.deepEqual(merged, [mobileOffer, watchOffer]);
});

test("saving a category replaces only the offers of that category", () => {
  const updated = { ...mobileOffer, value: 20 };
  const merged = mergeOffersByScope(
    [mobileOffer, watchOffer],
    [updated],
    getOfferScopesForRole("admin"),
  );

  assert.deepEqual(merged, [watchOffer, updated]);
});

test("removing the offers of a category clears that category only", () => {
  const merged = mergeOffersByScope(
    [mobileOffer, watchOffer],
    [],
    getOfferScopesForRole("admin"),
  );

  assert.deepEqual(merged, [watchOffer]);
});

test("submitted offers outside the role scopes are dropped", () => {
  const sanitized = sanitizeOffers(
    [mobileOffer, watchOffer, { ...watchOffer, title: "", value: 5 }],
    getOfferScopesForRole("vendor"),
  );

  assert.deepEqual(sanitized, [watchOffer]);
});

test("shoppers see the offer that matches their product category", () => {
  const shared = [mobileOffer, watchOffer];

  assert.deepEqual(getOffersForProduct({ category: "Mobile" }, shared), [
    { title: mobileOffer.title, description: mobileOffer.description, discountType: mobileOffer.discountType, value: mobileOffer.value, minQuantity: mobileOffer.minQuantity },
  ]);
  assert.deepEqual(getOffersForProduct({ category: "Smartwatch" }, shared), [
    { title: watchOffer.title, description: watchOffer.description, discountType: watchOffer.discountType, value: watchOffer.value, minQuantity: watchOffer.minQuantity },
  ]);
});

test("an offer for all categories applies to every product", () => {
  const shared = [{ ...mobileOffer, category: "all" }];

  assert.equal(getOffersForProduct({ category: "Mobile" }, shared).length, 1);
  assert.equal(getOffersForProduct({ category: "Smartwatch" }, shared).length, 1);
});
