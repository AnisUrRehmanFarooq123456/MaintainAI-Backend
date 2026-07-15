import IssueModel from "../model/issue-model.js";
import AssetModel from "../model/asset-model.js";
import UserModel from "../model/user-model.js";
import { logHistory } from "../service/history-service.js";
import { sendEmail } from "../service/email-service.js";

const PRIORITIES = ["Low", "Medium", "High", "Critical"];

const ReportIssue = async (req, res) => {
    try {
        const { assetCode, title, description, category, priority, reporterName, reporterContact, evidence, aiSuggestion, aiSuggested, aiEdited } = req.body;

        if (!assetCode || !title || !description) {
            return res.status(400).send({
                status: false,
                message: "Asset code, title and description are required"
            });
        }
        if (priority && !PRIORITIES.includes(priority)) {
            return res.status(400).send({
                status: false,
                message: `Priority must be one of: ${PRIORITIES.join(", ")}`
            });
        }

        const asset = await AssetModel.findOne({ assetCode });
        if (!asset) {
            return res.status(404).send({
                status: false,
                message: "Invalid asset code"
            });
        }
        if (asset.status === "Retired") {
            return res.status(400).send({
                status: false,
                message: "Cannot report an issue on a retired asset"
            });
        }

        const issueNumber = `ISS-${Date.now()}`;
        const finalPriority = priority || "Medium";

        const newIssue = new IssueModel({
            issueNumber,
            asset: asset._id,
            title: title.trim(),
            description: description.trim(),
            category,
            priority: finalPriority,
            isCritical: finalPriority === "Critical",
            reporterName,
            reporterContact,
            reporterUser: req.user?.role === "reporter" ? req.user.id : undefined,
            evidence: evidence || [],
            aiSuggestion,
            aiSuggested: !!aiSuggested,
            aiEdited: !!aiEdited
        });

        const savedIssue = await newIssue.save();

        asset.status = "Issue Reported";
        await asset.save();

        await logHistory({
            asset: asset._id,
            issue: savedIssue._id,
            action: "Issue Reported",
            description: `Issue "${savedIssue.title}" (${savedIssue.issueNumber}) was reported`
        });

        return res.status(200).send({
            status: true,
            message: "Issue reported successfully",
            data: savedIssue
        });
    } catch (error) {
        console.log("Error While Reporting Issue: ", error);
        return res.status(500).send({
            status: false,
            message: "Error While Reporting Issue"
        });
    }
};

const GetAllIssues = async (req, res) => {
    try {
        const { status, priority, category, assignedTechnician, unassigned, search } = req.query;
        const filter = {};
        if (status) filter.status = status;
        if (priority) filter.priority = priority;
        if (category) filter.category = category;
        if (assignedTechnician) filter.assignedTechnician = assignedTechnician;
        if (unassigned === "true") filter.assignedTechnician = null;
        if (search) filter.title = { $regex: search, $options: "i" };

        const issues = await IssueModel.find(filter)
            .populate("asset", "name assetCode location")
            .populate("assignedTechnician", "fullName email")
            .sort({ createdAt: -1 });

        return res.status(200).send({ status: true, data: issues });
    } catch (error) {
        return res.status(500).send({ status: false, message: "Error While Fetching Issues" });
    }
};

const GetIssueById = async (req, res) => {
    try {
        const { id } = req.params;
        const issue = await IssueModel.findById(id)
            .populate("asset", "name assetCode location status")
            .populate("assignedTechnician", "fullName email");

        if (!issue) {
            return res.status(404).send({
                status: false,
                message: "Issue not found"
            });
        }
        return res.status(200).send({
            status: true,
            data: issue
        });
    } catch (error) {
        return res.status(500).send({
            status: false,
            message: "Error While Fetching Issue"
        });
    }
};

const AssignTechnician = async (req, res) => {
    try {
        const { id } = req.params;
        const { technicianId } = req.body;

        if (!technicianId) {
            return res.status(400).send({
                status: false,
                message: "Technician id is required"
            });
        }

        const issue = await IssueModel.findById(id);
        if (!issue) {
            return res.status(404).send({
                status: false,
                message: "Issue not found"
            });
        }
        if (issue.status === "Closed") {
            return res.status(400).send({
                status: false,
                message: "Closed issue must be reopened before it can be assigned"
            });
        }

        const technician = await UserModel.findById(technicianId);
        if (!technician || technician.role !== "technician") {
            return res.status(400).send({
                status: false,
                message: "Invalid technician id"
            });
        }

        issue.assignedTechnician = technicianId;
        issue.status = "Assigned";
        await issue.save();

        // Bonus: Email notification — alerts the technician that a new issue was assigned to them
        await sendEmail({
            to: technician.email,
            subject: `New Issue Assigned: ${issue.issueNumber}`,
            text: `Hello ${technician.fullName},\n\nYou've been assigned a new issue.\n\nIssue Number: ${issue.issueNumber}\nTitle: ${issue.title}\nPriority: ${issue.priority}\n\nPlease review it on your MaintainIQ dashboard.`
        });

        await logHistory({
            asset: issue.asset,
            issue: issue._id,
            actor: req.user.id,
            action: "Technician Assigned",
            description: `Issue ${issue.issueNumber} was assigned to ${technician.fullName}`
        });

        return res.status(200).send({
            status: true,
            message: "Technician assigned successfully",
            data: issue
        });
    } catch (error) {
        return res.status(500).send({
            status: false,
            message: "Error While Assigning Technician"
        });
    }
};

const ALLOWED_TRANSITIONS = {
    "Assigned": ["Inspection Started"],
    "Inspection Started": ["Maintenance In Progress", "Waiting for Parts"],
    "Maintenance In Progress": ["Waiting for Parts"],
    "Waiting for Parts": ["Maintenance In Progress"]
};

const ASSET_STATUS_BY_ISSUE_STATUS = {
    "Assigned": "Under Inspection",
    "Inspection Started": "Under Inspection",
    "Maintenance In Progress": "Under Maintenance",
    "Waiting for Parts": "Under Maintenance"
};

const UpdateIssueStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        if (!status) {
            return res.status(400).send({
                status: false,
                message: "Status is required"
            });
        }
        if (status === "Resolved") {
            return res.status(400).send({
                status: false,
                message: "Issue can only be resolved by submitting a maintenance record"
            });
        }

        const issue = await IssueModel.findById(id);
        if (!issue) {
            return res.status(404).send({
                status: false,
                message: "Issue not found"
            });
        }
        if (issue.status === "Closed") {
            return res.status(400).send({
                status: false,
                message: "Closed issue cannot be edited until reopened"
            });
        }
        if (req.user.role === "technician" && String(issue.assignedTechnician) !== String(req.user.id)) {
            return res.status(403).send({
                status: false,
                message: "You can only update an issue assigned to you"
            });
        }

        const allowedNext = ALLOWED_TRANSITIONS[issue.status] || [];
        if (!allowedNext.includes(status)) {
            return res.status(400).send({
                status: false,
                message: `Cannot move issue from "${issue.status}" to "${status}"`
            });
        }

        issue.status = status;
        await issue.save();

        if (ASSET_STATUS_BY_ISSUE_STATUS[status]) {
            await AssetModel.findByIdAndUpdate(issue.asset, { status: ASSET_STATUS_BY_ISSUE_STATUS[status] });
        }

        await logHistory({
            asset: issue.asset,
            issue: issue._id,
            actor: req.user.id,
            action: "Issue Status Changed",
            description: `Issue ${issue.issueNumber} moved to "${status}"`
        });

        return res.status(200).send({
            status: true,
            message: "Issue status updated successfully",
            data: issue
        });
    } catch (error) {
        return res.status(500).send({
            status: false,
            message: "Error While Updating Issue Status"
        });
    }
};

// Supervisor: reviews completed maintenance and approves resolution (Resolved -> Closed)
const ApproveIssue = async (req, res) => {
    try {
        const { id } = req.params;
        const issue = await IssueModel.findById(id);
        if (!issue) {
            return res.status(404).send({ status: false, message: "Issue not found" });
        }
        if (issue.status !== "Resolved") {
            return res.status(400).send({ status: false, message: "Only a resolved issue can be approved and closed" });
        }

        issue.status = "Closed";
        await issue.save();

        await logHistory({
            asset: issue.asset,
            issue: issue._id,
            actor: req.user.id,
            action: "Issue Approved & Closed",
            description: `Issue ${issue.issueNumber} was reviewed and closed by a supervisor`
        });

        return res.status(200).send({ status: true, message: "Issue approved and closed", data: issue });
    } catch (error) {
        return res.status(500).send({ status: false, message: "Error While Approving Issue" });
    }
};

const ReopenIssue = async (req, res) => {
    try {
        const { id } = req.params;
        const { reason } = req.body;

        const issue = await IssueModel.findById(id);
        if (!issue) {
            return res.status(404).send({
                status: false,
                message: "Issue not found"
            });
        }
        if (!["Resolved", "Closed"].includes(issue.status)) {
            return res.status(400).send({
                status: false,
                message: "Only a resolved or closed issue can be reopened"
            });
        }

        issue.status = "Reopened";
        await issue.save();

        await AssetModel.findByIdAndUpdate(issue.asset, { status: "Issue Reported" });

        await logHistory({
            asset: issue.asset,
            issue: issue._id,
            actor: req.user.id,
            action: "Issue Reopened",
            description: reason ? `Issue ${issue.issueNumber} reopened: ${reason}` : `Issue ${issue.issueNumber} reopened`
        });

        return res.status(200).send({
            status: true,
            message: "Issue reopened successfully",
            data: issue
        });
    } catch (error) {
        return res.status(500).send({
            status: false,
            message: "Error While Reopening Issue"
        });
    }
};
export { ReportIssue, GetAllIssues, GetIssueById, AssignTechnician, UpdateIssueStatus, ApproveIssue, ReopenIssue };