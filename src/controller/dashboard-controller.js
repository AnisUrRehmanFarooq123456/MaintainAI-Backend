import AssetModel from "../model/asset-model.js";
import IssueModel from "../model/issue-model.js";
import MaintenanceModel from "../model/maintenance-model.js";

const GetAdminDashboardStats = async (req, res) => {
    try {
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

        const [
            totalAssets,
            operationalAssets,
            underMaintenanceAssets,
            openIssues,
            overdueMaintenance,
            resolvedThisMonth,
            assetHealthAgg,
            issuePriorityAgg,
            recentIssues,
            upcomingMaintenance,
            mostFrequentAssetsAgg
        ] = await Promise.all([
            AssetModel.countDocuments({ status: { $ne: "Retired" } }),
            AssetModel.countDocuments({ status: "Operational" }),
            AssetModel.countDocuments({ status: "Under Maintenance" }),
            IssueModel.countDocuments({ status: { $nin: ["Resolved", "Closed"] } }),
            AssetModel.countDocuments({ nextServiceDate: { $lt: now }, status: { $ne: "Retired" } }),
            MaintenanceModel.countDocuments({ completedAt: { $gte: startOfMonth } }),
            AssetModel.aggregate([
                { $match: { status: { $ne: "Retired" } } },
                { $group: { _id: "$condition", count: { $sum: 1 } } }
            ]),
            IssueModel.aggregate([
                { $match: { status: { $nin: ["Resolved", "Closed"] } } },
                { $group: { _id: "$priority", count: { $sum: 1 } } }
            ]),
            IssueModel.find().sort({ createdAt: -1 }).limit(5).populate("asset", "name assetCode"),
            AssetModel.find({ nextServiceDate: { $gte: now }, status: { $ne: "Retired" } })
                .sort({ nextServiceDate: 1 })
                .limit(5)
                .select("name assetCode nextServiceDate"),
            IssueModel.aggregate([
                { $group: { _id: "$asset", count: { $sum: 1 } } },
                { $sort: { count: -1 } },
                { $limit: 5 },
                { $lookup: { from: "assets", localField: "_id", foreignField: "_id", as: "assetInfo" } },
                { $unwind: "$assetInfo" }
            ])
        ]);

        const assetHealth = { Good: 0, Fair: 0, Poor: 0, Unsafe: 0 };
        assetHealthAgg.forEach((item) => {
            if (item._id) assetHealth[item._id] = item.count;
        });

        const issuePriority = { Critical: 0, High: 0, Medium: 0, Low: 0 };
        issuePriorityAgg.forEach((item) => {
            if (item._id) issuePriority[item._id] = item.count;
        });

        const mostFrequentAssets = mostFrequentAssetsAgg.map((item) => ({
            assetName: item.assetInfo.name,
            assetCode: item.assetInfo.assetCode,
            issueCount: item.count
        }));

        return res.status(200).send({
            status: true,
            data: {
                totalAssets,
                operationalAssets,
                underMaintenanceAssets,
                openIssues,
                overdueMaintenance,
                resolvedThisMonth,
                assetHealth,
                issuePriority,
                recentIssues,
                upcomingMaintenance,
                mostFrequentAssets
            }
        });
    } catch (error) {
        console.log("Error While Fetching Dashboard Stats: ", error);
        return res.status(500).send({ status: false, message: "Error While Fetching Dashboard Stats" });
    }
};
const GetAdminAnalytics = async (req, res) => {
    try {
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
        sixMonthsAgo.setDate(1);

        const monthlyIssuesAgg = await IssueModel.aggregate([
            { $match: { createdAt: { $gte: sixMonthsAgo } } },
            { $group: { _id: { year: { $year: "$createdAt" }, month: { $month: "$createdAt" } }, count: { $sum: 1 } } },
            { $sort: { "_id.year": 1, "_id.month": 1 } }
        ]);

        const avgResolutionAgg = await IssueModel.aggregate([
            { $match: { status: { $in: ["Resolved", "Closed"] } } },
            { $project: { resolutionHours: { $divide: [{ $subtract: ["$updatedAt", "$createdAt"] }, 1000 * 60 * 60] } } },
            { $group: { _id: null, avgHours: { $avg: "$resolutionHours" } } }
        ]);

        return res.status(200).send({
            status: true,
            data: {
                monthlyIssues: monthlyIssuesAgg,
                avgResolutionHours: avgResolutionAgg[0]?.avgHours || 0
            }
        });
    } catch (error) {
        return res.status(500).send({ status: false, message: "Error While Fetching Analytics" });
    }
};
const GetTechnicianDashboardStats = async (req, res) => {
    try {
        const technicianId = req.user.id;
        const startOfToday = new Date();
        startOfToday.setHours(0, 0, 0, 0);

        const [totalAssigned, highPriority, inProgress, newToday, assignedIssues] = await Promise.all([
            IssueModel.countDocuments({ assignedTechnician: technicianId, status: { $nin: ["Resolved", "Closed"] } }),
            IssueModel.countDocuments({ assignedTechnician: technicianId, priority: { $in: ["Critical", "High"] }, status: { $nin: ["Resolved", "Closed"] } }),
            IssueModel.countDocuments({ assignedTechnician: technicianId, status: { $in: ["Inspection Started", "Maintenance In Progress", "Waiting for Parts"] } }),
            IssueModel.countDocuments({ assignedTechnician: technicianId, createdAt: { $gte: startOfToday }, status: { $nin: ["Resolved", "Closed"] } }),
            IssueModel.find({ assignedTechnician: technicianId, status: { $nin: ["Resolved", "Closed"] } })
                .populate("asset", "name assetCode location")
                .sort({ priority: 1, createdAt: -1 })
        ]);

        return res.status(200).send({
            status: true,
            data: { totalAssigned, highPriority, inProgress, newToday, assignedIssues }
        });
    } catch (error) {
        console.log("Error While Fetching Technician Dashboard: ", error);
        return res.status(500).send({ status: false, message: "Error While Fetching Technician Dashboard" });
    }
};
const GetReporterDashboardStats = async (req, res) => {
    try {
        const reporterId = req.user.id;

        const [totalComplaints, openComplaints, resolvedComplaints, recentComplaints] = await Promise.all([
            IssueModel.countDocuments({ reporterUser: reporterId }),
            IssueModel.countDocuments({ reporterUser: reporterId, status: { $nin: ["Resolved", "Closed"] } }),
            IssueModel.countDocuments({ reporterUser: reporterId, status: { $in: ["Resolved", "Closed"] } }),
            IssueModel.find({ reporterUser: reporterId })
                .populate("asset", "name assetCode")
                .sort({ createdAt: -1 })
                .limit(5)
        ]);

        return res.status(200).send({
            status: true,
            data: { totalComplaints, openComplaints, resolvedComplaints, recentComplaints }
        });
    } catch (error) {
        console.log("Error While Fetching Reporter Dashboard: ", error);
        return res.status(500).send({ status: false, message: "Error While Fetching Reporter Dashboard" });
    }
};

export { GetAdminDashboardStats, GetAdminAnalytics, GetTechnicianDashboardStats, GetReporterDashboardStats };