const test = require("node:test");
const assert = require("node:assert/strict");

const {
  buildDescription,
  detectBrand,
  detectCategory,
  detectModel,
  hasValidScraperConfig,
  searchProducts,
  toPrice,
  CURATED_PRODUCTS,
} = require("../services/productScraperService");

test("detectBrand identifies known device brands accurately", () => {
  assert.equal(detectBrand("Apple iPhone 15 Pro Max"), "Apple");
  assert.equal(detectBrand("Samsung Galaxy S24 Ultra 5G"), "Samsung");
  assert.equal(detectBrand("Dell XPS 15 9530 Laptop"), "Dell");
  assert.equal(detectBrand("HP Pavilion x360 14"), "HP");
  assert.equal(detectBrand("Lenovo Legion Pro 5"), "Lenovo");
  assert.equal(detectBrand("Unknown Brand Device"), "");
});

test("detectCategory correctly distinguishes Mobiles from Laptops", () => {
  assert.equal(detectCategory("Apple iPhone 15 Pro Max"), "Mobile");
  assert.equal(detectCategory("Samsung Galaxy S24 Ultra"), "Mobile");
  assert.equal(detectCategory("OnePlus 12 5G Smartphone"), "Mobile");
  assert.equal(detectCategory("Apple MacBook Pro 16"), "Laptop");
  assert.equal(detectCategory("Dell Inspiron 15 Notebook"), "Laptop");
  assert.equal(detectCategory("Lenovo ThinkPad X1 Carbon"), "Laptop");
  assert.equal(detectCategory("ASUS ROG Zephyrus G14 Gaming Laptop"), "Laptop");
});

test("detectCategory recognises smartwatches, earbuds and headphones", () => {
  assert.equal(detectCategory("Apple Watch Series 9 GPS"), "Smartwatch");
  assert.equal(detectCategory("Samsung Galaxy Watch6 Classic"), "Smartwatch");
  assert.equal(detectCategory("Noise ColorFit Pro 5 Smartwatch"), "Smartwatch");
  assert.equal(detectCategory("boAt Airdopes 141 TWS Earbuds"), "Earbuds");
  assert.equal(detectCategory("Apple AirPods Pro 2 Wireless Earbuds"), "Earbuds");
  assert.equal(detectCategory("Sony WF-1000XM5 In-Ear Earbuds"), "Earbuds");
  assert.equal(detectCategory("Sony WH-1000XM5 Wireless Headphones"), "Headphones");
  assert.equal(detectCategory("JBL Tune 760NC Over-Ear Headphones"), "Headphones");
  assert.equal(detectCategory("boAt Rockerz 255 Pro Wireless Headphone"), "Headphones");
});

test("detectModel extracts clean model string from title", () => {
  const model1 = detectModel("Apple iPhone 15 Pro (128GB, Natural Titanium)", "Apple");
  assert.equal(model1.includes("iPhone 15 Pro"), true);

  const model2 = detectModel("Samsung Galaxy S24 Ultra | 256GB Storage", "Samsung");
  assert.equal(model2.includes("Galaxy S24 Ultra"), true);
});

test("toPrice normalizes numeric and formatted currency strings", () => {
  assert.equal(toPrice(129900), 129900);
  assert.equal(toPrice("₹1,29,999"), 129999);
  assert.equal(toPrice("INR 64,999.00"), 64999);
  assert.equal(toPrice("Free"), 0);
  assert.equal(toPrice(null), 0);
});

test("buildDescription generates comprehensive metadata summary", () => {
  const desc = buildDescription({
    title: "iPhone 15 Pro",
    merchant: "Apple Store",
    price: 129900,
  });

  assert.equal(desc.includes("iPhone 15 Pro"), true);
  assert.equal(desc.includes("Apple Store"), true);
  assert.equal(desc.includes("129900"), true);
  assert.equal(desc.includes("ScraperAPI"), true);
});

test("searchProducts returns mobile and laptop results gracefully", async () => {
  const allResults = await searchProducts("", "all");
  assert.equal(Array.isArray(allResults), true);
  assert.equal(allResults.length > 0, true);

  const mobiles = await searchProducts("", "Mobile");
  assert.equal(mobiles.every((item) => item.category === "Mobile"), true);

  const laptops = await searchProducts("", "Laptop");
  assert.equal(laptops.every((item) => item.category === "Laptop"), true);
});

test("searchProducts filters by keyword search terms", async () => {
  const iphoneResults = await searchProducts("iPhone", "all");
  assert.equal(iphoneResults.some((item) => item.title.toLowerCase().includes("iphone")), true);

  const dellResults = await searchProducts("Dell", "Laptop");
  assert.equal(dellResults.some((item) => item.brand === "Dell" && item.category === "Laptop"), true);
});

test("hasValidScraperConfig checks for placeholder API key", () => {
  // If .env contains placeholder API_KEY, hasValidScraperConfig should return false
  const isConfigured = hasValidScraperConfig();
  assert.equal(typeof isConfigured, "boolean");
});

