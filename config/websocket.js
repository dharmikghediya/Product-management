const { WebSocket, WebSocketServer } = require("ws");
const { verifyAuthToken } = require("../middleware/auth");

let webSocketServer;

function sendIfOpen(socket, message) {
  if (socket.readyState !== WebSocket.OPEN) return;
  try {
    socket.send(message, (error) => {
      if (error && socket.readyState !== WebSocket.CLOSED) socket.terminate();
    });
  } catch {
    socket.terminate();
  }
}

function attachWebSocket(server) {
  webSocketServer = new WebSocketServer({
    server,
    path: "/ws",
    verifyClient: (info, done) => {
      const requestUrl = new URL(info.req.url, "http://localhost");
      const user = verifyAuthToken(requestUrl.searchParams.get("token"));
      if (!user) return done(false, 401, "Authentication required");
      info.req.stockroomUser = user;
      return done(true);
    },
  });

  webSocketServer.on("connection", (socket, request) => {
    socket.stockroomUser = request.stockroomUser;
    // A browser can close its socket between the readyState check and write.
    // Handle that transport error rather than letting an EPIPE crash Node.
    socket.on("error", () => {});
    sendIfOpen(socket, JSON.stringify({ event: "connected" }));
  });

  return webSocketServer;
}

function sendToUser(userId, event, data) {
  if (!webSocketServer || !userId) return;
  const message = JSON.stringify({ event, data });
  for (const client of webSocketServer.clients) {
    if (
      client.readyState === WebSocket.OPEN &&
      String(client.stockroomUser?.sub) === String(userId)
    ) {
      sendIfOpen(client, message);
    }
  }
}

function sendToRoles(roles, event, data, excludeUserId) {
  if (!webSocketServer) return;
  const allowedRoles = new Set(Array.isArray(roles) ? roles : [roles]);
  const message = JSON.stringify({ event, data });
  for (const client of webSocketServer.clients) {
    const user = client.stockroomUser;
    if (
      client.readyState === WebSocket.OPEN &&
      allowedRoles.has(user?.role) &&
      String(user?.sub) !== String(excludeUserId)
    ) {
      sendIfOpen(client, message);
    }
  }
}

function broadcast(event, data) {
  if (!webSocketServer) return;

  const message = JSON.stringify({ event, data });
  for (const client of webSocketServer.clients) {
    if (client.readyState === WebSocket.OPEN) {
      sendIfOpen(client, message);
    }
  }
}

module.exports = { attachWebSocket, broadcast, sendToUser, sendToRoles };
