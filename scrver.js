const http = require("http");
const app = require("./app");
const { attachWebSocket } = require("./config/websocket");

const PORT = Number(process.env.PORT || 3000);
const server = http.createServer(app);

attachWebSocket(server);



server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
