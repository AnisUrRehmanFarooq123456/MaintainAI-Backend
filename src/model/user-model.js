import mongoose from "mongoose";

const UserSchema = new mongoose.Schema(
    {
        fullName: { type: String, required: true },
        email: { type: String, required: true, unique: true, lowercase: true },
        phoneNumber: { type: String },
        password: { type: String, required: true },
        role: {
            type: String,
            enum: ["admin", "technician", "supervisor", "reporter"],
            default: "reporter",
        },
        specialization: { type: String },
        isBlocked: { type: Boolean, default: false },
    },
    {
        collection: "users",
        timestamps: true,
    }
);

const UserModel = mongoose.model("users", UserSchema);

export default UserModel;