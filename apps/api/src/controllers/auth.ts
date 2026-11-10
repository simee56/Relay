import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import type { Request, Response } from "express";
import {
    COOKIE_NAME,
    JWT_SECRET,
    SESSION_DAYS,
    clearCookieOptions,
    cookieOptions,
} from "../auth";
import { getAuth } from "../middleware/auth";
import { createAccount, findUserByEmail, findUserById } from "../models/users";
import { findTenantById } from "../models/tenants";
import { uniqueViolationConstraint } from "../utils";

const BCRYPT_COST = 12;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const DUMMY_HASH = bcrypt.hashSync("not-a-real-password", BCRYPT_COST);

function startSession(res: Response, userId: string, tenantId: string) {
    const token = jwt.sign({ sub: userId, tid: tenantId }, JWT_SECRET, {
        expiresIn: SESSION_DAYS * 24 * 60 * 60,
    });
    res.cookie(COOKIE_NAME, token, cookieOptions);
}

export async function register(req: Request, res: Response) {
    const body = (req.body ?? {}) as Record<string, unknown>;
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const password = typeof body.password === "string" ? body.password : "";
    const businessName = typeof body.business_name === "string" ? body.business_name.trim() : "";

    if (!EMAIL_PATTERN.test(email) || email.length > 254) {
        res.status(400).json({ error: "a valid email is required" });
        return;
    }
    if (password.length < 8 || password.length > 72) {
        res.status(400).json({ error: "password must be 8 to 72 characters" });
        return;
    }
    if (!businessName || businessName.length > 100) {
        res.status(400).json({ error: "business_name must be 1 to 100 characters" });
        return;
    }

    try {
        const passwordHash = await bcrypt.hash(password, BCRYPT_COST);
        const { user, tenant } = await createAccount(businessName, email, passwordHash);

        startSession(res, user.id, tenant.id);
        res.status(201).json({
            user: { id: user.id, email: user.email },
            tenant: { id: tenant.id, name: tenant.name },
        });
    } catch (err) {
        const constraint = uniqueViolationConstraint(err);
        if (constraint === "users_email_unique") {
            res.status(409).json({ error: "An account with that email already exists" });
            return;
        }
        if (constraint !== null) {
            res.status(409).json({ error: "A business with that name already exists" });
            return;
        }
        console.error(err);
        res.status(500).json({ error: "Could not create the account" });
    }
}

export async function login(req: Request, res: Response) {
    const body = (req.body ?? {}) as Record<string, unknown>;
    const email = typeof body.email === "string" ? body.email.trim() : "";
    const password = typeof body.password === "string" ? body.password : "";

    if (!email || !password || password.length > 72) {
        res.status(401).json({ error: "Invalid email or password" });
        return;
    }

    try {
        const user = await findUserByEmail(email);

        const matches = await bcrypt.compare(password, user?.password_hash ?? DUMMY_HASH);

        if (!user || !matches) {
            res.status(401).json({ error: "Invalid email or password" });
            return;
        }

        const tenant = await findTenantById(user.tenant_id);
        if (!tenant) {
            res.status(401).json({ error: "Invalid email or password" });
            return;
        }

        startSession(res, user.id, tenant.id);
        res.json({
            user: { id: user.id, email: user.email },
            tenant: { id: tenant.id, name: tenant.name },
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Could not log in" });
    }
}

export function logout(_req: Request, res: Response) {
    res.clearCookie(COOKIE_NAME, clearCookieOptions);
    res.json({ ok: true });
}

export async function me(_req: Request, res: Response) {
    const { userId, tenantId } = getAuth(res);

    try {
        const [user, tenant] = await Promise.all([findUserById(userId), findTenantById(tenantId)]);

        if (!user || !tenant) {
            res.clearCookie(COOKIE_NAME, clearCookieOptions);
            res.status(401).json({ error: "Not logged in" });
            return;
        }

        res.json({
            user: { id: user.id, email: user.email },
            tenant: { id: tenant.id, name: tenant.name },
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Could not load your account" });
    }
}