import { Request, Response } from 'express';
import { asyncHandler } from "../middleware/error-handler";
import * as memoryService from "../services/memory";
import { UnauthorizedError } from "../utils/errors";
import { ApiResponse } from "../utils/response";

export const memoryController = {
    getMemories: asyncHandler(async (req: Request | any, res: Response) => {
        const userId = req.auth?.userId;
        if (!userId) {
            throw new UnauthorizedError();
        }

        const memories = await memoryService.getMemories(userId);
        return ApiResponse.success(res, { memories });
    }),
};
