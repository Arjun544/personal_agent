import { NextFunction, Request, Response } from "express";
import { AppError, ValidationError } from "../utils/errors";
import { logger } from "./logger";

export const errorHandler = (
    err: Error,
    req: Request,
    res: Response,
    next: NextFunction,
) => {
    if (err instanceof AppError) {
        return res.status(err.statusCode).json({
            status: "error",
            message: err.message,
            ...(err instanceof ValidationError && { errors: err.errors }),
        });
    }

    // Log unexpected errors
    logger.error({
        error: err.message,
        stack: err.stack,
        url: req.url,
        method: req.method,
    });

    // Don't leak error details in production
    const message =
        process.env.NODE_ENV === "production"
            ? "Internal server error"
            : err.message;

    res.status(500).json({
        status: "error",
        message,
    });
};

// Async error wrapper
export const asyncHandler = (
    fn: (req: Request, res: Response, next: NextFunction) => Promise<any>,
) => {
    return (req: Request, res: Response, next: NextFunction) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
};
