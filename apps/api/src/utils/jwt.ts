import jwt from "jsonwebtoken";
import { config } from "../config.js";
import type { JwtPayload } from "../types/index.js";

const expiresIn = "7d";

export function signToken(payload: JwtPayload): string {
  return jwt.sign(payload, config.jwtSecret, { expiresIn });
}

export function verifyToken(token: string): JwtPayload {
  return jwt.verify(token, config.jwtSecret) as JwtPayload;
}