import express from "express";
import { GetAssetQR, RegenerateAssetQR, DownloadAssetQR } from "../controller/qr-controller.js";
import { verifyToken, requireRole } from "../middleware/auth-middleware.js";

const router = express.Router();

router.route("/api/qr/:assetCode").get(verifyToken, GetAssetQR);
router.route("/api/qr/regenerate/:assetCode").put(verifyToken, requireRole("admin"), RegenerateAssetQR);
router.route("/api/qr/download/:assetCode").get(verifyToken, DownloadAssetQR);

export default router;