import MaintenanceModel from "../model/maintenance-model.js";
import IssueModel from "../model/issue-model.js";
import AssetModel from "../model/asset-model.js";
import { logHistory } from "../service/history-service.js";

const AddMaintenanceRecord = async (req, res) => {
    try {
        const { issueId, inspectionFindings, workPerformed, partsUsed, timeSpentMinutes, evidence, finalCondition, nextServiceDate } = req.body;

        if (!issueId || !workPerformed) {
            return res.status(400).send({ status: false, message: "Issue id and maintenance notes (work performed) are required" });
        }
        if (workPerformed.trim().length < 5) {
            return res.status(400).send({ status: false, message: "Maintenance notes must be meaningful (at least 5 characters)" });
        }

        const issue = await IssueModel.findById(issueId);
        if (!issue) {
            return res.status(404).send({ status: false, message: "Issue not found" });
        }
        if (issue.status === "Closed" || issue.status === "Resolved") {
            return res.status(400).send({ status: false, message: "This issue is already resolved or closed" });
        }
        if (String(issue.assignedTechnician) !== String(req.user.id) && req.user.role !== "admin") {
            return res.status(403).send({ status: false, message: "You can only submit maintenance for an issue assigned to you" });
        }

        let totalCost = 0;
        if (partsUsed && partsUsed.length > 0) {
            for (const part of partsUsed) {
                if (part.cost < 0) {
                    return res.status(400).send({ status: false, message: "Maintenance cost cannot be negative" });
                }
                totalCost += (part.cost || 0) * (part.quantity || 1);
            }
        }

        const completedAt = new Date();
        if (nextServiceDate && new Date(nextServiceDate) < completedAt) {
            return res.status(400).send({ status: false, message: "Next service date cannot be before the maintenance completion date" });
        }

        const newRecord = new MaintenanceModel({
            issue: issue._id,
            asset: issue.asset,
            technician: req.user.id,
            inspectionFindings,
            workPerformed: workPerformed.trim(),
            partsUsed: partsUsed || [],
            totalCost,
            timeSpentMinutes,
            evidence: evidence || [],
            finalCondition,
            completedAt
        });

        const savedRecord = await newRecord.save();

        issue.status = "Resolved";
        await issue.save();

        const asset = await AssetModel.findById(issue.asset);
        asset.lastServiceDate = completedAt;
        if (nextServiceDate) asset.nextServiceDate = nextServiceDate;
        if (finalCondition) asset.condition = finalCondition;
        asset.status = finalCondition === "Unsafe" ? "Out of Service" : "Operational";
        await asset.save();

        await logHistory({
            asset: issue.asset,
            issue: issue._id,
            actor: req.user.id,
            action: "Maintenance Completed",
            description: `Issue ${issue.issueNumber} resolved: ${workPerformed.trim()}`
        });

        return res.status(200).send({ status: true, message: "Maintenance record added and issue resolved", data: savedRecord });
    } catch (error) {
        console.log("Error While Adding Maintenance Record: ", error);
        return res.status(500).send({ status: false, message: "Error While Adding Maintenance Record" });
    }
};

const GetMaintenanceByIssue = async (req, res) => {
    try {
        const { issueId } = req.params;
        const records = await MaintenanceModel.find({ issue: issueId }).populate("technician", "fullName email");
        return res.status(200).send({ status: true, data: records });
    } catch (error) {
        return res.status(500).send({ status: false, message: "Error While Fetching Maintenance Records" });
    }
};

const GetAllMaintenanceRecords = async (req, res) => {
    try {
        const records = await MaintenanceModel.find()
            .populate("asset", "name assetCode")
            .populate("technician", "fullName email")
            .sort({ createdAt: -1 });
        return res.status(200).send({ status: true, data: records });
    } catch (error) {
        return res.status(500).send({ status: false, message: "Error While Fetching Maintenance Records" });
    }
};

// Scheduled Maintenance page: overdue + upcoming (derived from asset.nextServiceDate) + completed (maintenance records)
const GetScheduledMaintenanceOverview = async (req, res) => {
    try {
        const now = new Date();

        const [overdue, upcoming, completed] = await Promise.all([
            AssetModel.find({ nextServiceDate: { $lt: now }, status: { $ne: "Retired" } })
                .sort({ nextServiceDate: 1 })
                .select("name assetCode location nextServiceDate status"),
            AssetModel.find({ nextServiceDate: { $gte: now }, status: { $ne: "Retired" } })
                .sort({ nextServiceDate: 1 })
                .select("name assetCode location nextServiceDate status"),
            MaintenanceModel.find()
                .sort({ completedAt: -1 })
                .limit(30)
                .populate("asset", "name assetCode")
                .populate("technician", "fullName")
                .select("asset technician workPerformed totalCost completedAt finalCondition")
        ]);

        return res.status(200).send({ status: true, data: { overdue, upcoming, completed } });
    } catch (error) {
        console.log("Error While Fetching Scheduled Maintenance: ", error);
        return res.status(500).send({ status: false, message: "Error While Fetching Scheduled Maintenance" });
    }
};

export { AddMaintenanceRecord, GetMaintenanceByIssue, GetAllMaintenanceRecords, GetScheduledMaintenanceOverview };