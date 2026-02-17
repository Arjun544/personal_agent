import { NextFunction, Request, Response } from "express";
import { UnauthorizedError } from "../utils/errors";

export const requireAuth = (req: Request, res: Response, next: NextFunction) => {
    // @ts-ignore - auth is added by ClerkExpressWithAuth
    const userId = req.auth?.userId;
    if (!userId) {
        throw new UnauthorizedError();
    }
    next();
};

