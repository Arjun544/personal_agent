import { NextFunction, Request, Response } from "express";
import pino from "pino";

const logger = pino({
    level: process.env.LOG_LEVEL || "info",
    transport: {
        target: "pino-pretty",
        options: { colorize: true },
    },
});

export const requestLogger = (
    req: Request,
    res: Response,
    next: NextFunction,
) => {
    const start = Date.now();

    // Log response when finished
    res.on("finish", () => {
        const duration = Date.now() - start;
        logger.info({
            method: req.method,
            url: req.url,
            status: res.statusCode,
            duration: `${duration}ms`,
            userAgent: req.headers["user-agent"],
            ip: req.ip,
        });
    });

    next();
};

export { logger };
