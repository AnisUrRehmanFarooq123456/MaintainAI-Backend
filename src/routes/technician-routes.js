import express from "express";
import { GetTechniciansOverview } from "../controller/technician-controller.js";
import { verifyToken, requireRole } from "../middleware/auth-middleware.js";

const router = express.Router();

router.route("/api/technicians/overview").get(verifyToken, requireRole("admin", "supervisor", "technician"), GetTechniciansOverview);

export default router;