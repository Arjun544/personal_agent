import { Request, Response } from 'express';
import { asyncHandler } from "../middleware/error-handler";
import * as memoryService from "../services/memory";
import { UnauthorizedError } from "../utils/errors";
import { ApiResponse } from "../utils/response";

export const memoryController = {
    getMemories: asyncHandler(async (req: Request | any, res: Response) => {
        const userId = req.auth?.userId;
        const { limit = '20', cursor } = req.query as { limit?: string, cursor?: string };

        if (!userId) {
            throw new UnauthorizedError();
        }

        const limitNum = parseInt(limit);

        const data = await memoryService.getMemories(userId, limitNum, cursor);
        return ApiResponse.success(res, data);
    }),
};
