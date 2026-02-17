import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../middleware/auth";
import { validate } from "../middleware/validation";
import { agentController } from "../controllers/agent";

const router = Router();

const chatSchema = z.object({
    body: z.object({
        message: z.string().min(1, "Message is required"),
        threadId: z.string().optional(),
        agent: z.string().optional().default("Personal"),
    }),
});

router.post("/chat", requireAuth, validate(chatSchema), agentController.chat);

export { router as agentRoutes };