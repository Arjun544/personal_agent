import { Router } from "express";
import { historyController } from "../controllers/history";

const router = Router();

router.post("/create", historyController.createConversation);
router.post("/rename", historyController.generateConversationName);
router.get("/conversations", historyController.getConversations);
router.get("/messages", historyController.getMessages);

export { router as historyRoutes };