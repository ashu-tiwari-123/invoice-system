import express from "express";
import * as userController from "./user.controller.js";
import authMiddleware from "../../middlewares/auth.js";

const router = express.Router();

router.get("/me", authMiddleware, userController.getOrCreateCurrentUser);
router.patch("/me", authMiddleware, userController.updateCurrentUser);

export default router;
