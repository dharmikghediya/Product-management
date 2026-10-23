const roundMoney = (value) => Math.round((Number(value) + Number.EPSILON) * 100) / 100;

// Offers shown to shoppers: the product's own offers when it has any,
// otherwise the shared scraper offers that match its category.
export const getDisplayOffers = (product) => {
  if (Array.isArray(product?.displayOffers)) return product.displayOffers;
  return Array.isArray(product?.offers) ? product.offers : [];
};

export function calculateProductOffer(product, quantity = 1) {
  const price = Math.max(0, Number(product?.price) || 0);
  const units = Math.max(1, Number(quantity) || 1);
  const eligible = getDisplayOffers(product)
    .filter((offer) => units >= Math.max(1, Number(offer.minQuantity) || 1))
    .map((offer) => {
      const value = Number(offer.value) || 0;
      const savingsPerUnit = roundMoney(Math.min(price, offer.discountType === "fixed" ? value : price * value / 100));
      return { offer, savingsPerUnit, pricePerUnit: roundMoney(price - savingsPerUnit), totalSavings: roundMoney(savingsPerUnit * units) };
    })
    .filter((match) => match.savingsPerUnit > 0)
    .sort((left, right) => right.totalSavings - left.totalSavings);
  return eligible[0] || { offer: null, savingsPerUnit: 0, pricePerUnit: roundMoney(price), totalSavings: 0 };
}

export const formatOfferDiscount = (offer) => offer?.discountType === "fixed"
  ? `₹${Number(offer.value).toLocaleString("en-IN")} off`
  : `${Number(offer?.value) || 0}% off`;
