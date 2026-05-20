import { Router } from "express";
import { register, login, getMe, forgotPassword, resetPassword } from "../controllers/authController.ts";
import { authenticate } from "../middleware/auth.ts";

const router = Router();

router.post("/register", register);
router.post("/login", login);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);
router.get("/me", authenticate, getMe);

export default router;
