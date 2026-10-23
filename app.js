const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");

require("dotenv").config({ path: require("path").join(__dirname, ".env") });

const connectDB = require("./config/productDb");
const { initializeSuperAdmin } = require("./controller/authController");
const productRoutes = require("./routes/products.routes");
const authRoutes = require("./routes/auth.routes");
const userRoutes = require("./routes/users.routes");
const orderRoutes = require("./routes/orders.routes");
const stockMovementRoutes = require("./routes/stockMovement.routes");
const { requireAuth } = require("./middleware/auth");
const { initializeFirebase } = require("./config/firebase");
const {
  registerFcmToken,
  sendPushNotification,
  getRegisteredTokens,
} = require("./config/firebase");

const app = express();

app.use(express.json({ limit: "16mb" }));
app.use(cors({ origin: process.env.CLIENT_ORIGIN || "http://localhost:5173" }));
app.use(bodyParser.json({ limit: "16mb" }));
app.use(bodyParser.urlencoded({ extended: true }));

initializeFirebase();



app.use("/auth", authRoutes);
app.use("/users", userRoutes);
app.use("/orders", orderRoutes);
app.use("/stock-movements", stockMovementRoutes);
app.use("/product", requireAuth, productRoutes);

app.post("/api/register-token", (req, res) => {
  const { token } = req.body;
  const result = registerFcmToken(token);
  if (!result.success) return res.status(400).json(result);
  res.status(200).json(result);
});
app.post("/api/products", async (req, res) => {
  try {
    const { productName, productPrice } = req.body;

    const result = await sendPushNotification({
      topic: "test-notification", // ✅ topic, NOT token
      title: "🆕 New Product Added!",
      body: `${productName} is now available for ₹${productPrice}`,
      data: {
        productName: productName,
        price: productPrice,
      },
    });

    if (!result.success) {
      return res.status(500).json({
        success: false,
        error: result.message,
      });
    }

    return res.status(201).json({
      success: true,
      message: "Push notification sent successfully!",
      id: result.messageId,
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

connectDB()
  .then(async (connected) => {
    if (!connected) {
      console.warn(
        "API started without a MongoDB connection. Set MONGO_URI to enable database features.",
      );
      return;
    }

    const missingSuperAdminSettings = [
      "SUPER_ADMIN_EMAIL",
      "SUPER_ADMIN_PASSWORD",
    ].filter((key) => !process.env[key]);
    if (missingSuperAdminSettings.length) {
      console.warn(
        `Super Admin initialization skipped. Add ${missingSuperAdminSettings.join(" and ")} to Product Management/.env.`,
      );
      return;
    }

    const created = await initializeSuperAdmin();
    if (created) console.log("Configured Super Admin account created.");
  })
  .catch((error) => {
    console.error("Super Admin initialization failed:", error.message);
  });

app.get("/", (req, res) => {
  res.send("API is running");
});

module.exports = app;
