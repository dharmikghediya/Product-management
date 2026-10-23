export const CUSTOM_OPTION = "__custom__";

export const DEVICE_TYPES = ["Mobile", "Laptop", "Smartwatch", "Earbuds", "Headphones"];

export const DEVICE_BRANDS = {
  Mobile: [
    "Apple",
    "Google",
    "Motorola",
    "Nothing",
    "OnePlus",
    "Oppo",
    "Realme",
    "Samsung",
    "Vivo",
    "Xiaomi",
  ],
  Laptop: ["Acer", "Apple", "ASUS", "Dell", "HP", "Lenovo", "Microsoft", "MSI"],
  Smartwatch: [
    "Amazfit",
    "Apple",
    "Garmin",
    "Google",
    "Huawei",
    "Noise",
    "Nothing",
    "OnePlus",
    "Oppo",
    "Realme",
    "Samsung",
    "Xiaomi",
  ],
  Earbuds: [
    "Apple",
    "boAt",
    "Boult",
    "JBL",
    "Nothing",
    "OnePlus",
    "Oppo",
    "Realme",
    "Samsung",
    "Sony",
    "Soundcore",
    "Xiaomi",
  ],
  Headphones: [
    "AKG",
    "Apple",
    "Audio-Technica",
    "Bose",
    "boAt",
    "JBL",
    "Philips",
    "Sennheiser",
    "Sony",
    "Soundcore",
  ],
};

export const DEVICE_MODELS = {
  Mobile: {
    Apple: [
      "iPhone 16",
      "iPhone 16 Plus",
      "iPhone 16 Pro",
      "iPhone 16 Pro Max",
      "iPhone 17",
    ],
    Google: ["Pixel 9", "Pixel 9 Pro", "Pixel 9 Pro XL", "Pixel 10"],
    Motorola: ["Edge 50", "Edge 60", "Moto G85", "Moto G86"],
    Nothing: ["Phone (2a)", "Phone (3a)", "Phone (3a) Pro"],
    OnePlus: ["Nord CE4", "Nord CE4 Lite", "Nord 4", "OnePlus 13"],
    Oppo: ["A3 Pro", "F27 Pro+", "Reno 13", "Reno 13 Pro"],
    Realme: ["12 Pro+", "13 Pro+", "14 Pro", "14 Pro+"],
    Samsung: [
      "Galaxy A55",
      "Galaxy A56",
      "Galaxy S24",
      "Galaxy S25",
      "Galaxy S25 Ultra",
    ],
    Vivo: ["V40", "V50", "V60", "X200"],
    Xiaomi: ["Redmi Note 14", "Redmi Note 14 Pro+", "Xiaomi 14", "Xiaomi 15"],
  },
  Laptop: {
    Acer: ["Aspire 5", "Aspire 7", "Swift Go 14", "Predator Helios Neo 16"],
    Apple: [
      "MacBook Air 13-inch",
      "MacBook Air 15-inch",
      "MacBook Pro 14-inch",
      "MacBook Pro 16-inch",
    ],
    ASUS: ["Vivobook 15", "Zenbook 14", "ROG Zephyrus G14", "TUF Gaming A15"],
    Dell: ["Inspiron 14", "Inspiron 15", "XPS 13", "XPS 15", "Latitude 5450"],
    HP: [
      "Pavilion 14",
      "Pavilion 15",
      "Envy x360 14",
      "Victus 15",
      "ProBook 440",
    ],
    Lenovo: [
      "IdeaPad Slim 3",
      "IdeaPad Slim 5",
      "ThinkPad E14",
      "ThinkPad X1 Carbon",
      "LOQ 15",
    ],
    Microsoft: ["Surface Laptop 7", "Surface Pro 11"],
    MSI: ["Modern 14", "Thin 15", "Katana 15", "Prestige 14"],
  },
  Smartwatch: {
    Amazfit: ["Active 2", "Bip U1", "GTR 4", "GTS 4 Mini"],
    Apple: ["Series 9", "Series 10", "Ultra 2", "SE"],
    Garmin: ["Forerunner 165", "Fenix 8", "Venu 3"],
    Google: ["Pixel Watch 3", "Pixel Watch 4"],
    Huawei: ["Band 9", "Watch 4", "Watch GT 5 Pro"],
    Noise: ["ColorFit Pro 5", "Pulse 2"],
    Nothing: ["Watch Pro 3", "Watch Pro 2"],
    OnePlus: ["Watch 3", "Watch 3 Pro"],
    Oppo: ["Watch X2", "Watch 3 Pro"],
    Realme: ["Watch 3 Pro", "Watch S2"],
    Samsung: ["Galaxy Watch 6", "Galaxy Watch 6 Classic", "Galaxy Watch FE"],
    Xiaomi: ["Band 9", "Watch S3", "Watch S4"],
  },
  Earbuds: {
    Apple: ["AirPods 4", "AirPods Pro 3", "AirPods Pro 2"],
    boAt: ["Airdopes 141", "Airdopes 141 Pro", "Airdopes 111"],
    Boult: ["Z40", "Y2 Ultra"],
    JBL: ["Tune Beam", "Wave Buds2", "Live Beam"],
    Nothing: ["Ear (a)", "Ear (a) Pro"],
    OnePlus: ["Buds 3", "Buds Pro 3"],
    Oppo: ["Enco Air4 Pro", "Enco X3"],
    Realme: ["Buds 2", "Buds Air 7"],
    Samsung: ["Buds FE", "Buds3", "Buds3 Pro"],
    Sony: ["WF-1000XM5", "WF-C700N"],
    Soundcore: ["Space One", "Liberty 4 NC"],
    Xiaomi: ["Buds 5", "Buds 5 Pro"],
  },
  Headphones: {
    AKG: ["K702", "M50x"],
    Apple: ["AirPods Max", "Beats Studio Pro"],
    "Audio-Technica": ["ATH-M50x", "ATH-M40x"],
    Bose: ["QC 45", "QC Ultra", "SoundSport"],
    boAt: ["Rockerz 255 Pro", "Airdopes 141 Pro"],
    JBL: ["Tour One", "Live 660NC", "Tune 760NC"],
    Philips: ["TAH8506", "TAT2236"],
    Sennheiser: ["HD 450BT", "Momentum 4"],
    Sony: ["WH-1000XM5", "WH-CH720N"],
    Soundcore: ["Q30", "Life Q45"],
  },
};

export const COLOR_OPTIONS = [
  "Black",
  "Blue",
  "Green",
  "Gray",
  "Silver",
  "White",
  "Gold",
  "Purple",
  "Red",
];

export const RAM_OPTIONS = [
  "4 GB",
  "6 GB",
  "8 GB",
  "12 GB",
  "16 GB",
  "24 GB",
  "32 GB",
  "64 GB",
];

export const STORAGE_OPTIONS = [
  "64 GB",
  "128 GB",
  "256 GB",
  "512 GB",
  "1 TB",
  "2 TB",
  "4 TB",
];

export const PROCESSOR_OPTIONS = [
  "Intel Core i3",
  "Intel Core i5",
  "Intel Core i7",
  "Intel Core i9",
  "Intel Core Ultra 5",
  "Intel Core Ultra 7",
  "AMD Ryzen 5",
  "AMD Ryzen 7",
  "AMD Ryzen 9",
  "Apple M2",
  "Apple M3",
  "Apple M4",
];

export const PRICE_OPTIONS = [
  1000, 2000, 5000, 10000, 15000, 20000, 25000, 30000, 40000, 50000, 60000,
  75000, 100000, 150000, 200000, 300000,
];

export const ACCEPTED_IMAGE_TYPES = [
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
];

export const MAX_IMAGE_BYTES = 2 * 1024 * 1024;

export const EMPTY_DEVICE_DETAILS = {
  brand: "",
  model: "",
  storage: "",
  ram: "",
  color: "",
  processor: "",
};

export const getModelOptions = (deviceType, brand) => {
  const modelsForType = DEVICE_MODELS[deviceType] || {};
  if (!brand) return Object.values(modelsForType).flat();
  return modelsForType[brand] || [];
};
