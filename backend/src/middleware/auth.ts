import { NextFunction, Request, Response } from "express";

export const requireAuth = (req: Request, res: Response, next: NextFunction) => {
    // @ts-ignore - auth is added by ClerkExpressWithAuth
    const userId = req.auth?.userId;
    if (!userId) {
        return res.status(401).json({
            message: "Unauthorized",
            success: false,
        });
    }
    next();
};
