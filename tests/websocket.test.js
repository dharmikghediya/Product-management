const test = require("node:test");
const assert = require("node:assert/strict");
const http = require("node:http");
const { WebSocket } = require("ws");

const { attachWebSocket, broadcast } = require("../config/websocket");

test("WebSocket clients receive connection and broadcast events", async (context) => {
  const server = http.createServer();
  const webSocketServer = attachWebSocket(server);

  await new Promise((resolve) => server.listen(0, resolve));
  context.after(async () => {
    const [client] = webSocketServer.clients;
    if (client) {
      await new Promise((resolve) => {
        client.once("close", resolve);
        client.close();
      });
    }
    await new Promise((resolve) => webSocketServer.close(resolve));
    await new Promise((resolve) => server.close(resolve));
  });

  const client = new WebSocket(`ws://127.0.0.1:${server.address().port}/ws`);
  const connectionMessage = new Promise((resolve) => {
    client.once("message", (message) => resolve(JSON.parse(message)));
  });

  await new Promise((resolve, reject) => {
    client.once("open", resolve);
    client.once("error", reject);
  });
  assert.deepEqual(await connectionMessage, { event: "connected" });

  const productMessage = new Promise((resolve) => {
    client.once("message", (message) => resolve(JSON.parse(message)));
  });
  broadcast("product.created", { name: "Keyboard" });
  assert.deepEqual(await productMessage, {
    event: "product.created",
    data: { name: "Keyboard" },
  });
});