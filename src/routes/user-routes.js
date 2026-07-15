import express from "express"
import {
    AddUser,
    GetAllUsers,
    GetOneUserByEmail,
    GetOneUserByPhoneNumber,
    ChangePasswordByEmail,
    ChangePasswordByPhoneNumber,
    RequestPasswordOtp,
    ResetPasswordWithOtp,
    ToggleBlockUser,
    DeleteUser,
    GetMyProfile,
    UpdateMyProfile
} from "../controller/user-controller.js"
import { verifyToken, requireRole } from "../middleware/auth-middleware.js"
import { publicEndpointLimiter } from "../middleware/rate-limiter.js"

const router = express.Router()

router.route("/api/add-user").post(AddUser)
router.route("/api/getAllUsers").get(verifyToken, requireRole("admin", "supervisor"), GetAllUsers)
router.route("/api/getUserByEmail").post(GetOneUserByEmail)
router.route("/api/getUserByPhoneNumber").post(GetOneUserByPhoneNumber)
router.put("/api/changePasswordByEmail", ChangePasswordByEmail);
router.put("/api/changePasswordByPhoneNumber", ChangePasswordByPhoneNumber);
router.route("/api/request-password-otp").post(publicEndpointLimiter, RequestPasswordOtp)
router.route("/api/reset-password-otp").post(publicEndpointLimiter, ResetPasswordWithOtp)
router.route("/api/users/block/:id").put(verifyToken, requireRole("admin"), ToggleBlockUser)
router.route("/api/users/delete/:id").delete(verifyToken, requireRole("admin"), DeleteUser)
router.route("/api/profile/me").get(verifyToken, GetMyProfile)
router.route("/api/profile/update").put(verifyToken, UpdateMyProfile)

export default router