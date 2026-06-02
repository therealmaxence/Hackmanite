import { getIronSession, IronSession } from "iron-session";
import { cookies } from "next/headers";

export interface SessionData {
  sessionId: string;
  createdAt: number;
}

export const sessionOptions = {
  get password() {
    const secret = process.env.SESSION_SECRET;
    if (process.env.NODE_ENV === "production") {
      if (!secret || secret.length < 32) {
        throw new Error("SESSION_SECRET environment variable is required and must be at least 32 characters long in production!");
      }
    }
    return secret || "d8a4362b9f3fe2b0d0c3eb1a47df2c6c0e81b6e4d07b4694b29c91b5c468e21a";
  },
  cookieName: "dlg_session",
  cookieOptions: {
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24, // 24h
    httpOnly: true,
    sameSite: "lax" as const,
  },
};

// For use in API Routes (Pages Router)
export async function getSession(
  req: any,
  res: any
): Promise<IronSession<SessionData>> {
  return getIronSession<SessionData>(req, res, sessionOptions);
}

// For use in App Router Route Handlers
export async function getServerSession(): Promise<IronSession<SessionData>> {
  const cookieStore = await cookies();
  return getIronSession<SessionData>(cookieStore, sessionOptions);
}
