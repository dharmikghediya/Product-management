require("dotenv").config();

const WebSocket = require("ws");

const port = process.env.PORT || 3000
const socket = new WebSocket(`ws://localhost:${port}/ws`);

socket.on("open", () => {
  console.log(`Connected to WebSocket server on port ${port}`);
});

socket.on("message", (message) => {
  try {
    console.log("Received WebSocket event:", JSON.parse(message.toString()));
  } catch (error) {
    console.error("Received an invalid WebSocket message:", error.message);
  }
});

socket.on("error", (error) => {
  console.error("WebSocket connection error:", error.message);
});

socket.on("close", () => {
  console.log("WebSocket connection closed");
});