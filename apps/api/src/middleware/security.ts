import type { NextFunction, Request, Response } from "express";

export function securityHeaders(_req: Request, res: Response, next: NextFunction): void {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  next();
}

const buckets = new Map<string, { count: number; resetAt: number }>();

export function createRateLimiter(limit: number, windowMs: number) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const key = `${req.ip}:${req.path}`;
    const now = Date.now();
    const bucket = buckets.get(key);

    if (!bucket || now > bucket.resetAt) {
      buckets.set(key, { count: 1, resetAt: now + windowMs });
      next();
      return;
    }

    if (bucket.count >= limit) {
      const retrySec = Math.ceil((bucket.resetAt - now) / 1000);
      res.setHeader("Retry-After", String(retrySec));
      res.status(429).json({ message: "Muitas tentativas. Tente novamente em instantes." });
      return;
    }

    bucket.count += 1;
    buckets.set(key, bucket);
    next();
  };
}