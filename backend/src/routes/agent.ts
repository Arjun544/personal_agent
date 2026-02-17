import express, { Router } from "express";
import { z } from "zod";
import { agentController } from "../controllers/agent";

const router = Router();

// Validation schema
const chatBodySchema = z.object({
    userId: z.string().optional(),
    agent: z.string().default("Personal"),
    message: z.string().optional(),
    socketId: z.string().optional(),
});

// Validation middleware
const validateChatBody = (req: express.Request, res: express.Response, next: express.NextFunction) => {
    try {
        chatBodySchema.parse(req.body);
        next();
    } catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({
                message: "Validation error",
                errors: error.errors,
                success: false,
            });
        }
        next(error);
    }
};

import { requireAuth } from "../middleware/auth";

router.post("/chat", requireAuth, validateChatBody, agentController.chat);

export { router as agentRoutes };

