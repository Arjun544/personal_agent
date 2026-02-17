import { Router } from "express";
import fs from "fs";
import multer from "multer";
import path from "path";
import { z } from "zod";
import { agentController } from "../controllers/agent";
import { docController } from "../controllers/doc";
import { requireAuth } from "../middleware/auth";
import { validate } from "../middleware/validation";

const router = Router();

// Configure multer for PDF uploads
const uploadDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
        cb(null, file.fieldname + "-" + uniqueSuffix + path.extname(file.originalname));
    },
});

const upload = multer({
    storage,
    fileFilter: (req, file, cb) => {
        if (file.mimetype === "application/pdf") {
            cb(null, true);
        } else {
            cb(new Error("Only PDF files are allowed") as any, false);
        }
    },
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB limit
    },
});

const chatSchema = z.object({
    body: z.object({
        message: z.string().min(1, "Message is required"),
        threadId: z.string().optional(),
        agent: z.string().optional().default("Personal"),
    }),
});

router.post("/chat", requireAuth, validate(chatSchema), agentController.chat);
router.post("/ingest-pdf", requireAuth, upload.single("pdf"), docController.ingest);
router.get("/documents", requireAuth, docController.list);

export { router as agentRoutes };

