import "dotenv/config";

const secret = process.env.JWT_SECRET;

if (!secret || secret.length < 32) {
    throw new Error("JWT_SECRET is missing or too short. Add 32+ random characters to apps/api/.env");
}

export const JWT_SECRET: string = secret;
export const COOKIE_NAME = "relay_session";
export const SESSION_DAYS = 7;

const isProduction = process.env.NODE_ENV === "production";

export const cookieOptions = {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: isProduction,
    path: "/",
    maxAge: SESSION_DAYS * 24 * 60 * 60 * 1000,
};

export const clearCookieOptions = {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: isProduction,
    path: "/",
};