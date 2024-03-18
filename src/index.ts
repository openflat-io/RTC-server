import http from "http";
import { Server } from "socket.io";
import { Logger } from "./logger";
import { setupRTCConnectionHandlers } from "./connectionHandlers";

const server = http.createServer();
const io = new Server(server, {
    cors: {
        origin: "*",
    },
});

io.on("connection", socket => {
    Logger.info(`[Server: New connection: ${socket.id}]`);

    // setup connection handlers for RTC
    setupRTCConnectionHandlers(socket);
});

const PORT = 3002;
server.listen(PORT, () => {
    Logger.info(`[RTC Server: Server is running on http://localhost:${PORT}]`);
});
