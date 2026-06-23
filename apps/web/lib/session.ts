import { getIronSession, IronSession } from "iron-session";
import { cookies } from "next/headers";

export interface SessionData { sessionId: string; createdAt: number; }

export const sessionOptions = {
  get password() {
    const secret = process.env.SESSION_SECRET;
    if (process.env.NODE_ENV === "production" && (!secret || secret.length < 32)) {
      throw new Error("SESSION_SECRET environment variable is required and must be at least 32 characters long in production!");
    }
    return secret || "d8a4362b9f3fe2b0d0c3eb1a47df2c6c0e81b6e4d07b4694b29c91b5c468e21a";
  },
  cookieName: "dlg_session",
  cookieOptions: { secure: process.env.NODE_ENV === "production", maxAge: 86400, httpOnly: true, sameSite: "lax" as const },
};

export const getSession = async (req: any, res: any): Promise<IronSession<SessionData>> => getIronSession<SessionData>(req, res, sessionOptions);
export const getServerSession = async (): Promise<IronSession<SessionData>> => getIronSession<SessionData>(await cookies(), sessionOptions);
