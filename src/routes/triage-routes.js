import express from "express";
import { TriageIssue, GetPreventiveRecommendation } from "../controller/triage-controller.js";
import { verifyToken, requireRole } from "../middleware/auth-middleware.js";
import { publicEndpointLimiter } from "../middleware/rate-limiter.js";

const router = express.Router();

router.route("/api/triage/generate").post(publicEndpointLimiter, TriageIssue); // public + rate limited
router.route("/api/triage/preventive/:assetId").get(verifyToken, requireRole("admin", "supervisor"), GetPreventiveRecommendation);

export default router;