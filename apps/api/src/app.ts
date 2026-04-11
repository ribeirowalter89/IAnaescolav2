import cors from "cors";
import express from "express";
import path from "node:path";
import { authRouter } from "./routes/auth.js";
import { childrenRouter } from "./routes/children.js";
import { contentRouter } from "./routes/content.js";
import { historyRouter } from "./routes/history.js";
import { testsRouter } from "./routes/tests.js";
import { errorHandler, notFound } from "./middleware/error.js";
import { assignRequestId, requestLogger } from "./middleware/observability.js";
import { securityHeaders } from "./middleware/security.js";
import { config } from "./config.js";
import { prisma } from "./prisma.js";
import { redis } from "./redis.js";

export const app = express();

app.use(assignRequestId);
app.use(requestLogger);
app.use(securityHeaders);
app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));
app.use("/uploads", express.static(path.resolve(config.uploadDir)));

app.get("/health", async (_req, res) => {
  let db = "down";
  let cache = config.redisUrl ? "down" : "disabled";

  try {
    await prisma.$queryRaw`SELECT 1`;
    db = "up";
  } catch {
    db = "down";
  }

  try {
    if (redis) {
      const pong = await redis.ping();
      cache = pong === "PONG" ? "up" : "down";
    }
  } catch {
    cache = "down";
  }

  const ok = db === "up" && (cache === "up" || cache === "disabled");
  res.status(ok ? 200 : 503).json({ ok, service: "EstudoIA Kids API", db, cache });
});

app.use("/api/auth", authRouter);
app.use("/api/children", childrenRouter);
app.use("/api/content", contentRouter);
app.use("/api/tests", testsRouter);
app.use("/api/history", historyRouter);

app.use(notFound);
app.use(errorHandler);