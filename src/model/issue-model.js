import mongoose from "mongoose";

const IssueSchema = new mongoose.Schema(
    {
        issueNumber: {
            type: String,
            required: true,
            unique: true,
        },
        asset: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "assets",
            required: true,
        },
        title: {
            type: String,
            required: true,
        },
        description: {
            type: String,
            required: true,
        },
        category: {
            type: String,
        },
        priority: {
            type: String,
            enum: ["Low", "Medium", "High", "Critical"],
            default: "Medium",
        },
        status: {
            type: String,
            enum: [
                "Reported",
                "Assigned",
                "Inspection Started",
                "Maintenance In Progress",
                "Waiting for Parts",
                "Resolved",
                "Closed",
                "Reopened",
            ],
            default: "Reported",
        },
        isCritical: {
            type: Boolean,
            default: false, // must be visually distinguishable on the frontend
        },

        // reporter info (may be a public/anonymous user)
        reporterName: {
            type: String,
        },
        reporterContact: {
            type: String,
        },
        reporterUser: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "users", // set only if the reporter was logged in (role: reporter) when submitting
        },

        evidence: [
            {
                type: String, // Cloudinary/media URLs
            },
        ],

        assignedTechnician: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "users",
        },

        // AI Issue Triage tracking
        aiSuggestion: {
            title: String,
            category: String,
            priority: String,
            possibleCauses: [String],
            initialChecks: [String],
        },
        aiSuggested: {
            type: Boolean,
            default: false,
        },
        aiEdited: {
            type: Boolean,
            default: false,
        },
    },
    {
        collection: "issues",
        timestamps: true,
    }
);

const IssueModel = mongoose.model("issues", IssueSchema);

export default IssueModel;