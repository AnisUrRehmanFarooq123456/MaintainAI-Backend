import express from "express";
import { ReportIssue, GetAllIssues, GetIssueById, GetMyIssues, AssignTechnician, UpdateIssueStatus, ApproveIssue, ReopenIssue } from "../controller/issue-controller.js";
import { verifyToken, requireRole, attachUserIfPresent } from "../middleware/auth-middleware.js";
import { publicEndpointLimiter } from "../middleware/rate-limiter.js";

const router = express.Router();

router.route("/api/issue/report-issue").post(publicEndpointLimiter, attachUserIfPresent, ReportIssue);
router.route("/api/issue/get-all-issues").get(verifyToken, GetAllIssues);
router.route("/api/issue/get-issue/:id").get(verifyToken, GetIssueById);
router.route("/api/issue/assign/:id").put(verifyToken, requireRole("admin", "supervisor"), AssignTechnician);
router.route("/api/issue/update-status/:id").put(verifyToken, requireRole("technician", "admin"), UpdateIssueStatus);
router.route("/api/issue/approve/:id").put(verifyToken, requireRole("supervisor"), ApproveIssue);
router.route("/api/issue/reopen/:id").put(verifyToken, requireRole("admin", "supervisor"), ReopenIssue);
router.route("/api/issue/my-issues").get(verifyToken, requireRole("reporter"), GetMyIssues);


export default router;
