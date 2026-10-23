import { useEffect, useState } from "react";
import { ArrowLeft, MapPin, Minus, Package, Pencil, Plus, ShoppingBag, ShoppingCart, Star, Tag, Trash2, Truck } from "lucide-react";
import { searchProductMedia } from "../api/productsApi.js";
import { currency, getProductId, LOW_STOCK_THRESHOLD } from "../productUtils.js";
import { calculateProductOffer, formatOfferDiscount, getDisplayOffers } from "../offerUtils.js";

function getSpecifications(product) {
  const details = String(product.description || "")
    .split("|")
    .map((item) => {
      const separator = item.indexOf(":");
      if (separator < 1) return null;
      return {
        label: item.slice(0, separator).trim(),
        value: item.slice(separator + 1).trim(),
      };
    })
    .filter((item) => item?.label && item.value);

  const structuredSpecs = product.specifications && typeof product.specifications === "object"
    ? Object.entries(product.specifications)
      .filter(([label, value]) => String(label).trim() && String(value ?? "").trim())
      .map(([label, value]) => ({ label: String(label).trim(), value: String(value).trim() }))
    : [];
  for (const specification of structuredSpecs) {
    const existingIndex = details.findIndex((detail) => detail.label.toLowerCase() === specification.label.toLowerCase());
    if (existingIndex < 0) details.push(specification);
    else details[existingIndex] = specification;
  }

  const attributes = [
    ["Brand", product.brand],
    ["Model", product.model],
    ["Color", product.color],
    ["Storage", product.storage],
    ["Memory", product.ram || product.memory],
    ["Processor", product.processor],
    ["Material", product.material],
    ["Warranty", product.warranty],
  ]
    .filter(([, value]) => value)
    .map(([label, value]) => ({ label, value: String(value) }));

  for (const attribute of attributes) {
    const existingIndex = details.findIndex((detail) => detail.label.toLowerCase() === attribute.label.toLowerCase());
    if (existingIndex < 0) details.push(attribute);
    else details[existingIndex] = attribute;
  }

  return details.length
    ? details
    : [{ label: "Product details", value: product.description || "No product description has been added yet." }];
}

function getProductColor(product) {
  if (product.color) return String(product.color).trim();
  const match = String(product.description || "").match(/(?:^|\|)\s*Color\s*:\s*([^|]+)/i);
  return match?.[1]?.trim() || "";
}

function getSpecValue(product, names) {
  const wanted = names.map((name) => name.toLowerCase());
  const specifications = product.specifications && typeof product.specifications === "object"
    ? Object.entries(product.specifications)
    : [];
  for (const [label, value] of specifications) {
    if (wanted.includes(String(label).trim().toLowerCase()) && String(value ?? "").trim()) return String(value).trim();
  }
  for (const item of String(product.description || "").split("|")) {
    const separator = item.indexOf(":");
    if (separator < 1) continue;
    const label = item.slice(0, separator).trim().toLowerCase();
    if (wanted.includes(label)) return item.slice(separator + 1).trim();
  }
  return "";
}

function getSizeOption(product) {
  const explicitSize = getSpecValue(product, ["size", "storage size", "memory and storage"]);
  if (explicitSize) return explicitSize;
  const ram = getSpecValue(product, ["ram", "ram memory", "ram memory installed size", "memory", "installed ram"]);
  const storage = getSpecValue(product, ["storage", "storage capacity", "ssd capacity"]);
  return ram && storage ? `${ram} + ${storage}` : "";
}

function getConfigurationOption(product) {
  return getSpecValue(product, ["configuration", "bundle", "included service"]);
}

export default function ProductDetails({
  product,
  products = [],
  canManageProducts = false,
  canEditProducts = canManageProducts,
  canPurchase = false,
  onAddToCart,
  onBuyNow,
  onSubmitReview,
  cartItems = [],
  onCartQuantityChange,
  onRemoveFromCart,
  onBack,
  onEdit,
  onOpenProduct,
  isStorefront = false,
}) {
  const productImages = [...new Set([
    ...(Array.isArray(product.images) ? product.images : []).map((image) =>
      typeof image === "string" ? image : image?.url || image?.src || image?.image || "",
    ),
    product.image,
  ].filter((image) => typeof image === "string" && image.trim()))];
  const productVideos = Array.isArray(product.videos)
    ? product.videos.map((video) => typeof video === "string" ? video : video?.url || video?.src || video?.video || "").filter((video) => typeof video === "string" && video.trim())
    : [];
  const [automaticMedia, setAutomaticMedia] = useState({ images: [], videos: [] });
  const [isLoadingAutomaticMedia, setIsLoadingAutomaticMedia] = useState(false);
  const [automaticMediaMessage, setAutomaticMediaMessage] = useState("");
  useEffect(() => {
    if (!isStorefront) {
      setAutomaticMedia({ images: [], videos: [] });
      setIsLoadingAutomaticMedia(false);
      setAutomaticMediaMessage("");
      return undefined;
    }
    let isActive = true;
    setAutomaticMedia({ images: [], videos: [] });
    setAutomaticMediaMessage("");
    setIsLoadingAutomaticMedia(true);
    searchProductMedia({ name: product.name, brand: product.brand, model: product.model, sourceUrl: product.sourceUrl })
      .then((result) => {
        if (!isActive) return;
        setAutomaticMedia({
          images: Array.isArray(result.data?.images) ? result.data.images : [],
          videos: Array.isArray(result.data?.videos) ? result.data.videos : [],
        });
        const matchedImages = Array.isArray(result.data?.images) ? result.data.images : [];
        if (!matchedImages.some((item) => item?.image && !productImages.includes(item.image))) {
          setAutomaticMediaMessage("No additional matching product photos were returned by the image search.");
        }
      })
      .catch((error) => {
        if (isActive) {
          setAutomaticMedia({ images: [], videos: [] });
          setAutomaticMediaMessage(error.message || "Automatic product photo search failed.");
        }
      })
      .finally(() => {
        if (isActive) setIsLoadingAutomaticMedia(false);
      });
    return () => { isActive = false; };
  }, [isStorefront, product._id, product.id, product.name, product.brand, product.model, product.sourceUrl]);
  const additionalImages = automaticMedia.images
    .filter((item) => item?.image && !productImages.includes(item.image))
    .slice(0, 4);
  const additionalVideos = automaticMedia.videos
    .filter((item) => item?.video && !productVideos.includes(item.video))
    .slice(0, 2);
  const mediaItems = [
    ...productImages.map((src, index) => ({ key: `image-${index}`, type: "image", src })),
    ...productVideos.map((src, index) => ({ key: `video-${index}`, type: "video", src })),
    ...additionalImages.map((item, index) => ({ key: `automatic-image-${index}`, type: "image", src: item.image, sourcePage: item.imageSource })),
    ...additionalVideos.map((item, index) => ({ key: `automatic-video-${index}`, type: "video", src: item.video, sourcePage: item.videoSource })),
  ];
  const [selectedMediaKey, setSelectedMediaKey] = useState(mediaItems[0]?.key || "");
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewComment, setReviewComment] = useState("");
  const [reviewMessage, setReviewMessage] = useState("");
  const [reviewError, setReviewError] = useState("");
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  useEffect(() => setSelectedMediaKey(mediaItems[0]?.key || ""), [product._id, product.id, product.image, product.images, product.videos]);
  const selectedMedia = mediaItems.find((item) => item.key === selectedMediaKey) || mediaItems[0];
  const quantity = Number(product.quantity) || 0;
  const displayedOffer = calculateProductOffer(product, 1);
  const displayOffers = getDisplayOffers(product);
  const isLowStock = quantity > 0 && quantity < LOW_STOCK_THRESHOLD;
  const rating = Math.max(0, Math.min(5, Number(product.rating || product.averageRating) || 0));
  const reviewCount = Number(product.reviewCount || product.ratingsCount) || 0;
  const cartItem = cartItems.find((item) => getProductId(item) === getProductId(product));
  const cartQuantity = Number(cartItem?.quantity) || 0;
  const specifications = getSpecifications(product);
  const relatedProducts = products
    .filter((item) => getProductId(item) !== getProductId(product))
    .filter((item) => String(item.category || "").toLowerCase() === String(product.category || "").toLowerCase())
    .slice(0, 4);
  const brandKey = String(product.brand || "").trim().toLowerCase();
  const modelKey = String(product.model || "").trim().toLowerCase();
  const productVariants = brandKey && modelKey
    ? products.filter((item) =>
      String(item.brand || "").trim().toLowerCase() === brandKey
      && String(item.model || "").trim().toLowerCase() === modelKey
    )
    : [];
  const family = productVariants.length ? productVariants : [product];
  const colorVariants = [...new Map(family.filter((item) => getProductColor(item)).map((item) => [getProductColor(item).toLowerCase(), item])).values()];
  const sizeOptions = [...new Set(family.map(getSizeOption).filter(Boolean))];
  const configurationOptions = [...new Set(family.map(getConfigurationOption).filter(Boolean))];
  const selectVariant = (getOption, selectedValue) => {
    const candidates = family.filter((item) => getOption(item) === selectedValue);
    const desiredColor = getOption === getProductColor ? selectedValue : getProductColor(product);
    const desiredSize = getOption === getSizeOption ? selectedValue : getSizeOption(product);
    const desiredConfiguration = getOption === getConfigurationOption ? selectedValue : getConfigurationOption(product);
    const preferred = candidates.find((item) =>
      (!desiredColor || !getProductColor(item) || getProductColor(item) === desiredColor)
      && (!desiredSize || !getSizeOption(item) || getSizeOption(item) === desiredSize)
      && (!desiredConfiguration || !getConfigurationOption(item) || getConfigurationOption(item) === desiredConfiguration)
    );
    if (preferred || candidates[0]) onOpenProduct?.(preferred || candidates[0]);
  };
  const aboutBullets = String(product.description || "")
    .split(/[|\n\u2022]/u)
    .map((line) => line.trim())
    .filter((line) => line && !/^(brand|model|color|storage|memory|ram|processor|material|warranty|size|dimensions|weight|configuration)\s*:/i.test(line));
  const reviews = Array.isArray(product.reviews) ? [...product.reviews].reverse() : [];

  const submitReview = async (event) => {
    event.preventDefault();
    setReviewError("");
    setReviewMessage("");
    if (!reviewRating) {
      setReviewError("Select a star rating before submitting.");
      return;
    }
    setIsSubmittingReview(true);
    try {
      await onSubmitReview?.(product, { rating: reviewRating, comment: reviewComment.trim() });
      setReviewMessage("Your rating has been saved.");
      setReviewComment("");
    } catch (error) {
      setReviewError(error.message || "Could not save your rating.");
    } finally {
      setIsSubmittingReview(false);
    }
  };

  const openRelatedProduct = (item) => {
    onOpenProduct?.(item);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <section className="product-details" aria-labelledby="product-details-title">
      <button className="button button-quiet details-back" type="button" onClick={onBack}>
        <ArrowLeft size={16} /> Back to products
      </button>

      <div className="details-shop-layout">
        <div className={`details-gallery ${mediaItems.length > 1 ? "has-thumbnails" : ""}`}>
          {mediaItems.length > 1 && <div className="details-image-thumbnails" aria-label="Product photos and videos">
            {mediaItems.map((media, index) => <button
              key={media.key}
              type="button"
              className={`details-image-thumbnail ${selectedMedia?.key === media.key ? "is-selected" : ""} ${media.type === "video" ? "is-video" : ""}`}
              onClick={() => setSelectedMediaKey(media.key)}
              aria-label={media.type === "video" ? `Play product video ${index + 1}` : `Show product photo ${index + 1}`}
              aria-pressed={selectedMedia?.key === media.key}
            >{media.type === "video" ? <video src={media.src} muted playsInline preload="metadata" /> : <img src={media.src} alt="" />}</button>)}
          </div>}
          {selectedMedia?.type === "video" ? <video className="details-main-video" src={selectedMedia.src} controls playsInline preload="metadata" aria-label={`${product.name} product video`} /> : selectedMedia ? <img className="details-main-image" src={selectedMedia.src} alt={product.name} /> : <div className="details-main-placeholder"><Package size={54} /></div>}
          {isStorefront && isLoadingAutomaticMedia && <span className="details-media-loading" role="status">Searching for more product photos and videos…</span>}
          {isStorefront && !isLoadingAutomaticMedia && automaticMediaMessage && <span className="details-media-loading details-media-message" role="status">{automaticMediaMessage}</span>}
          {selectedMedia?.sourcePage && <a className="details-media-source" href={selectedMedia.sourcePage} target="_blank" rel="noreferrer">View media source</a>}
        </div>

        <div className="details-shop-info">
          <span className="details-category">{product.category || "Product"}</span>
          <h1 id="product-details-title">{product.name}</h1>
          <div className="details-rating" aria-label={rating ? `${rating.toFixed(1)} out of 5 stars` : "No ratings yet"}>
            <span className="details-stars" aria-hidden="true">{[1, 2, 3, 4, 5].map((star) => <Star key={star} size={16} fill={star <= Math.round(rating) ? "currentColor" : "none"} />)}</span>
            <strong>{rating ? rating.toFixed(1) : "Not rated"}</strong>
            <span>{reviewCount ? `${reviewCount} ratings` : "No customer ratings yet"}</span>
          </div>
          {colorVariants.length > 1 && <div className="details-color-options">
            <span>Color: <strong>{getProductColor(product) || "Select a color"}</strong></span>
            <div className="details-variant-cards" role="group" aria-label="Available colors">
              {colorVariants.map((variant) => {
                const color = getProductColor(variant);
                const selected = getProductId(variant) === getProductId(product);
                const image = variant.image || variant.images?.[0];
                return <button key={getProductId(variant)} type="button" className={`details-variant-card ${selected ? "is-selected" : ""}`} onClick={() => selectVariant(getProductColor, color)} aria-pressed={selected}>
                  {image ? <img src={image} alt="" /> : <span className="details-variant-image-placeholder"><Package size={20} /></span>}
                  <span>{color}</span><strong>{currency.format(Number(variant.price) || 0)}</strong>
                </button>;
              })}
            </div>
          </div>}
          {sizeOptions.length > 1 && <div className="details-choice-group">
            <span>Size: <strong>{getSizeOption(product) || "Select a size"}</strong></span>
            <div className="details-choice-buttons" role="group" aria-label="Available sizes">
              {sizeOptions.map((size) => <button key={size} className={getSizeOption(product) === size ? "is-selected" : ""} type="button" onClick={() => selectVariant(getSizeOption, size)} aria-pressed={getSizeOption(product) === size}>{size}</button>)}
            </div>
          </div>}
          {configurationOptions.length > 1 && <div className="details-choice-group">
            <span>Configuration: <strong>{getConfigurationOption(product) || "Select a configuration"}</strong></span>
            <div className="details-choice-buttons" role="group" aria-label="Available configurations">
              {configurationOptions.map((configuration) => <button key={configuration} className={getConfigurationOption(product) === configuration ? "is-selected" : ""} type="button" onClick={() => selectVariant(getConfigurationOption, configuration)} aria-pressed={getConfigurationOption(product) === configuration}>{configuration}</button>)}
            </div>
          </div>}
          {displayOffers.length > 0 && <section className="details-product-offers" aria-label="Available offers">
            <h2><Tag size={16} /> {isStorefront ? "Offers for you · applied automatically at checkout" : "Active offers on this product"}</h2>
            {displayOffers.slice(0, 3).map((offer, index) => <article className="details-product-offer" key={`${offer.title}-${index}`}>
              <strong>{formatOfferDiscount(offer)} · {offer.title}</strong>
              <span>{offer.description || "Discount applied automatically at checkout."}{Number(offer.minQuantity) > 1 ? ` Buy ${offer.minQuantity} or more.` : ""}</span>
            </article>)}
          </section>}
          <div className="details-shop-price">{currency.format(displayedOffer.pricePerUnit)}{displayedOffer.offer && <del>{currency.format(Number(product.price) || 0)}</del>}</div>
          <p className={`details-availability ${quantity <= 0 ? "is-out" : !isStorefront && isLowStock ? "is-low" : ""}`}>
            {quantity <= 0 ? "Currently unavailable" : isStorefront ? "In stock" : isLowStock ? `Only ${quantity} left in stock` : `${quantity} units in stock`}
          </p>
          <div className="details-shop-actions">
            {canPurchase && <>
              {cartQuantity > 0 ? <div className="details-cart-controls" aria-label={`Cart quantity for ${product.name}`}>
                <button type="button" aria-label={`Remove one ${product.name}`} onClick={() => onCartQuantityChange?.(getProductId(product), cartQuantity - 1)} disabled={cartQuantity <= 1}><Minus size={16} /></button>
                <strong aria-live="polite">{cartQuantity}</strong>
                <button type="button" aria-label={`Add one ${product.name}`} onClick={() => onCartQuantityChange?.(getProductId(product), cartQuantity + 1)} disabled={cartQuantity >= quantity}><Plus size={16} /></button>
                <button className="details-cart-remove" type="button" aria-label={`Remove ${product.name} from cart`} onClick={() => onRemoveFromCart?.(getProductId(product))}><Trash2 size={16} /> Remove</button>
              </div> : <button className="button button-secondary" type="button" disabled={quantity <= 0} onClick={() => onAddToCart?.(product)}><ShoppingCart size={16} /> Add to cart</button>}
              <button className="button button-primary" type="button" disabled={quantity <= 0} onClick={() => onBuyNow?.(product)}><ShoppingBag size={16} /> Buy now</button>
            </>}
            {canEditProducts && !isStorefront && <button className="button button-quiet" type="button" onClick={() => onEdit?.(product)}><Pencil size={15} /> Edit product</button>}
          </div>
          {isStorefront ? (
            <>
              <div className="details-delivery-note"><Truck size={17} /><span>Delivery options are confirmed when you enter your address at checkout.</span></div>
              <div className="details-location-note"><Package size={16} /><span>Sold by {product.seller || product.brand || "Stockroom Store"}</span></div>
            </>
          ) : (
            <>
              <div className="details-delivery-note"><Package size={17} /><span>{quantity} units available in inventory.</span></div>
              <div className="details-location-note"><MapPin size={16} /><span>Storage location: {product.location || "Not assigned"}</span></div>
            </>
          )}
        </div>
      </div>

      <section className={`details-specifications ${isStorefront ? "is-storefront" : ""}`} aria-labelledby="specifications-title">
        <div className="details-section-heading">
          <div><span className="eyebrow">{isStorefront ? "PRODUCT INFORMATION" : "INVENTORY INFORMATION"}</span><h2 id="specifications-title">{isStorefront ? "Product specifications" : "Product details"}</h2></div>
          {!isStorefront && <span className="details-sku"><Package size={14} /> SKU: {product.sku || "Not assigned"}</span>}
        </div>
        <dl className="specification-list">
          {specifications.map(({ label, value }) => <div className="specification-item" key={label}><dt>{label}</dt><dd>{value}</dd></div>)}
        </dl>
      </section>

      {isStorefront && aboutBullets.length > 0 && <section className="details-about-item" aria-labelledby="about-item-title">
        <h2 id="about-item-title">About this item</h2>
        <ul>{aboutBullets.map((bullet, index) => <li key={`${index}-${bullet.slice(0, 30)}`}>{bullet}</li>)}</ul>
      </section>}

      <section className="details-reviews" aria-labelledby="reviews-title">
        <div className="details-section-heading">
          <div><span className="eyebrow">CUSTOMER FEEDBACK</span><h2 id="reviews-title">Ratings and reviews</h2></div>
          {reviewCount > 0 && <span className="details-review-summary"><Star size={15} fill="currentColor" /> {rating.toFixed(1)} · {reviewCount} {reviewCount === 1 ? "rating" : "ratings"}</span>}
        </div>
        {isStorefront && <form className="details-review-form" onSubmit={submitReview}>
          <strong>Rate this product</strong>
          <div className="details-review-picker" role="group" aria-label="Choose a star rating">
            {[1, 2, 3, 4, 5].map((value) => <button key={value} type="button" className={value <= reviewRating ? "is-selected" : ""} onClick={() => setReviewRating(value)} aria-label={`${value} star${value === 1 ? "" : "s"}`} aria-pressed={reviewRating === value}><Star size={22} fill={value <= reviewRating ? "currentColor" : "none"} /></button>)}
          </div>
          <label className="sr-only" htmlFor="product-review-comment">Review (optional)</label>
          <textarea id="product-review-comment" value={reviewComment} onChange={(event) => setReviewComment(event.target.value)} maxLength={1000} placeholder="Share your experience (optional)" />
          <button className="button button-primary" type="submit" disabled={isSubmittingReview}>{isSubmittingReview ? "Saving…" : "Submit rating"}</button>
          {reviewError && <p className="form-error" role="alert">{reviewError}</p>}
          {reviewMessage && <p className="details-review-success" role="status">{reviewMessage}</p>}
        </form>}
        {reviews.length ? <div className="details-review-list">{reviews.map((review, index) => <article className="details-review" key={`${review.userId || review.userName}-${index}`}>
          <div className="details-review-heading"><strong>{review.userName || "Customer"}</strong><span className="details-review-stars" aria-label={`${review.rating} out of 5 stars`}>{Array.from({ length: 5 }, (_, starIndex) => <Star key={starIndex} size={14} fill={starIndex < review.rating ? "currentColor" : "none"} />)}</span><time>{review.createdAt ? new Date(review.createdAt).toLocaleDateString("en-IN") : ""}</time></div>
          {review.comment && <p>{review.comment}</p>}
        </article>)}</div> : <p className="details-no-reviews">No customer ratings yet. Be the first to rate this product.</p>}
      </section>

      {relatedProducts.length > 0 && <section className="details-related" aria-labelledby="related-products-title">
        <div className="details-section-heading"><div><span className="eyebrow">MORE TO EXPLORE</span><h2 id="related-products-title">Similar products</h2></div></div>
        <div className="details-related-grid">
          {relatedProducts.map((item) => <button className="details-related-card" key={getProductId(item)} type="button" onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            openRelatedProduct(item);
          }}>
            {item.image ? <img src={item.image} alt="" loading="lazy" /> : <span className="details-related-placeholder"><Package size={24} /></span>}
            <span className="details-related-copy"><strong>{item.name}</strong><small>{item.category || "Product"}</small><b>{currency.format(Number(item.price) || 0)}</b></span>
          </button>)}
        </div>
      </section>}
    </section>
  );
}
