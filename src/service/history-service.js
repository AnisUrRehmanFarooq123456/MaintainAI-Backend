import HistoryModel from "../model/history-model.js";

const logHistory = async ({ asset, issue, actor, action, description }) => {
    try {
        await HistoryModel.create({ asset, issue, actor, action, description });
    } catch (error) {
        console.log("Error While Logging History: ", error);
    }
};

export { logHistory };