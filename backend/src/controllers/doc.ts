import { Request, Response } from "express";
import fs from "fs";
import { asyncHandler } from "../middleware/error-handler";
import { UnauthorizedError, ValidationError } from "../utils/errors";
import { ApiResponse } from "../utils/response";
import { ingestPDF, listDocuments } from "../services/doc";

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
            await ingestPDF(userId, file.path, conversationId);

            // Optionally delete the file after ingestion if you don't want to keep it
            // fs.unlinkSync(file.path);

            return ApiResponse.success(res, { message: "PDF ingested successfully" });
        } catch (error) {
            console.error("Error ingesting PDF:", error);
            // Delete file on error too
            if (fs.existsSync(file.path)) {
                fs.unlinkSync(file.path);
            }
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
