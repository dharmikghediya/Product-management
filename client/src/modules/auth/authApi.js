import { apiRequest } from "../products/api/productsApi.js";

const SESSION_KEY = "stockroom-session";
const LAST_EMAIL_KEY = "stockroom-last-email";

export function readSession() {
  try {
    return JSON.parse(localStorage.getItem(SESSION_KEY) || "null");
  } catch {
    return null;
  }
}

export function saveSession(session) {
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export function clearSession() {
  localStorage.removeItem(SESSION_KEY);
}

export function readLastEmail() {
  try {
    return localStorage.getItem(LAST_EMAIL_KEY) || "";
  } catch {
    return "";
  }
}

export function saveLastEmail(email) {
  if (!email || typeof email !== "string") {
    return;
  }

  const normalizedEmail = email.trim();
  if (!normalizedEmail) {
    return;
  }

  localStorage.setItem(LAST_EMAIL_KEY, normalizedEmail);
}

export function registerUser(values) {
  return apiRequest("/auth/register", {
    method: "POST",
    body: JSON.stringify(values),
  });
}

export function loginUser(values) {
  return apiRequest("/auth/login", {
    method: "POST",
    body: JSON.stringify(values),
  });
}

export function requestPasswordReset(values) {
  return apiRequest("/auth/forgot-password", {
    method: "POST",
    body: JSON.stringify(values),
  });
}

export function resetPassword(values) {
  return apiRequest("/auth/reset-password", {
    method: "POST",
    body: JSON.stringify(values),
  });
}

export function changePassword(values) {
  return apiRequest("/auth/change-password", {
    method: "POST",
    body: JSON.stringify(values),
  });
}