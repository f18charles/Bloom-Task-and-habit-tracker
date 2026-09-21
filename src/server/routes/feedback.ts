import { Router } from "express";
import { submitFeedback, getUserFeedbacks } from "../controllers/feedbackController.ts";
import { authenticate } from "../middleware/auth.ts";

const router = Router();

router.use(authenticate);

router.post("/", submitFeedback);
router.get("/", getUserFeedbacks);

export default router;
