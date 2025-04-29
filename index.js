import dotenv from "dotenv";
dotenv.config();

import { WebSocketServer } from "ws";
import http from "http";
import express from "express";
import nunjucks from "nunjucks";
import cookieParser from "cookie-parser";
import cookie from "cookie";
import bodyParser from "body-parser";
import { deleteToken, findUserByToken, login, logout, signup } from "./api-login-functions.js";
import { startTimer, stopTimer, getUserTimers } from "./api-timers-functions.js";

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ clientTracking: false, noServer: true });
const clients = new Map();

nunjucks.configure("views", {
  autoescape: true,
  express: app,
  tags: {
    blockStart: "[%",
    blockEnd: "%]",
    variableStart: "[[",
    variableEnd: "]]",
    commentStart: "[#",
    commentEnd: "#]",
  },
});

app.set("view engine", "njk");

app.use(express.json());
app.use(express.static("public"));
app.use(cookieParser());

const auth = () => async (req, res, next) => {
  if (!req.cookies["token"]) {
    return next();
  }

  const user = await findUserByToken(req.cookies["token"]);
  req.user = user;
  req.token = req.cookies["token"];
  next();
};

app.get("/", auth(), (req, res) => {
  res.render("index", {
    user: req.user,
    userToken: req.token,
    authError: req.query.authError === "true" ? "Wrong username or password" : req.query.authError,
    signError: req.query.signError === "true" ? "Пользователь с таким именем уже существует" : req.query.signError,
  });
});

app.post("/signup", bodyParser.urlencoded({ extended: false }), signup());
app.post("/login", bodyParser.urlencoded({ extended: false }), login());
app.get("/logout", auth(), logout());

server.on("upgrade", async (req, socket, head) => {
  const cookies = cookie.parse(req.headers.cookie);
  const token = cookies && cookies["token"];
  const user = await findUserByToken(token);

  if (!user) {
    socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
    socket.destroy();
    return;
  }

  req.userId = user.id;
  wss.handleUpgrade(req, socket, head, (ws) => {
    wss.emit("connection", ws, req);
  });
});

wss.on("connection", async (ws, req) => {
  const { userId } = req;
  clients.set(userId, ws);
  const timers = await getUserTimers(req.userId);
  const fullMessage = JSON.stringify({
    type: "all_timers",
    message: timers,
  });
  ws.send(fullMessage);

  ws.on("close", async () => {
    await deleteToken(req.token);
    console.log("close", req.token);
    clients.delete(userId);
  });

  ws.on("message", async (message) => {
    let data;
    try {
      data = JSON.parse(message);
    } catch (err) {
      console.error("Data error:", err);
      return;
    }

    switch (data.type) {
      case "active_timers":
        {
          const cookies = cookie.parse(req.headers.cookie);
          const token = cookies && cookies["token"];

          if (!token) {
            const fullMessage = JSON.stringify({
              type: "error",
              message: "Авторизуйтесь снова",
            });

            ws.send(fullMessage);
            return;
          }
          const timers = await getUserTimers(userId);
          const fullMessage = JSON.stringify({
            type: "active_timers",
            message: timers.activeTimers,
          });
          ws.send(fullMessage);
        }
        break;
      case "create_timer":
        {
          const timer = await startTimer(userId, data.message);
          const timers = await getUserTimers(userId);
          const fullMessage = JSON.stringify({
            type: "all_timers",
            message: timers,
            timerId: timer.id,
            description: timer.description,
            start: true,
          });
          ws.send(fullMessage);
        }
        break;
      case "stop_timer": {
        const timer = await stopTimer(data.message);
        const timers = await getUserTimers(userId);
        const fullMessage = JSON.stringify({
          type: "all_timers",
          message: timers,
          timerId: timer.id,
          stop: true,
        });
        ws.send(fullMessage);
      }
    }
  });
});

const port = process.env.PORT || 2920;
server.listen(port, () => {
  console.log(`  Listening on http://localhost:${port}`);
});
