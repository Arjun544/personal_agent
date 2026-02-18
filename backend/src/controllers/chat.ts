import { createClerkClient } from '@clerk/backend';
import { Request, Response } from "express";
import { asyncHandler } from "../middleware/error-handler";
import { agent } from "../services/agent";
import { UnauthorizedError, ValidationError } from "../utils/errors";
import { ApiResponse } from "../utils/response";

const clerkClient = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });

export const chatController = {
    chat: asyncHandler(async (req: Request | any, res: Response) => {
        const { message, threadId } = req.body;
        const userId = req.auth?.userId;

        if (!userId) {
            throw new UnauthorizedError();
        }

        if (!message) {
            throw new ValidationError("Message is required");
        }

        // Fetch Google OAuth token from Clerk
        let googleToken: string | undefined;
        try {
            const clerkResponse = await clerkClient.users.getUserOauthAccessToken(userId, 'oauth_google');
            googleToken = clerkResponse.data[0]?.token;
        } catch (error) {
            // Log error but continue
            console.error('Error fetching Clerk OAuth token:', error);
        }

        const config = {
            configurable: {
                thread_id: threadId || `user_${userId}`,
            },
            context: {
                userId,
                googleToken,
            } as const
        };

        const response = await agent.invoke(
            { messages: [{ role: "user", content: message }] },
            config
        );

        return ApiResponse.success(res, response);
    }),
};
