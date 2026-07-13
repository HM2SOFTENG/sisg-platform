import type { AuthUser, SisgRole } from "@sisg/types";

declare global {
  namespace Express {
    interface Request {
      auth?: {
        sessionId: string;
        user: AuthUser;
        roles: SisgRole[];
      };
    }
  }
}

export {};
