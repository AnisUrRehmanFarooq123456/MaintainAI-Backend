import express from "express";
import upload from "../middleware/upload-middleware.js";
import { UploadEvidence } from "../controller/upload-controller.js";
import { publicEndpointLimiter } from "../middleware/rate-limiter.js";

const router = express.Router();

// Public — used by both the anonymous issue-report form and the technician's maintenance form
router.route("/api/upload/evidence").post(publicEndpointLimiter, upload.array("files", 5), UploadEvidence);

export default router;