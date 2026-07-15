import HistoryModel from "../model/history-model.js";

const GetAssetHistory = async (req, res) => {
    try {
        const { assetId } = req.params;
        const history = await HistoryModel.find({ asset: assetId })
            .populate("actor", "fullName role")
            .populate("issue", "issueNumber title")
            .sort({ createdAt: -1 });

        return res.status(200).send({
            status: true,
            data: history
        });
    } catch (error) {
        return res.status(500).send({
            status: false,
            message: "Error While Fetching Asset History"
        });
    }
};

const GetAllHistory = async (req, res) => {
    try {
        const history = await HistoryModel.find()
            .populate("asset", "name assetCode")
            .populate("actor", "fullName role")
            .sort({ createdAt: -1 })
            .limit(200);

        return res.status(200).send({
            status: true,
            data: history
        });
    } catch (error) {
        return res.status(500).send({
            status: false,
            message: "Error While Fetching History"
        });
    }
};

export { GetAssetHistory, GetAllHistory };