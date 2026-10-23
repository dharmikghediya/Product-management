// 1. Import getMessaging instead of relying on legacy admin namespaces
const { initializeApp, cert, getApps } = require("firebase-admin/app"); 
const { getMessaging } = require("firebase-admin/messaging"); 
const validator = require("validator");
const fs = require("fs");
const path = require("path");

let firebaseReady = false;
const registeredTokens = new Set();

const getServiceAccountFromEnv = () => {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY;

  if (!projectId || !clientEmail || !privateKey) {
    return null;
  }

  const normalizedKey = privateKey.replace(/\\n/g, "\n");

  if (!normalizedKey.includes("BEGIN PRIVATE KEY")) {
    return null;
  }

  return {
    type: "service_account",
    project_id: projectId,
    client_email: clientEmail,
    private_key: normalizedKey,
  };
};

const getServiceAccountFromFile = () => {
  const candidates = [
    process.env.FIREBASE_SERVICE_ACCOUNT_PATH,
    path.join(__dirname, "firebase-service-account.json"),
    path.join(process.cwd(), "config", "firebase-service-account.json"),
  ].filter(Boolean);

  for (const candidate of candidates) {
    try {
      if (!fs.existsSync(candidate)) {
        continue;
      }

      const serviceAccount = require(candidate);

      if (
        serviceAccount &&
        serviceAccount.project_id &&
        serviceAccount.client_email &&
        serviceAccount.private_key
      ) {
        return serviceAccount;
      }
    } catch (error) {
      console.warn("Firebase service account check failed:", error.message);
    }
  }

  return null;
};

const initializeFirebase = () => {
  // FIX: Using modular getApps() instead of admin.apps to completely avoid undefined errors
  const apps = getApps();
  if (firebaseReady && apps.length) {
    return true;
  }

  try {
    const serviceAccount =
      getServiceAccountFromEnv() || getServiceAccountFromFile();

    if (!serviceAccount) {
      console.warn(
        "Firebase Admin not initialized: missing valid service account configuration.",
      );
      return false;
    }

    // FIX: Using modern initializeApp and cert wrapper utilities directly
    if (!apps.length) {
      initializeApp({
        credential: cert(serviceAccount),
      });
    }

    firebaseReady = true;
    console.log("Firebase Admin initialized successfully");
    return true;
  } catch (error) {
    console.warn("Firebase Admin not initialized:", error.message);
    return false;
  }
};

const registerFcmToken = (token) => {
  if (!token || typeof token !== "string") {
    return { success: false, message: "Invalid FCM token" };
  }

  const normalizedToken = token.trim();

  if (!normalizedToken) {
    return { success: false, message: "Invalid FCM token" };
  }

  registeredTokens.add(normalizedToken);

  return {
    success: true,
    message: "FCM token registered successfully",
    token: normalizedToken,
  };
};

const getRegisteredTokens = () => Array.from(registeredTokens);

const sendPushNotification = async ({ token, topic, title, body, data = {} }) => {
  const normalizedToken = typeof token === "string" ? token.trim() : token;
  const targetTopic = topic || null;

  if (!normalizedToken && !targetTopic) {
    return { success: false, message: "No FCM token provided" };
  }

  if (normalizedToken && !validator.isLength(normalizedToken, { min: 10 })) {
    return { success: false, message: "Invalid FCM token" };
  }

  if (!initializeFirebase()) {
    return { success: false, message: "Firebase is not configured" };
  }

  try {
    const sanitizedData = {};
    if (data && typeof data === 'object') {
      for (const [key, value] of Object.entries(data)) {
        sanitizedData[key] = String(value);
      }
    }

    // Build the dynamic message payload
    const message = {
      notification: {
        title: title || "Product Management",
        body: body || "You have a new notification.",
      },
      data: sanitizedData,
    };

    // Dynamically assign target route
    if (targetTopic) {
      message.topic = targetTopic;
    } else {
      message.token = normalizedToken;
    }

    const response = await getMessaging().send(message);
    return { success: true, messageId: response };
  } catch (error) {
    console.error("Error sending push notification:", error.message);
    return { success: false, message: error.message };send
  }
};


module.exports = {
  initializeFirebase,
  registerFcmToken,
  getRegisteredTokens,
  sendPushNotification,
};
