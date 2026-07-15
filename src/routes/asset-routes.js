import express from "express";
import { AddAsset, GetAllAssets, GetAssetById, GetPublicAssetByCode, UpdateAsset, RetireAsset } from "../controller/asset-controller.js";
import { verifyToken, requireRole } from "../middleware/auth-middleware.js";

const router = express.Router();

router.route("/api/asset/add-asset").post(verifyToken, requireRole("admin"), AddAsset);
router.route("/api/asset/get-all-assets").get(verifyToken, GetAllAssets);
router.route("/api/asset/get-asset/:id").get(verifyToken, GetAssetById);
router.route("/api/asset/public/:assetCode").get(GetPublicAssetByCode); // public — no auth
router.route("/api/asset/update-asset/:id").put(verifyToken, requireRole("admin"), UpdateAsset);
router.route("/api/asset/retire-asset/:id").put(verifyToken, requireRole("admin"), RetireAsset);

export default router;