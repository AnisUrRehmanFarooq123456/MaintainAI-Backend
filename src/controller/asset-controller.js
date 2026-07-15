import AssetModel from "../model/asset-model.js";
import IssueModel from "../model/issue-model.js";
import HistoryModel from "../model/history-model.js";
import { logHistory } from "../service/history-service.js";
import { generateQRCodeDataUrl } from "../service/qr-service.js";

const CONDITIONS = ["Good", "Fair", "Poor", "Unsafe"];

const AddAsset = async (req, res) => {
    try {
        const { name, assetCode, category, location, condition, nextServiceDate } = req.body;

        if (!name || !assetCode) {
            return res.status(400).send({ status: false, message: "Asset name and asset code are required" });
        }
        if (name.trim().length < 3 || name.trim().length > 60) {
            return res.status(400).send({ status: false, message: "Asset name must be between 3 and 60 characters" });
        }
        if (condition && !CONDITIONS.includes(condition)) {
            return res.status(400).send({ status: false, message: `Condition must be one of: ${CONDITIONS.join(", ")}` });
        }

        const codeExists = await AssetModel.findOne({ assetCode: assetCode.trim() });
        if (codeExists) {
            return res.status(400).send({ status: false, message: "Asset code already exists" });
        }

        const publicUrl = `${process.env.FRONTEND_URL}/asset/${assetCode.trim()}`;
        const qrCodeUrl = await generateQRCodeDataUrl(publicUrl);

        const newAsset = new AssetModel({
            name: name.trim(),
            assetCode: assetCode.trim(),
            category,
            location,
            condition: condition || "Good",
            nextServiceDate,
            publicUrl,
            qrCodeUrl,
            createdBy: req.user.id
        });

        const savedAsset = await newAsset.save();

        await logHistory({
            asset: savedAsset._id,
            actor: req.user.id,
            action: "Asset Registered",
            description: `Asset "${savedAsset.name}" (${savedAsset.assetCode}) was registered`
        });

        return res.status(200).send({ status: true, message: "Asset registered successfully", data: savedAsset });
    } catch (error) {
        console.log("Error While Adding Asset: ", error);
        return res.status(500).send({ status: false, message: "Error While Adding Asset" });
    }
};

const GetAllAssets = async (req, res) => {
    try {
        const { status, category, location, search } = req.query;
        const filter = {};
        if (status) filter.status = status;
        if (category) filter.category = category;
        if (location) filter.location = location;
        if (search) filter.name = { $regex: search, $options: "i" };

        const assets = await AssetModel.find(filter)
            .populate("assignedTechnician", "fullName email")
            .sort({ createdAt: -1 });

        // Open-issue counts per asset, merged in without a separate call per row
        const openCounts = await IssueModel.aggregate([
            { $match: { status: { $nin: ["Resolved", "Closed"] } } },
            { $group: { _id: "$asset", count: { $sum: 1 } } }
        ]);
        const openCountMap = {};
        openCounts.forEach((item) => {
            openCountMap[item._id.toString()] = item.count;
        });

        const assetsWithCounts = assets.map((asset) => ({
            ...asset.toObject(),
            openIssuesCount: openCountMap[asset._id.toString()] || 0
        }));

        return res.status(200).send({ status: true, data: assetsWithCounts });
    } catch (error) {
        return res.status(500).send({ status: false, message: "Error While Fetching Assets" });
    }
};

const GetAssetById = async (req, res) => {
    try {
        const { id } = req.params;
        const asset = await AssetModel.findById(id).populate("assignedTechnician", "fullName email");
        if (!asset) {
            return res.status(404).send({ status: false, message: "Asset not found" });
        }

        const openIssuesCount = await IssueModel.countDocuments({ asset: id, status: { $nin: ["Resolved", "Closed"] } });
        const history = await HistoryModel.find({ asset: id })
            .populate("actor", "fullName role")
            .sort({ createdAt: -1 })
            .limit(20);

        return res.status(200).send({
            status: true,
            data: { ...asset.toObject(), openIssuesCount, history }
        });
    } catch (error) {
        return res.status(500).send({ status: false, message: "Error While Fetching Asset" });
    }
};

const GetPublicAssetByCode = async (req, res) => {
    try {
        const { assetCode } = req.params;
        const asset = await AssetModel.findOne({ assetCode });

        if (!asset) {
            return res.status(404).send({ status: false, message: "Invalid asset code" });
        }

        const recentActivity = await HistoryModel.find({ asset: asset._id })
            .sort({ createdAt: -1 })
            .limit(5)
            .select("action description createdAt");

        return res.status(200).send({
            status: true,
            data: {
                name: asset.name,
                assetCode: asset.assetCode,
                category: asset.category,
                location: asset.location,
                condition: asset.condition,
                status: asset.status,
                lastServiceDate: asset.lastServiceDate,
                nextServiceDate: asset.nextServiceDate,
                recentActivity
            }
        });
    } catch (error) {
        return res.status(500).send({ status: false, message: "Error While Fetching Public Asset Page" });
    }
};

const UpdateAsset = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, category, location, condition, lastServiceDate, nextServiceDate, assignedTechnician } = req.body;

        const asset = await AssetModel.findById(id);
        if (!asset) {
            return res.status(404).send({ status: false, message: "Asset not found" });
        }
        if (asset.status === "Retired") {
            return res.status(400).send({ status: false, message: "Retired assets cannot be edited" });
        }
        if (condition && !CONDITIONS.includes(condition)) {
            return res.status(400).send({ status: false, message: `Condition must be one of: ${CONDITIONS.join(", ")}` });
        }

        if (name) asset.name = name.trim();
        if (category) asset.category = category;
        if (location) asset.location = location;
        if (condition) asset.condition = condition;
        if (lastServiceDate) asset.lastServiceDate = lastServiceDate;
        if (nextServiceDate) asset.nextServiceDate = nextServiceDate;
        if (assignedTechnician) asset.assignedTechnician = assignedTechnician;

        await asset.save();

        await logHistory({
            asset: asset._id,
            actor: req.user.id,
            action: "Asset Updated",
            description: `Asset "${asset.name}" details were updated`
        });

        return res.status(200).send({ status: true, message: "Asset updated successfully", data: asset });
    } catch (error) {
        return res.status(500).send({ status: false, message: "Error While Updating Asset" });
    }
};

const RetireAsset = async (req, res) => {
    try {
        const { id } = req.params;
        const asset = await AssetModel.findById(id);
        if (!asset) {
            return res.status(404).send({ status: false, message: "Asset not found" });
        }
        asset.status = "Retired";
        await asset.save();

        await logHistory({
            asset: asset._id,
            actor: req.user.id,
            action: "Asset Retired",
            description: `Asset "${asset.name}" was permanently retired`
        });

        return res.status(200).send({ status: true, message: "Asset retired successfully" });
    } catch (error) {
        return res.status(500).send({ status: false, message: "Error While Retiring Asset" });
    }
};

export { AddAsset, GetAllAssets, GetAssetById, GetPublicAssetByCode, UpdateAsset, RetireAsset };