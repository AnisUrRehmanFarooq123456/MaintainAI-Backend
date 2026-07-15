import UserModel from "../model/user-model.js";
import IssueModel from "../model/issue-model.js";
import MaintenanceModel from "../model/maintenance-model.js";

const GetTechniciansOverview = async (req, res) => {
    try {
        const technicians = await UserModel.find({ role: "technician" }).select("fullName email phoneNumber specialization");

        const [assignedCounts, completedCounts] = await Promise.all([
            IssueModel.aggregate([
                { $match: { status: { $nin: ["Resolved", "Closed"] }, assignedTechnician: { $ne: null } } },
                { $group: { _id: "$assignedTechnician", count: { $sum: 1 } } }
            ]),
            MaintenanceModel.aggregate([
                { $group: { _id: "$technician", count: { $sum: 1 } } }
            ])
        ]);

        const assignedMap = {};
        assignedCounts.forEach((a) => { assignedMap[a._id.toString()] = a.count; });

        const completedMap = {};
        completedCounts.forEach((c) => { completedMap[c._id.toString()] = c.count; });

        const result = technicians.map((tech) => ({
            _id: tech._id,
            fullName: tech.fullName,
            email: tech.email,
            phoneNumber: tech.phoneNumber,
            specialization: tech.specialization || "Technician",
            assignedCount: assignedMap[tech._id.toString()] || 0,
            completedCount: completedMap[tech._id.toString()] || 0
        }));

        return res.status(200).send({ status: true, data: result });
    } catch (error) {
        console.log("Error While Fetching Technicians Overview: ", error);
        return res.status(500).send({ status: false, message: "Error While Fetching Technicians Overview" });
    }
};

export { GetTechniciansOverview };