import { Response } from "express";

export class ApiResponse {
    static success<T>(
        res: Response,
        data: T,
        message?: string,
        statusCode = 200,
    ) {
        return res.status(statusCode).json({
            status: "success",
            message,
            data,
        });
    }

    static error(res: Response, message: string, statusCode = 500, errors?: any) {
        return res.status(statusCode).json({
            status: "error",
            message,
            ...(errors && { errors }),
        });
    }

    static paginated<T>(
        res: Response,
        data: T[],
        page: number,
        limit: number,
        total: number,
    ) {
        return res.json({
            status: "success",
            data,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit),
            },
        });
    }
}
