import mongoose from "mongoose";

const MaintenanceSchema = new mongoose.Schema(
    {
        issue: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "issues",
            required: true,
        },
        asset: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "assets",
            required: true,
        },
        technician: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "users",
            required: true,
        },
        inspectionFindings: {
            type: String,
        },
        workPerformed: {
            type: String,
            required: true, // rule: issue cannot be resolved without a maintenance note
        },
        partsUsed: [
            {
                partName: String,
                quantity: Number,
                cost: {
                    type: Number,
                    min: 0, // rule: maintenance cost cannot be negative
                },
            },
        ],
        totalCost: {
            type: Number,
            min: 0, // rule: maintenance cost cannot be negative
            default: 0,
        },
        timeSpentMinutes: {
            type: Number,
        },
        evidence: [
            {
                type: String, // Cloudinary/media URLs
            },
        ],
        finalCondition: {
            type: String,
            enum: ["Good", "Fair", "Poor", "Unsafe"],
        },
        completedAt: {
            type: Date,
        },
    },
    {
        collection: "maintenance",
        timestamps: true,
    }
);

const MaintenanceModel = mongoose.model("maintenance", MaintenanceSchema);

export default MaintenanceModel;