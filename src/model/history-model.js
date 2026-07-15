import mongoose from "mongoose";

const HistorySchema = new mongoose.Schema(
    {
        asset: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "assets",
            required: true,
        },
        issue: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "issues", // optional — some history events aren't issue-related
        },
        actor: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "users",
        },
        action: {
            type: String,
            required: true, // e.g. "Asset Registered", "Issue Reported", "Status Changed to Resolved"
        },
        description: {
            type: String,
        },
    },
    {
        collection: "history",
        timestamps: true, // createdAt acts as the event date — no updatedAt edits expected
    }
);

// History is meant to be append-only — write through a service layer,
// never expose direct update/delete routes for this model.
const HistoryModel = mongoose.model("history", HistorySchema);

export default HistoryModel;