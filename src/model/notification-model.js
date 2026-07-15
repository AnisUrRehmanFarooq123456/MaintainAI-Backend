import mongoose from "mongoose";

const NotificationSchema = new mongoose.Schema(
    {
        recipient: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "users",
            required: true,
        },
        title: {
            type: String,
            required: true,
        },
        message: {
            type: String,
        },
        type: {
            type: String,
            enum: ["issue_assigned", "issue_resolved", "issue_critical", "maintenance_due"],
            default: "issue_assigned",
        },
        relatedIssue: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "issues",
        },
        isRead: {
            type: Boolean,
            default: false,
        },
    },
    {
        collection: "notifications",
        timestamps: true,
    }
);

const NotificationModel = mongoose.model("notifications", NotificationSchema);

export default NotificationModel;