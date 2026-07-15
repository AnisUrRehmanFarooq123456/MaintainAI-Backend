import express from "express";
import { AddMaintenanceRecord, GetMaintenanceByIssue, GetAllMaintenanceRecords, GetScheduledMaintenanceOverview } from "../controller/maintenance-controller.js";
import { verifyToken, requireRole } from "../middleware/auth-middleware.js";

const router = express.Router();

router.route("/api/maintenance/add").post(verifyToken, requireRole("technician", "admin"), AddMaintenanceRecord);
router.route("/api/maintenance/get-by-issue/:issueId").get(verifyToken, GetMaintenanceByIssue);
router.route("/api/maintenance/get-all").get(verifyToken, requireRole("admin", "supervisor"), GetAllMaintenanceRecords);
router.route("/api/maintenance/scheduled-overview").get(verifyToken, requireRole("admin", "supervisor"), GetScheduledMaintenanceOverview);
router.route("/api/maintenance/scheduled-overview").get(verifyToken, requireRole("admin", "supervisor", "technician"), GetScheduledMaintenanceOverview);

export default router;