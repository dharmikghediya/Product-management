const buildSpecLines = (deviceType, details) => {
  const lines = [
    `Brand: ${details.brand.trim()}`,
    `Model: ${details.model.trim()}`,
  ];

  if (deviceType === "Laptop") {
    lines.push(`Processor: ${details.processor.trim()}`);
    lines.push(`RAM: ${details.ram.trim()}`);
    lines.push(`Storage: ${details.storage.trim()}`);
    lines.push(`Color: ${details.color.trim()}`);
    return lines;
  }

  lines.push(`Storage: ${details.storage.trim()}`);
  lines.push(`RAM: ${details.ram.trim()}`);
  lines.push(`Color: ${details.color.trim()}`);
  return lines;
};

const normalizeSpecifications = (rows = []) => Object.fromEntries(
  rows
    .map(({ label = "", value = "" }) => [label.trim(), String(value).trim()])
    .filter(([label, value]) => label && value),
);

const normalizeOffers = (offers = []) => offers
  .filter((offer) => String(offer.title || "").trim())
  .map((offer) => ({
    title: String(offer.title || "").trim(),
    description: String(offer.description || "").trim(),
    discountType: offer.discountType === "fixed" ? "fixed" : "percentage",
    value: Number(offer.value),
    minQuantity: Number(offer.minQuantity) || 1,
  }));

export const buildCreatePayload = ({ deviceType, deviceDetails, values, images = [], videos = [], offers = [], specifications = [] }) => ({
  name: `${deviceDetails.brand.trim()} ${deviceDetails.model.trim()}${deviceDetails.color.trim() ? ` - ${deviceDetails.color.trim()}` : ""}`.trim(),
  brand: deviceDetails.brand.trim(),
  model: deviceDetails.model.trim(),
  color: deviceDetails.color.trim(),
  price: Number(values.price),
  description: buildSpecLines(deviceType, deviceDetails).join(" | "),
  specifications: normalizeSpecifications(specifications),
  category: deviceType,
  quantity: Number(values.quantity),
  images,
  videos,
  offers: normalizeOffers(offers),
  imageSource: "",
});

export const buildEditPayload = ({ values, images = [], videos = [], offers = [], product, specifications = [] }) => {
  const payload = {
    name: values.name.trim(),
    brand: values.brand.trim(),
    model: values.model.trim(),
    price: Number(values.price),
    description: values.description.trim(),
    specifications: normalizeSpecifications(specifications),
    category: values.category.trim(),
    color: values.color.trim(),
    quantity: Number(values.quantity),
    offers: normalizeOffers(offers),
  };

  // Only send the image when the user actually changed it, so an edit
  // does not upload an unchanged multi-megabyte data URL.
  const currentImages = Array.isArray(product?.images) && product.images.length
    ? product.images
    : product?.image ? [product.image] : [];
  if (JSON.stringify(images) !== JSON.stringify(currentImages)) {
    payload.images = images;
    payload.image = images[0] || "";
  }

  const currentVideos = Array.isArray(product?.videos) ? product.videos : [];
  if (JSON.stringify(videos) !== JSON.stringify(currentVideos)) {
    payload.videos = videos;
  }

  return payload;
};
