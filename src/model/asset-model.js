import mongoose from "mongoose";

const AssetSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
        },
        assetCode: {
            type: String,
            required: true,
            unique: true, // rule: duplicate asset codes must be rejected
        },
        category: {
            type: String,
        },
        location: {
            type: String,
        },
        condition: {
            type: String,
            enum: ["Good", "Fair", "Poor", "Unsafe"],
            default: "Good",
        },
        status: {
            type: String,
            enum: [
                "Operational",
                "Issue Reported",
                "Under Inspection",
                "Under Maintenance",
                "Out of Service",
                "Retired",
            ],
            default: "Operational",
        },
        lastServiceDate: {
            type: Date,
        },
        nextServiceDate: {
            type: Date,
        },
        assignedTechnician: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "users",
        },
        qrCodeUrl: {
            type: String, // generated QR image URL/data
        },
        publicUrl: {
            type: String, // safe public page link encoded in the QR
        },
        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "users",
        },
    },
    {
        collection: "assets",
        timestamps: true,
    }
);

const AssetModel = mongoose.model("assets", AssetSchema);

export default AssetModel;