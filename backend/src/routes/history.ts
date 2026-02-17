import { Router } from "express";
import { historyController } from "../controllers/history";

const router = Router();

import { requireAuth } from "../middleware/auth";

router.post("/create", requireAuth, historyController.createConversation);
router.post("/rename", requireAuth, historyController.generateConversationName);
router.get("/conversations", requireAuth, historyController.getConversations);
router.get("/messages", requireAuth, historyController.getMessages);

export { router as historyRoutes };
