import express from "express";
import { GetAssetHistory, GetAllHistory } from "../controller/history-controller.js";
import { verifyToken, requireRole } from "../middleware/auth-middleware.js";

const router = express.Router();

router.route("/api/history/asset/:assetId").get(verifyToken, GetAssetHistory);
router.route("/api/history/all").get(verifyToken, requireRole("admin", "supervisor"), GetAllHistory);

export default router;