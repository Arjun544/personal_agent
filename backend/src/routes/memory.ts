import { Router } from "express";
import { memoryController } from "../controllers/memory";
import { requireAuth } from "../middleware/auth";

const router = Router();

router.get("/", requireAuth, memoryController.getMemories);

export { router as memoryRoutes };

