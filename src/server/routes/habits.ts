import { Router } from "express";
import { 
  getHabits, 
  createHabit, 
  logHabit, 
  deleteHabit,
  getHabitStats
} from "../controllers/habitController.ts";
import { authenticate } from "../middleware/auth.ts";

const router = Router();

router.use(authenticate);

router.get("/", getHabits);
router.post("/", createHabit);
router.post("/:id/log", logHabit);
router.delete("/:id", deleteHabit);
router.get("/stats", getHabitStats);

export default router;
