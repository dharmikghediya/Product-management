const axios = require("axios");
const cheerio = require("cheerio");
const { getCategorySearchTerm, PRODUCT_CATEGORIES } = require("../config/productCategories");

const REQUEST_TIMEOUT_MS = 30000;
const IMAGE_TIMEOUT_MS = 15000;
const MAX_IMAGE_BYTES = 2 * 1024 * 1024;
const SUPPORTED_IMAGE_TYPES = [
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
];
const DEFAULT_COUNTRY_CODE = "in";
const DEFAULT_TLD = "com";
const MAX_RESULTS = 20;
const MIN_DESCRIPTION_LENGTH = 10;
const MAX_DESCRIPTION_LENGTH = 2000;
const MAX_MODEL_LENGTH = 60;

const redactApiKey = (url) => {
  try {
    const safeUrl = new URL(url);
    if (safeUrl.searchParams.has("api_key")) safeUrl.searchParams.set("api_key", "[REDACTED]");
    return safeUrl.toString();
  } catch {
    return "[invalid URL]";
  }
};

async function fetchScraperData(url) {
  try {
    const response = await axios.get(url, {
      timeout: REQUEST_TIMEOUT_MS,
      maxContentLength: 5 * 1024 * 1024,
      headers: {
        "User-Agent": "Mozilla/5.0 StockroomProductManagement/1.0",
        Accept: "text/html,application/json,*/*",
      },
    });

    return response.data;
  } catch (error) {
    console.error("Scraper request failed:", {
      message: error.message,
      code: error.code,
      url: redactApiKey(error.config?.url || url),
      status: error.response?.status,
    });

    throw error;
  }
}

const getScraperRequestMessage = (error) => {
  const status = error.response?.status;
  if (status === 401 || status === 403) {
    return "ScraperAPI rejected the request. Check the API key and plan access.";
  }
  if (status === 429) {
    return "ScraperAPI request limit reached. Check your plan or try again later.";
  }
  if (status) {
    return `ScraperAPI returned HTTP ${status}. Check endpoint access and try again.`;
  }
  if (["ECONNABORTED", "ETIMEDOUT"].includes(error.code)) {
    return "ScraperAPI request timed out. Please try again.";
  }
  return `Could not connect to ScraperAPI${error.code ? ` (${error.code})` : ""}. Check your network and try again.`;
};

const BRAND_NAMES = [
  "Apple",
  "Samsung",
  "Google",
  "OnePlus",
  "Xiaomi",
  "Redmi",
  "Poco",
  "Realme",
  "Oppo",
  "Vivo",
  "iQOO",
  "Motorola",
  "Nothing",
  "Infinix",
  "Tecno",
  "Honor",
  "Huawei",
  "Nokia",
  "Sony",
  "ASUS",
  "Acer",
  "Dell",
  "HP",
  "Lenovo",
  "Microsoft",
  "MSI",
  "Toshiba",
  "Fujitsu",
  "Gigabyte",
  "Razer",
  "Alienware",
  "LG",
];

const LAPTOP_KEYWORDS = [
  "laptop",
  "notebook",
  "macbook",
  "ultrabook",
  "chromebook",
  "thinkpad",
  "ideapad",
  "vivobook",
  "zenbook",
  "inspiron",
  "latitude",
  "pavilion",
  "envy x360",
  "victus",
  "probook",
  "aspire",
  "swift go",
  "predator",
  "nitro",
  "surface laptop",
  "surface pro",
  "zephyrus",
  "tuf gaming",
  "katana",
  "prestige",
  "legion",
  "loq",
  "xps",
  "gram",
  "zenbook",
];

const SMARTWATCH_KEYWORDS = [
  "smartwatch",
  "smart watch",
  "smart-watch",
  "smart band",
  "smartband",
  "fitness band",
  "fitness tracker",
  "wearable",
  "watch",
  "fitbit",
  "garmin",
  "amazfit",
  "firebolt",
];

const EARBUDS_KEYWORDS = [
  "earbuds",
  "ear buds",
  "ear-buds",
  "earbud",
  "earphone",
  "earphones",
  "in-ear",
  "in ear",
  "airdopes",
  "tws",
  "true wireless",
  "airpods",
  "buds",
];

const HEADPHONES_KEYWORDS = [
  "headphone",
  "headphones",
  "head phones",
  "over-ear",
  "over ear",
  "on-ear",
  "on ear",
  "headset",
  "rockerz",
  "anc headset",
  "gaming headset",
  "studio headphones",
];

const firstString = (...values) => {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
};

const toPrice = (value) => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.max(0, Math.round(value));
  }

  const digits = String(value ?? "").replace(/[^0-9.]/g, "");
  if (!digits) return 0;

  const parsed = Number.parseFloat(digits);
  return Number.isFinite(parsed) ? Math.max(0, Math.round(parsed)) : 0;
};

const detectBrand = (title) => {
  const haystack = title.toLowerCase();
  const match = BRAND_NAMES.find((brand) =>
    haystack.includes(brand.toLowerCase()),
  );
  return match || "";
};

const detectModel = (title, brand) => {
  let model = title;

  if (brand) {
    const brandIndex = model.toLowerCase().indexOf(brand.toLowerCase());
    if (brandIndex >= 0) {
      model = model.slice(brandIndex + brand.length);
    }
  }

  model = model.split(/[(,|]/)[0];
  model = model.split(/\s[–-]\s/)[0];
  return model.trim().slice(0, MAX_MODEL_LENGTH);
};

const hasKeyword = (haystack, keywords) =>
  keywords.some((keyword) => haystack.includes(keyword));

const detectCategory = (title) => {
  const haystack = title.toLowerCase();

  // Earbuds and headphones are checked before smartwatches because a watch
  // listing often mentions a paired earbud or headphone accessory.
  if (hasKeyword(haystack, EARBUDS_KEYWORDS)) return "Earbuds";
  if (hasKeyword(haystack, HEADPHONES_KEYWORDS)) return "Headphones";
  if (hasKeyword(haystack, SMARTWATCH_KEYWORDS)) return "Smartwatch";
  if (hasKeyword(haystack, LAPTOP_KEYWORDS)) return "Laptop";
  return "Mobile";
};

// Keeps a scraped result when it belongs to the requested category, either
// because the title names the category or because the title carries one of
// that category's keywords.
const matchesCategory = (item, category) => {
  if (category === "all") return true;
  if (item?.category === category) return true;

  const haystack = String(item?.title || "").toLowerCase();
  const keywordsByCategory = {
    Mobile: ["mobile", "mobile phone", "smartphone"],
    Laptop: LAPTOP_KEYWORDS,
    Smartwatch: SMARTWATCH_KEYWORDS,
    Earbuds: EARBUDS_KEYWORDS,
    Headphones: HEADPHONES_KEYWORDS,
  };

  return hasKeyword(haystack, keywordsByCategory[category] || []);
};

const extractItems = (data) => {
  const candidates = [
    data?.shopping_results,
    data?.results,
    data?.organic_results,
    data?.items,
    data?.data,
    Array.isArray(data) ? data : null,
  ];
  const list = candidates.find((candidate) => Array.isArray(candidate));
  return list || [];
};

const CURATED_PRODUCTS = [
  {
    title: "Apple iPhone 15 Pro (128 GB, Natural Titanium)",
    brand: "Apple",
    model: "iPhone 15 Pro",
    category: "Mobile",
    price: 129900,
    merchant: "Apple Store",
    image:
      "https://images.unsplash.com/photo-1695048133142-1a20484d2569?auto=format&fit=crop&w=800&q=80",
    sourceUrl: "https://www.apple.com/in/shop/buy-iphone/iphone-15-pro",
    description:
      "Apple iPhone 15 Pro (128 GB, Natural Titanium) | Display: 6.1-inch Super Retina XDR OLED, 2556×1179 px, 460 ppi, 120 Hz ProMotion | Processor: Apple A17 Pro chip (3nm), 6-core CPU, 6-core GPU, 16-core Neural Engine | RAM: 8 GB LPDDR5 | Storage: 128 GB NVMe | Rear Camera: 48 MP Main (f/1.78) + 12 MP Ultra-Wide (f/2.2) + 12 MP 3× Telephoto (f/2.8) | Front Camera: 12 MP TrueDepth | Battery: 3274 mAh, 27W fast charging, MagSafe 15W wireless | OS: iOS 17 | SIM: Nano-SIM + eSIM | Connectivity: 5G, Wi-Fi 6E, Bluetooth 5.3, USB-C (USB 3) | Titanium frame, Ceramic Shield front | Weight: 187 g | Sold by Apple Store | Listed at INR 129900",
  },
  {
    title: "Samsung Galaxy S24 Ultra 5G (256 GB, Titanium Gray)",
    brand: "Samsung",
    model: "Galaxy S24 Ultra",
    category: "Mobile",
    price: 129999,
    merchant: "Samsung India",
    image:
      "https://images.unsplash.com/photo-1610945415295-d9bbf067e59c?auto=format&fit=crop&w=800&q=80",
    sourceUrl: "https://www.samsung.com/in/smartphones/galaxy-s24-ultra/",
    description:
      "Samsung Galaxy S24 Ultra 5G (256 GB, Titanium Gray) | Display: 6.8-inch Dynamic AMOLED 2X, 3088×1440 px (QHD+), 505 ppi, 1–120 Hz adaptive | Processor: Snapdragon 8 Gen 3 (4nm) | RAM: 12 GB LPDDR5X | Storage: 256 GB UFS 4.0 | Rear Camera: 200 MP Main (f/1.7) + 12 MP Ultra-Wide + 10 MP 3× Telephoto + 50 MP 5× Telephoto | Front Camera: 12 MP | Battery: 5000 mAh, 45W fast charging, 15W wireless | S Pen built-in | OS: Android 14, One UI 6.1 | SIM: Dual SIM (Nano+eSIM) | Connectivity: 5G, Wi-Fi 7, Bluetooth 5.3, USB-C 3.2 | IP68 water resistance | Weight: 232 g | Sold by Samsung India | Listed at INR 129999",
  },
  {
    title: "OnePlus 12 5G (16 GB RAM, 512 GB, Silky Black)",
    brand: "OnePlus",
    model: "OnePlus 12",
    category: "Mobile",
    price: 69999,
    merchant: "OnePlus Store",
    image:
      "https://images.unsplash.com/photo-1598327105666-5b89351aff97?auto=format&fit=crop&w=800&q=80",
    sourceUrl: "https://www.oneplus.in/12",
    description:
      "OnePlus 12 5G (16 GB RAM, 512 GB, Silky Black) | Display: 6.82-inch LTPO AMOLED, 3168×1440 px, 510 ppi, 1–120 Hz ProXDR | Processor: Snapdragon 8 Gen 3 (4nm) | RAM: 16 GB LPDDR5X | Storage: 512 GB UFS 4.0 | Rear Camera: 50 MP Hasselblad Main (f/1.6) + 48 MP Ultra-Wide (f/2.2) + 64 MP 3× Periscope Telephoto (f/2.6) | Front Camera: 32 MP | Battery: 5400 mAh, 100W SUPERVOOC, 50W AirVOOC wireless | OS: OxygenOS 14 (Android 14) | SIM: Dual Nano-SIM | Connectivity: 5G, Wi-Fi 7, Bluetooth 5.4, USB-C 3.2 | Corning Gorilla Glass Victus 2 | IP65 resistance | Weight: 220 g | Sold by OnePlus Store | Listed at INR 69999",
  },
  {
    title: "Google Pixel 8 Pro (128 GB, Obsidian)",
    brand: "Google",
    model: "Pixel 8 Pro",
    category: "Mobile",
    price: 89999,
    merchant: "Google Store",
    image:
      "https://images.unsplash.com/photo-1592750475338-74b7b21085ab?auto=format&fit=crop&w=800&q=80",
    sourceUrl: "https://store.google.com/in/product/pixel_8_pro",
    description:
      "Google Pixel 8 Pro (128 GB, Obsidian) | Display: 6.7-inch LTPO OLED, 2992×1344 px, 489 ppi, 1–120 Hz LTPO | Processor: Google Tensor G3 (4nm), Titan M2 security chip | RAM: 12 GB LPDDR5 | Storage: 128 GB UFS 3.1 | Rear Camera: 50 MP Main (f/1.68) + 48 MP Ultra-Wide (f/1.95) + 48 MP 5× Periscope Telephoto (f/2.8) | Front Camera: 10.5 MP | Battery: 5050 mAh, 30W fast charging, 23W Pixel wireless | OS: Android 14, 7 years guaranteed OS updates | Temperature sensor | IP68 water resistance | SIM: Dual nano-SIM + eSIM | Connectivity: 5G, Wi-Fi 7, Bluetooth 5.3, USB-C 3.2 | Weight: 213 g | Sold by Google Store | Listed at INR 89999",
  },
  {
    title: "Xiaomi 14 Pro 5G (12 GB RAM, 512 GB Storage)",
    brand: "Xiaomi",
    model: "14 Pro",
    category: "Mobile",
    price: 64999,
    merchant: "Mi Store",
    image:
      "https://images.unsplash.com/photo-1580910051074-3eb694886505?auto=format&fit=crop&w=800&q=80",
    sourceUrl: "https://www.mi.com/in/product/xiaomi-14",
    description:
      "Xiaomi 14 Pro 5G (12 GB RAM, 512 GB) | Display: 6.73-inch LTPO AMOLED, 3200×1440 px (QHD+), 522 ppi, 1–120 Hz adaptive | Processor: Snapdragon 8 Gen 3 (4nm) | RAM: 12 GB LPDDR5X | Storage: 512 GB UFS 4.0 | Rear Camera: 50 MP Leica Summilux Main (f/1.42) + 50 MP Ultra-Wide (f/2.2) + 50 MP 5× Periscope Telephoto (f/2.5) | Front Camera: 32 MP | Battery: 4880 mAh, 120W HyperCharge, 50W wireless, 10W reverse wireless | OS: MIUI 14 (Android 14) | SIM: Dual Nano-SIM | Connectivity: 5G, Wi-Fi 7, Bluetooth 5.4, USB-C 2.0 | IP68 water resistance | Weight: 223 g | Sold by Mi Store | Listed at INR 64999",
  },
  {
    title:
      "Apple MacBook Pro 14 (M3 Pro chip, 18GB Memory, 512GB SSD, Space Black)",
    brand: "Apple",
    model: "MacBook Pro 14 M3 Pro",
    category: "Laptop",
    price: 199900,
    merchant: "Apple Store",
    image:
      "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=800&q=80",
    sourceUrl: "https://www.apple.com/in/shop/buy-mac/macbook-pro/14-inch",
    description:
      "Apple MacBook Pro 14 (M3 Pro, Space Black) | Display: 14.2-inch Liquid Retina XDR, 3024×1964 px, 254 ppi, up to 120 Hz ProMotion, 1600 nits peak | Processor: Apple M3 Pro chip — 11-core CPU (5 performance + 6 efficiency), 14-core GPU, 16-core Neural Engine | RAM: 18 GB unified LPDDR5 | Storage: 512 GB Apple SSD | Battery: 70 Wh, up to 18 hours web browsing | Ports: 3× Thunderbolt 4, HDMI 2.1, SDXC, MagSafe 3, 3.5 mm headphone jack | Connectivity: Wi-Fi 6E, Bluetooth 5.3 | Camera: 12 MP Center Stage | Weight: 1.61 kg | OS: macOS Sonoma | Keyboard: Magic Keyboard with Touch ID | Sold by Apple Store | Listed at INR 199900",
  },
  {
    title:
      "Dell XPS 15 9530 (13th Gen Intel Core i7, 16GB RAM, 1TB SSD, RTX 4050)",
    brand: "Dell",
    model: "XPS 15 9530",
    category: "Laptop",
    price: 174990,
    merchant: "Dell Technologies",
    image:
      "https://images.unsplash.com/photo-1593642632823-8f785ba67e45?auto=format&fit=crop&w=800&q=80",
    sourceUrl:
      "https://www.dell.com/en-in/shop/laptops-2-in-1-pcs/xps-15-laptop/spd/xps-15-9530-laptop",
    description:
      "Dell XPS 15 9530 | Display: 15.6-inch InfinityEdge OLED, 3456×2160 px (3.5K), 60 Hz, 400 nits, 100% DCI-P3 | Processor: Intel Core i7-13700H (13th Gen), 14 cores (6P+8E), up to 5.0 GHz | RAM: 16 GB DDR5 4800 MHz | Storage: 1 TB NVMe PCIe 4.0 SSD | GPU: NVIDIA GeForce RTX 4050 6 GB GDDR6 | Battery: 86 Wh, up to 13 hours | Ports: 2× Thunderbolt 4, USB-A 3.2, SD card, 3.5 mm audio | Connectivity: Wi-Fi 6E (Killer), Bluetooth 5.3 | Camera: 720p HD webcam | Keyboard: Backlit | Fingerprint reader | Weight: 1.86 kg | OS: Windows 11 Home | Sold by Dell Technologies | Listed at INR 174990",
  },
  {
    title:
      "HP Pavilion x360 2-in-1 Touchscreen Laptop (13th Gen Core i5, 16GB, 512GB SSD)",
    brand: "HP",
    model: "Pavilion x360",
    category: "Laptop",
    price: 74990,
    merchant: "HP World",
    image:
      "https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?auto=format&fit=crop&w=800&q=80",
    sourceUrl: "https://www.hp.com/in-en/shop/hp-pavilion-x360-laptop-14",
    description:
      "HP Pavilion x360 2-in-1 (14-inch Touchscreen) | Display: 14-inch FHD IPS Touch, 1920×1080 px, 250 nits, 45% NTSC, 360° convertible | Processor: Intel Core i5-1335U (13th Gen), 10 cores, up to 4.6 GHz | RAM: 16 GB DDR4 3200 MHz | Storage: 512 GB PCIe NVMe SSD | GPU: Intel Iris Xe integrated | Battery: 43 Wh, up to 8 hours | Ports: USB-C, 2× USB-A, HDMI, SD card, 3.5 mm | Connectivity: Wi-Fi 6, Bluetooth 5.3 | HP True Vision 720p webcam with privacy shutter | Pen: HP Active Stylus included | Weight: 1.58 kg | OS: Windows 11 Home | Sold by HP World | Listed at INR 74990",
  },
  {
    title:
      "Lenovo Legion Pro 5 Gen 8 (AMD Ryzen 7, 16GB RAM, 1TB SSD, RTX 4060 8GB)",
    brand: "Lenovo",
    model: "Legion Pro 5",
    category: "Laptop",
    price: 139990,
    merchant: "Lenovo India",
    image:
      "https://images.unsplash.com/photo-1603302576837-37561b2e2302?auto=format&fit=crop&w=800&q=80",
    sourceUrl:
      "https://www.lenovo.com/in/en/p/laptops/legion-laptops/legion-pro-series/legion-pro-5-gen-8-(16-inch-amd)/len101g0025",
    description:
      "Lenovo Legion Pro 5 Gen 8 (Gaming Laptop) | Display: 16-inch IPS 2560×1600 px (WQXGA), 165 Hz, 300 nits, 100% sRGB, G-Sync | Processor: AMD Ryzen 7 7745HX (Zen 4), 8 cores/16 threads, up to 5.1 GHz | RAM: 16 GB DDR5 5200 MHz (2× 8 GB) | Storage: 1 TB PCIe Gen 4 NVMe SSD | GPU: NVIDIA GeForce RTX 4060 8 GB GDDR6 | Battery: 80 Wh, up to 6 hours | Ports: 2× Thunderbolt 4, 3× USB-A, HDMI 2.1, Ethernet (RJ-45), 3.5 mm | Connectivity: Wi-Fi 6E, Bluetooth 5.1 | Cooling: Legion Coldfront 5.0 with dual-fan | Per-key RGB keyboard | Weight: 2.4 kg | OS: Windows 11 Home | Sold by Lenovo India | Listed at INR 139990",
  },
  {
    title:
      "ASUS ROG Zephyrus G14 (AMD Ryzen 9, 16GB DDR5, 1TB SSD, RTX 4060 OLED 120Hz)",
    brand: "ASUS",
    model: "ROG Zephyrus G14",
    category: "Laptop",
    price: 164990,
    merchant: "ASUS ROG",
    image:
      "https://images.unsplash.com/photo-1496181133206-80ce9b88a853?auto=format&fit=crop&w=800&q=80",
    sourceUrl:
      "https://rog.asus.com/in/laptops/rog-zephyrus/rog-zephyrus-g14-2024/",
    description:
      "ASUS ROG Zephyrus G14 2024 (Gaming Laptop) | Display: 14-inch OLED 2880×1800 px (2.8K), 120 Hz, 0.2 ms GTG, 500 nits (typ), 100% DCI-P3, Dolby Vision | Processor: AMD Ryzen 9 8945HS (4nm Zen 4), 8 cores/16 threads, up to 5.2 GHz | RAM: 16 GB DDR5 7500 MHz on-board | Storage: 1 TB PCIe 4.0 NVMe SSD | GPU: NVIDIA GeForce RTX 4060 8 GB GDDR6 | Battery: 73 Wh, up to 10 hours | Ports: USB-C (Thunderbolt 4), USB-C (USB 3.2), 2× USB-A 3.2, HDMI 2.1, 3.5 mm | Connectivity: Wi-Fi 6E, Bluetooth 5.3 | AniMe Matrix LED on lid (optional) | Weight: 1.65 kg | OS: Windows 11 Home | Sold by ASUS ROG | Listed at INR 164990",
  },
  {
    title: "Apple Watch Series 9 GPS 45mm",
    brand: "Apple",
    model: "Watch Series 9",
    category: "Smartwatch",
    price: 41900,
    merchant: "Apple Store",
    image: "https://images.unsplash.com/photo-1434493789847-2f02dc6ca35d?auto=format&fit=crop&w=800&q=80",
    sourceUrl: "https://www.apple.com/in/shop/buy-watch/apple-watch",
    description: "Apple Watch Series 9 GPS | Display: 45mm Always-On Retina LTPO OLED | Processor: Apple S9 SiP | Battery: up to 18 hours | OS: watchOS 10 | Sold by Apple Store | Listed at INR 41900",
  },
  {
    title: "Samsung Galaxy Buds3 Pro",
    brand: "Samsung",
    model: "Galaxy Buds3 Pro",
    category: "Earbuds",
    price: 19999,
    merchant: "Samsung India",
    image: "https://images.unsplash.com/photo-1606220588913-b3aacb4d2f37?auto=format&fit=crop&w=800&q=80",
    sourceUrl: "https://www.samsung.com/in/audio-sound/galaxy-buds/",
    description: "Samsung Galaxy Buds3 Pro | Driver: 10.5mm | Battery: up to 30 hours with case | Sold by Samsung India | Listed at INR 19999",
  },
  {
    title: "Sony WH-1000XM5 Wireless Headphones",
    brand: "Sony",
    model: "WH-1000XM5",
    category: "Headphones",
    price: 29990,
    merchant: "Sony India",
    image: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=800&q=80",
    sourceUrl: "https://www.sony.co.in/headphones",
    description: "Sony WH-1000XM5 Wireless Headphones | Battery: up to 30 hours | Sold by Sony India | Listed at INR 29990",
  },
];

const hasValidScraperConfig = () =>
  Boolean(process.env.SCRAPER_API_KEY_VALUE?.trim());

const buildScraperUrl = (serchQuery, marketplace = "amazon") => {
  const apiKey = process.env.SCRAPER_API_KEY_VALUE?.trim();

  if (!apiKey) {
    
    throw new Error("SCRAPER_API_KEY_VALUE is missing from .env");
  }

  const countryCode = process.env.SCRAPER_COUNTRY_CODE || "in";

  const tld = process.env.SCRAPER_TLD || "in";

  if (marketplace === "amazon") {
    const url = new URL("https://api.scraperapi.com/structured/amazon/search");

    url.searchParams.set("api_key", apiKey);
    url.searchParams.set("query", serchQuery);
    url.searchParams.set("country_code", countryCode);
    url.searchParams.set("tld", tld);

    return url.toString();
  }

  if (marketplace === "flipkart") {
    const targetUrl = new URL("https://www.flipkart.com/search");

    targetUrl.searchParams.set("q", serchQuery);

    const scraperUrl = new URL("https://api.scraperapi.com/");
    scraperUrl.searchParams.set("api_key", apiKey);
    scraperUrl.searchParams.set("url", targetUrl.toString());

    return scraperUrl.toString();
  }

  throw new Error("Unsupported marketplace");
};



const extractFlipkartItems = (html) => {
  const $ = cheerio.load(html);
  const items = [];

  $("[data-id]").each((index, element) => {
    const card = $(element);

    const link = card.find("a[href]").first();
    const image = card.find("img").first();

    const title = firstString(
      card.find(".KzDlHZ").text(),
      card.find(".wjcEIp").text(),
      image.attr("alt"),
      link.attr("title"),
    );

    const priceText = firstString(
      card.find(".Nx9bqj").first().text(),
      card.find("[class*='price']").first().text(),
    );

    let href = link.attr("href") || "";

    if (!title || !href) return;

    // Accept only product links on the expected marketplace.
    if (!href.startsWith("/")) return;

    const sourceUrl = new URL(href, "https://www.flipkart.com").toString();

    if (!sourceUrl.startsWith("https://www.flipkart.com/")) {
      return;
    }

    const imageUrl = image.attr("src") || "";

    items.push({
      title,
      price: toPrice(priceText),
      image: imageUrl.startsWith("https://") ? imageUrl : "",
      sourceUrl,
      merchant: "Flipkart",
    });
  });

  return items;
};

const mapItem = (item, index) => {
  const title = firstString(item?.title, item?.name);
  if (!title) return null;

  const brand = detectBrand(title);
  const image = firstString(
    item?.thumbnail,
    item?.thumbnail_url,
    item?.image,
    item?.image_url,
    item?.imageUrl,
  );

  return {
    id: `scraped-${index}`,
    title: title.slice(0, 200),
    brand,
    model: detectModel(title, brand),
    category: detectCategory(title),
    price: toPrice(
      item?.extracted_price ??
        item?.price ??
        item?.price_raw ??
        item?.priceValue,
    ),
    merchant: firstString(
      item?.source,
      item?.merchant,
      item?.store,
      item?.seller,
    ),
    image: image.startsWith("https://") ? image : "",
    sourceUrl: firstString(
      item?.sourceUrl,
      item?.link,
      item?.product_link,
      item?.url,
    ),
  };
};


const searchProducts = async (
  searchQuery = "",
  category = "all",
  marketplace = "amazon",
  allowedCategories = PRODUCT_CATEGORIES,
) => {
  const trimmedQuery = String(searchQuery || "").trim();
  const normalizedMarketplace = String(marketplace || "amazon").toLowerCase();

  if (trimmedQuery.length === 1) {
    const error = new Error(
      "Please enter at least 2 characters to search.",
    );
    error.statusCode = 400;
    throw error;
  }

  if (!["amazon", "flipkart"].includes(normalizedMarketplace)) {
    throw new Error("Marketplace must be amazon or flipkart.");
  }

  if (!hasValidScraperConfig()) {
    return CURATED_PRODUCTS
      .filter((item) => allowedCategories.includes(item.category))
      .filter((item) => matchesCategory(item, category))
      .filter((item) => {
        if (!trimmedQuery) return true;
        const haystack = `${item.title} ${item.brand} ${item.model}`.toLowerCase();
        return haystack.includes(trimmedQuery.toLowerCase());
      })
      .map((item, index) => ({
        ...item,
        id: `curated-${index}`,
        source: item.source || "curated",
      }))
      .slice(0, MAX_RESULTS);
  }

  // Use a default query when browsing without search text.
  const queryToSearch = trimmedQuery || getCategorySearchTerm(category, allowedCategories);

  const url = buildScraperUrl(queryToSearch, normalizedMarketplace);

  let scraperData;
  try {
    scraperData = await fetchScraperData(url);
  } catch (error) {
    const requestError = new Error(getScraperRequestMessage(error));
    requestError.statusCode = error.response?.status ? 502 : 503;
    throw requestError;
  }

  let items = [];

  if (normalizedMarketplace === "amazon") {
    items = extractItems(scraperData);
  } else {
    const html = typeof scraperData === "string" ? scraperData : "";

    if (!html) {
      throw new Error(
        "Flipkart did not return HTML. Check the ScraperAPI response.",
      );
    }

    items = extractFlipkartItems(html);
  }

  const mappedItems = items
    .map((item, index) => {
      const mapped = mapItem(item, index);
      if (!mapped) return null;

      return {
        ...mapped,
        id: `${normalizedMarketplace}-${index}`,
        source: normalizedMarketplace,
        merchant:
          mapped.merchant ||
          (normalizedMarketplace === "amazon" ? "Amazon" : "Flipkart"),
      };
    })
    .filter(Boolean);

  // Restrict the listings to the categories the caller is allowed to use.
  const scopedItems = mappedItems.filter((item) =>
    allowedCategories.includes(item.category),
  );

  const categoryMatches = scopedItems.filter((item) =>
    matchesCategory(item, category),
  );

  // When a category is picked, keep only its listings. If the marketplace
  // returned nothing for that category, fall back to the remaining scoped
  // results so the vendor still sees what was found for their search.
  const visibleItems =
    category === "all" || categoryMatches.length > 0
      ? categoryMatches
      : scopedItems;

  return visibleItems.slice(0, MAX_RESULTS);
};


const downloadImageAsDataUrl = async (imageUrl) => {
  if (typeof imageUrl !== "string" || !imageUrl.startsWith("https://")) {
    return "";
  }

  const response = await axios.get(imageUrl, {
    responseType: "arraybuffer",
    timeout: IMAGE_TIMEOUT_MS,
    maxContentLength: MAX_IMAGE_BYTES,
  });

  const mimeType = String(response.headers["content-type"] || "")
    .split(";")[0]
    .toLowerCase();

  if (!SUPPORTED_IMAGE_TYPES.includes(mimeType)) {
    throw new Error("The scraped product image format is not supported.");
  }

  const base64 = Buffer.from(response.data).toString("base64");
  return `data:${mimeType};base64,${base64}`;
};

const buildDescription = (candidate) => {
  // Use pre-built full-spec description from curated catalog if available
  if (
    candidate.description &&
    candidate.description.length >= MIN_DESCRIPTION_LENGTH
  ) {
    return candidate.description.slice(0, MAX_DESCRIPTION_LENGTH);
  }

  const parts = [candidate.title];
  if (candidate.merchant) parts.push(`Sold by ${candidate.merchant}`);
  if (candidate.price > 0) parts.push(`Listed at INR ${candidate.price}`);
  parts.push("Imported automatically from ScraperAPI.");

  let description = parts.join(" | ");
  if (description.length < MIN_DESCRIPTION_LENGTH) {
    description = `${candidate.title} — imported product`;
  }
  return description.slice(0, MAX_DESCRIPTION_LENGTH);
};

module.exports = {
  buildDescription,
  buildScraperUrl,
  CURATED_PRODUCTS,
  detectBrand,
  detectCategory,
  detectModel,
  fetchScraperData,
  getCategorySearchTerm,
  getScraperRequestMessage,
  downloadImageAsDataUrl,
  hasValidScraperConfig,
  matchesCategory,
  PRODUCT_CATEGORIES,
  searchProducts,
  toPrice,
  MAX_RESULTS,
};
