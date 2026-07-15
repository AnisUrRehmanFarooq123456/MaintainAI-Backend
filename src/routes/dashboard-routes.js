import express from "express";
import { GetAdminDashboardStats } from "../controller/dashboard-controller.js";
import { verifyToken, requireRole } from "../middleware/auth-middleware.js";
import { GetAdminAnalytics } from "../controller/dashboard-controller.js";
import { GetTechnicianDashboardStats } from "../controller/dashboard-controller.js";
import { GetReporterDashboardStats } from "../controller/dashboard-controller.js";

const router = express.Router();

router.route("/api/dashboard/admin-stats").get(verifyToken, requireRole("admin"), GetAdminDashboardStats);
router.route("/api/dashboard/admin-analytics").get(verifyToken, requireRole("admin"), GetAdminAnalytics);
router.route("/api/dashboard/technician-stats").get(verifyToken, requireRole("technician"), GetTechnicianDashboardStats);
router.route("/api/dashboard/reporter-stats").get(verifyToken, requireRole("reporter"), GetReporterDashboardStats);

export default router;