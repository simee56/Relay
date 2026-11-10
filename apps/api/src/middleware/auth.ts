import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { COOKIE_NAME, JWT_SECRET } from "../auth";

export type AuthContext = { userId: string; tenantId: string };

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const token = req.cookies?.[COOKIE_NAME];

  if (typeof token !== "string") {
    res.status(401).json({ error: "Not logged in" });
    return;
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET) as jwt.JwtPayload;

    if (typeof payload.sub !== "string" || typeof payload.tid !== "string") {
      throw new Error("token is missing fields");
    }

    const auth: AuthContext = { userId: payload.sub, tenantId: payload.tid };
    res.locals.auth = auth; 
    next();
  } catch {
    res.status(401).json({ error: "Not logged in" });
  }
}

export function getAuth(res: Response): AuthContext {
  return res.locals.auth as AuthContext;
}