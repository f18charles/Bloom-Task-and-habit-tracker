import { Router } from "express";
import { getStats, exportUserData } from "../controllers/userController.ts";
import { authenticate } from "../middleware/auth.ts";

const router = Router();

router.get("/stats", authenticate, getStats);
router.get("/export", authenticate, exportUserData);

export default router;
