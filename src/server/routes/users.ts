import { Router } from "express";
import { getStats } from "../controllers/userController.ts";
import { authenticate } from "../middleware/auth.ts";

const router = Router();

router.get("/stats", authenticate, getStats);

export default router;
