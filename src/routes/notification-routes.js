import express from "express";
import { GetMyNotifications, MarkNotificationRead } from "../controller/notification-controller.js";
import { verifyToken } from "../middleware/auth-middleware.js";

const router = express.Router();

router.route("/api/notifications/mine").get(verifyToken, GetMyNotifications);
router.route("/api/notifications/read/:id").put(verifyToken, MarkNotificationRead);

export default router;