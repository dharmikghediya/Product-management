const User = require("../models/userModel");

function hasProductManagementAccess(user) {
  return user?.role === "admin" || user?.canManageProducts === true;
}

function loadProductAccessUser(userModel = User) {
  return async (req, res, next) => {
    try {
      const user = await userModel
        .findById(req.user.sub)
        .select("role canManageProducts");
      if (!user) {
        return res.status(401).json({
          success: false,
          message: "Please sign in to continue.",
        });
      }

      req.productAccessUser = user;
      return next();
    } catch (error) {
      return next(error);
    }
  };
}

function requireProductManagement(req, res, next) {
  if (!hasProductManagementAccess(req.productAccessUser) && req.productAccessUser?.role !== "vendor") {
    return res.status(403).json({
      success: false,
      message: "Product-management permission is required to delete products. An Admin must grant permission.",
    });
  }
  return next();
}

function requireProductCreation(req, res, next) {
  if (req.productAccessUser?.role === "admin" || req.productAccessUser?.role === "vendor" || hasProductManagementAccess(req.productAccessUser)) {
    return next();
  }
  return res.status(403).json({
    success: false,
    message: "An Admin or authorized product manager is required to create products.",
  });
}

function requireScraperAccess(req, res, next) {
  if (
    hasProductManagementAccess(req.productAccessUser) ||
    req.productAccessUser?.role === "vendor"
  ) {
    return next();
  }
  return res.status(403).json({
    success: false,
    message: "Scraper imports are available to admins, product managers, and vendors.",
  });
}

function restrictProductUpdateAccess(req, res, next) {
  const user = req.productAccessUser;
  if (hasProductManagementAccess(user) || user?.role === "staff" || user?.role === "manager" || user?.role === "vendor") {
    return next();
  }
  return res.status(403).json({
    success: false,
    message: "Staff or product-management permission is required to update product details.",
  });
}

const loadProductAccess = loadProductAccessUser();

module.exports = {
  hasProductManagementAccess,
  loadProductAccess,
  loadProductAccessUser,
  requireProductCreation,
  requireProductManagement,
  requireScraperAccess,
  restrictProductUpdateAccess,
};
