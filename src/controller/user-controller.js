import UserModel from "../model/user-model.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken"
import redisClient from "../config/redis-client.js";
import { sendEmail } from "../service/email-service.js";

const ALLOWED_ROLES = ["admin", "technician", "supervisor", "reporter"];

const AddUser = async (req, res) => {
    try {
        const { userName, userEmail, userPhone, userPass, userRole, specialization } = req.body
        if (!userName || !userEmail || !userPhone || !userPass || !userRole) {
            return res.status(400).send({ status: false, message: "All Fields are required" })
        }
        if (userName.trim().length < 3 || userName.trim().length > 30) {
            return res.status(400).send({ status: false, message: "Full name must be at least 3 characters and not more than 30 characters" });
        }
        if (!/^[A-Za-z\s]+$/.test(userName)) {
            return res.status(400).send({ status: false, message: "Full name can only contain letters and spaces" });
        }
        const parts = userEmail.split("@");
        if (parts.length !== 2 || parts[0].length === 0 || parts[1].length === 0 || !parts[1].endsWith(".com")) {
            return res.status(400).send({ status: false, message: "Email must be in format user@example.com" });
        }
        const emailExists = await UserModel.findOne({ email: userEmail })
        if (emailExists) {
            return res.status(400).send({ status: false, message: "Email Already Exist" })
        }
        if (!/^[0-9]+$/.test(userPhone)) {
            return res.status(400).send({ status: false, message: "Phone number must contain only digits" });
        }
        if (userPhone.length !== 11) {
            return res.status(400).send({ status: false, message: "Phone number must be exactly 11 digits (example: 03022217117) Pakistan" });
        }
        const phoneExists = await UserModel.findOne({ phoneNumber: userPhone })
        if (phoneExists) {
            return res.status(400).send({ status: false, message: "Phone Number Already Exist" })
        }
        if (userPass.length < 8 || userPass.length > 20) {
            return res.status(400).send({ status: false, message: "Password must be at least 8 characters and not more than 20 characters" });
        }
        if (!ALLOWED_ROLES.includes(userRole)) {
            return res.status(400).send({ status: false, message: "Only admin, technician, supervisor or reporter is allowed" });
        }
        const hashed = await bcrypt.hash(userPass, 15)
        const newUser = { fullName: userName, email: userEmail, phoneNumber: userPhone, password: hashed, role: userRole, specialization }
        const addUser = new UserModel(newUser)
        const saveUser = await addUser.save()

        if (saveUser) {
            return res.status(200).send({ status: true, message: "User has been registered Successfully!" })
        }
    }
    catch (error) {
        console.log("Error While Adding User to DB: ", error)
        return res.status(500).send({ status: false, message: "Error While Adding User to DB" })
    }
}

const GetAllUsers = async (req, res) => {
    try {
        const { role } = req.query;
        const filter = {};
        if (role && role !== "all") {
            if (!ALLOWED_ROLES.includes(role)) {
                return res.status(400).send({ status: false, message: "Invalid role filter" });
            }
            filter.role = role;
        }
        const allUsers = await UserModel.find(filter).select("fullName email phoneNumber role isBlocked createdAt").sort({ createdAt: -1 });
        return res.status(200).send({ status: true, data: allUsers });
    }
    catch (err) {
        return res.status(500).send({ status: false, message: "Error While Fetching Users" });
    }
};

const GetOneUserByEmail = async (req, res) => {
    try {
        const { email, password, role } = req.body;
        if (!email || !password || !role) {
            return res.status(400).send({ status: false, message: "Email, Password and Role are required!" });
        }
        if (!ALLOWED_ROLES.includes(role)) {
            return res.status(400).send({ status: false, message: "Invalid role. Only admin, technician, supervisor or reporter allowed!" });
        }
        const user = await UserModel.findOne({ email });
        if (!user) {
            return res.status(400).send({ status: false, message: "User does not exist" });
        }
        if (user.role !== role) {
            return res.status(400).send({ status: false, message: `This account is not registered as ${role}` });
        }
        if (user.isBlocked) {
            return res.status(403).send({ status: false, message: "This account has been blocked. Please contact an administrator." });
        }
        const checkPass = await bcrypt.compare(password, user.password);
        if (!checkPass) {
            return res.status(400).send({ status: false, message: "Incorrect Password" });
        }
        const token = jwt.sign(
            { id: user._id, fullName: user.fullName, email: user.email, role: user.role },
            process.env.JWT_KEY,
            { expiresIn: "1h" }
        );
        return res.status(200).send({
            status: true,
            message: "Login Successful",
            token,
            user: { id: user._id, fullName: user.fullName, email: user.email, role: user.role }
        });
    }
    catch (error) {
        console.log("Error: ", error)
        return res.status(500).send({ status: false, message: "Error While Fetching User" })
    }
}

const GetOneUserByPhoneNumber = async (req, res) => {
    try {
        const { phoneNumber, password } = req.body;
        if (!phoneNumber || !password) {
            return res.status(400).send({ status: false, message: "Phone number and password are required!" });
        }
        const user = await UserModel.findOne({ phoneNumber });
        if (!user) {
            return res.status(404).send({ status: false, message: "User with this phone number does not exist." });
        }
        if (user.isBlocked) {
            return res.status(403).send({ status: false, message: "This account has been blocked. Please contact an administrator." });
        }
        const checkPass = await bcrypt.compare(password, user.password);
        if (!checkPass) {
            return res.status(400).send({ status: false, message: "Incorrect password." });
        }
        const token = jwt.sign(
            { id: user._id, fullName: user.fullName, role: user.role },
            process.env.JWT_KEY,
            { expiresIn: "1h" }
        );
        return res.status(200).send({ status: true, message: "User fetched successfully.", token });
    }
    catch (error) {
        return res.status(500).send({ status: false, message: "Error while fetching user." });
    }
};

const ChangePasswordByEmail = async (req, res) => {
    try {
        const { email, oldPassword, newPassword } = req.body;
        if (!email || !oldPassword || !newPassword) {
            return res.status(400).send({ status: false, message: "Email, old password and new password are required." });
        }
        if (newPassword.length < 8) {
            return res.status(400).send({ status: false, message: "New password must be at least 8 characters." });
        }
        const user = await UserModel.findOne({ email });
        if (!user) {
            return res.status(404).send({ status: false, message: "User of this email does not exist." });
        }
        const isMatch = await bcrypt.compare(oldPassword, user.password);
        if (!isMatch) {
            return res.status(400).send({ status: false, message: "Old password is incorrect." });
        }
        const isSamePassword = await bcrypt.compare(newPassword, user.password);
        if (isSamePassword) {
            return res.status(400).send({ status: false, message: "New password must be different from the old password." });
        }
        const hashedPassword = await bcrypt.hash(newPassword, 15);
        user.password = hashedPassword;
        await user.save();
        return res.status(200).send({ status: true, message: "Password changed successfully." });
    }
    catch (error) {
        return res.status(500).send({ status: false, message: "Error while changing password." });
    }
};

const ChangePasswordByPhoneNumber = async (req, res) => {
    try {
        const { phoneNumber, oldPassword, newPassword } = req.body;
        if (!phoneNumber || !oldPassword || !newPassword) {
            return res.status(400).send({ status: false, message: "Phone number, old password and new password are required." });
        }
        if (newPassword.length < 8) {
            return res.status(400).send({ status: false, message: "New password must be at least 8 characters." });
        }
        const user = await UserModel.findOne({ phoneNumber });
        if (!user) {
            return res.status(404).send({ status: false, message: "User with this phone number does not exist." });
        }
        const isMatch = await bcrypt.compare(oldPassword, user.password);
        if (!isMatch) {
            return res.status(400).send({ status: false, message: "Old password is incorrect." });
        }
        const isSamePassword = await bcrypt.compare(newPassword, user.password);
        if (isSamePassword) {
            return res.status(400).send({ status: false, message: "New password must be different from the old password." });
        }
        const hashedPassword = await bcrypt.hash(newPassword, 15);
        user.password = hashedPassword;
        await user.save();
        return res.status(200).send({ status: true, message: "Password changed successfully." });
    }
    catch (error) {
        return res.status(500).send({ status: false, message: "Error while changing password." });
    }
};

const RequestPasswordOtp = async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) {
            return res.status(400).send({ status: false, message: "Email is required" });
        }
        const user = await UserModel.findOne({ email });
        if (!user) {
            return res.status(404).send({ status: false, message: "No account found with this email" });
        }

        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        await redisClient.set(`otp:${email}`, otp, "EX", 600);

        await sendEmail({
            to: email,
            subject: "MaintainIQ Password Reset OTP",
            text: `Your OTP to reset your password is ${otp}. It expires in 10 minutes. If you did not request this, please ignore this email.`
        });

        return res.status(200).send({ status: true, message: "OTP sent to your email" });
    } catch (error) {
        console.log("Error While Sending OTP: ", error);
        return res.status(500).send({ status: false, message: "Error While Sending OTP" });
    }
};

const ResetPasswordWithOtp = async (req, res) => {
    try {
        const { email, otp, newPassword } = req.body;
        if (!email || !otp || !newPassword) {
            return res.status(400).send({ status: false, message: "Email, OTP and new password are required" });
        }
        if (newPassword.length < 8) {
            return res.status(400).send({ status: false, message: "New password must be at least 8 characters" });
        }

        const storedOtp = await redisClient.get(`otp:${email}`);
        if (!storedOtp) {
            return res.status(400).send({ status: false, message: "OTP expired or not requested" });
        }
        if (storedOtp !== otp) {
            return res.status(400).send({ status: false, message: "Invalid OTP" });
        }

        const user = await UserModel.findOne({ email });
        if (!user) {
            return res.status(404).send({ status: false, message: "User not found" });
        }

        const hashed = await bcrypt.hash(newPassword, 15);
        user.password = hashed;
        await user.save();

        await redisClient.del(`otp:${email}`);

        return res.status(200).send({ status: true, message: "Password reset successfully" });
    } catch (error) {
        console.log("Error While Resetting Password: ", error);
        return res.status(500).send({ status: false, message: "Error While Resetting Password" });
    }
};

const ToggleBlockUser = async (req, res) => {
    try {
        const { id } = req.params;
        const user = await UserModel.findById(id);
        if (!user) {
            return res.status(404).send({ status: false, message: "User not found" });
        }
        if (user.role === "admin") {
            return res.status(400).send({ status: false, message: "Admin accounts cannot be blocked" });
        }
        user.isBlocked = !user.isBlocked;
        await user.save();
        return res.status(200).send({
            status: true,
            message: user.isBlocked ? "User blocked successfully" : "User unblocked successfully",
            data: { isBlocked: user.isBlocked }
        });
    } catch (error) {
        return res.status(500).send({ status: false, message: "Error While Updating User Status" });
    }
};

const DeleteUser = async (req, res) => {
    try {
        const { id } = req.params;
        const user = await UserModel.findById(id);
        if (!user) {
            return res.status(404).send({ status: false, message: "User not found" });
        }
        if (user.role === "admin") {
            return res.status(400).send({ status: false, message: "Admin accounts cannot be deleted" });
        }
        await UserModel.findByIdAndDelete(id);
        return res.status(200).send({ status: true, message: "User removed successfully" });
    } catch (error) {
        return res.status(500).send({ status: false, message: "Error While Deleting User" });
    }
};

const GetMyProfile = async (req, res) => {
    try {
        const user = await UserModel.findById(req.user.id).select("fullName email phoneNumber role specialization createdAt");
        if (!user) {
            return res.status(404).send({ status: false, message: "User not found" });
        }
        return res.status(200).send({ status: true, data: user });
    } catch (error) {
        return res.status(500).send({ status: false, message: "Error While Fetching Profile" });
    }
};

const UpdateMyProfile = async (req, res) => {
    try {
        const { fullName, phoneNumber, specialization } = req.body;
        const user = await UserModel.findById(req.user.id);
        if (!user) {
            return res.status(404).send({ status: false, message: "User not found" });
        }

        if (fullName) {
            if (fullName.trim().length < 3 || fullName.trim().length > 30) {
                return res.status(400).send({ status: false, message: "Full name must be at least 3 characters and not more than 30 characters" });
            }
            user.fullName = fullName.trim();
        }
        if (phoneNumber) {
            if (!/^[0-9]{11}$/.test(phoneNumber)) {
                return res.status(400).send({ status: false, message: "Phone number must be exactly 11 digits" });
            }
            user.phoneNumber = phoneNumber;
        }
        if (specialization !== undefined) {
            user.specialization = specialization;
        }

        await user.save();
        return res.status(200).send({ status: true, message: "Profile updated successfully" });
    } catch (error) {
        return res.status(500).send({ status: false, message: "Error While Updating Profile" });
    }
};

export {
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
}