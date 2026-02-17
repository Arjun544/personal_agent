import { Router } from "express";
import { z } from "zod";
import { historyController } from "../controllers/history";
import { requireAuth } from "../middleware/auth";
import { validate } from "../middleware/validation";

const router = Router();

const renameSchema = z.object({
    body: z.object({
        id: z.string().min(1, "ID is required"),
        message: z.string().min(1, "Message is required"),
    }),
});

const getMessagesSchema = z.object({
    query: z.object({
        id: z.string().min(1, "ID is required"),
        limit: z.string().optional(),
        cursor: z.string().optional(),
    }),
});

router.post("/create", requireAuth, historyController.createConversation);
router.post("/rename", requireAuth, validate(renameSchema), historyController.generateConversationName);
router.get("/conversations", requireAuth, historyController.getConversations);
router.get("/messages", requireAuth, validate(getMessagesSchema), historyController.getMessages);
router.delete("/conversation/:id", requireAuth, historyController.deleteConversation);
router.delete("/message", requireAuth, historyController.deleteMessage);

export { router as historyRoutes };

