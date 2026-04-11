import crypto from "node:crypto";
import type { NextFunction, Request, Response } from "express";

export function assignRequestId(req: Request, res: Response, next: NextFunction): void {
  const requestId = req.headers["x-request-id"]?.toString() || crypto.randomUUID();
  res.setHeader("x-request-id", requestId);
  req.headers["x-request-id"] = requestId;
  next();
}

export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  const start = Date.now();
  const requestId = req.headers["x-request-id"]?.toString() ?? "unknown";

  res.on("finish", () => {
    const elapsed = Date.now() - start;
    console.log(
      `[${new Date().toISOString()}] ${requestId} ${req.method} ${req.originalUrl} ${res.statusCode} ${elapsed}ms`
    );
  });

  next();
}