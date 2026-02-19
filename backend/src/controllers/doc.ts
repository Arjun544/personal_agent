import { Request, Response } from "express";
import { asyncHandler } from "../middleware/error-handler";
import { ingestPDF, listDocuments } from "../services/doc";
import { UnauthorizedError, ValidationError } from "../utils/errors";
import { ApiResponse } from "../utils/response";

export const docController = {
    ingest: asyncHandler(async (req: Request | any, res: Response) => {
        const userId = req.auth?.userId;
        const file = req.file;
        const { conversationId } = req.body as { conversationId: string };


        if (!userId) {
            throw new UnauthorizedError();
        }

        if (!file) {
            throw new ValidationError("No PDF file provided");
        }

        try {
            const result = await ingestPDF(userId as string, file.buffer, file.originalname, conversationId);

            return ApiResponse.success(res, { ...result, message: "PDF ingested successfully" });
        } catch (error) {
            console.error("Error ingesting PDF:", error);
            throw error;
        }
    }),
    list: asyncHandler(async (req: Request | any, res: Response) => {
        const userId = req.auth?.userId;
        if (!userId) {
            throw new UnauthorizedError();
        }

        const documents = await listDocuments(userId);
        return ApiResponse.success(res, { documents });
    }),
};
