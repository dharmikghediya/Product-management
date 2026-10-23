const ActivityLog = require("../models/activityLogModel");
const User = require("../models/userModel");

const AUDITED_FIELDS = [
  "name",
  "brand",
  "model",
  "category",
  "price",
  "quantity",
  "description",
  "sku",
  "location",
];

const productSnapshot = (product) =>
  Object.fromEntries(
    AUDITED_FIELDS.map((field) => [field, product[field] ?? null]),
  );

class AuditLogError extends Error {
  constructor(cause) {
    super(cause?.message || "The activity log could not be written.");
    this.name = "AuditLogError";
    this.cause = cause;
  }
}

const resolveActorName = async (req) => {
  if (req.user?.name) return req.user.name;

  const user = await User.findById(req.user?.sub).select("name");
  return user?.name || req.user?.email || String(req.user?.sub);
};

const recordActivity = async (
  req,
  action,
  product,
  before = {},
  after = productSnapshot(product),
) => {
  const changes = AUDITED_FIELDS.filter(
    (field) => before[field] !== after[field],
  ).map((field) => ({
    field,
    before: before[field] ?? null,
    after: after[field] ?? null,
  }));

  await ActivityLog.create({
    actorId: String(req.user.sub),
    actorName: await resolveActorName(req),
    action,
    productId: String(product._id),
    productName: product.name,
    changes,
  });
};

const sendAuditFailure = (res, error, action) => {
  console.error(
    `Product ${action} succeeded but its activity log failed:`,
    error,
  );
  return res.status(500).json({
    success: false,
    message: `The product ${action} succeeded, but its activity could not be recorded. Refresh the inventory before trying again.`,
  });
};

module.exports = {
  AUDITED_FIELDS,
  AuditLogError,
  productSnapshot,
  recordActivity,
  sendAuditFailure,
};
