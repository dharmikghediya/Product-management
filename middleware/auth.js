const {
  createHmac,
  randomBytes,
  timingSafeEqual,
} = require("node:crypto");

const configuredSecret =
  process.env.AUTH_SECRET || process.env.JWT_SECRET;

if (process.env.NODE_ENV === "production" && !configuredSecret) {
  throw new Error("AUTH_SECRET must be configured in production.");
}

const signingSecret =
  configuredSecret || randomBytes(32).toString("hex");

function sign(value) {
  return createHmac("sha256", signingSecret)
    .update(value)
    .digest("base64url");
}

function createAuthToken(user) {
  const payload = Buffer.from(
    JSON.stringify({
      sub: user.id,
      email: user.email,
      name: user.name,

      // Only admin or user
      role: user.role || "user",

      // Used for normal users
      canManageProducts: user.canManageProducts === true,

      exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7,
    })
  ).toString("base64url");

  const content = `v1.${payload}`;

  return `${content}.${sign(content)}`;
}

function verifyAuthToken(token) {
  const [version, payload, signature, extra] =
    String(token || "").split(".");

  if (version !== "v1" || !payload || !signature || extra) {
    return null;
  }

  const content = `${version}.${payload}`;

  const expected = Buffer.from(sign(content));
  const received = Buffer.from(signature);

  if (
    expected.length !== received.length ||
    !timingSafeEqual(expected, received)
  ) {
    return null;
  }

  try {
    const decoded = JSON.parse(
      Buffer.from(payload, "base64url").toString("utf8")
    );

    if (
      !decoded.sub ||
      decoded.exp <= Math.floor(Date.now() / 1000)
    ) {
      return null;
    }

    return decoded;
  } catch {
    return null;
  }
}

function requireAuth(req, res, next) {
  const authorization = req.get("authorization") || "";

  const match = authorization.match(/^Bearer\s+(.+)$/i);

  const user = match && verifyAuthToken(match[1]);

  if (!user) {
    return res.status(401).json({
      success: false,
      message: "Please sign in to continue.",
    });
  }

  req.user = user;

  return next();
}

function requireRole(allowedRoles) {
  const roles = Array.isArray(allowedRoles)
    ? allowedRoles
    : [allowedRoles];

  return (req, res, next) => {
    const userRole = req.user?.role;

    if (!roles.includes(userRole)) {
      return res.status(403).json({
        success: false,
        message: "You do not have permission to perform this action.",
      });
    }

    return next();
  };
}

module.exports = {
  createAuthToken,
  requireAuth,
  requireRole,
  verifyAuthToken,
};