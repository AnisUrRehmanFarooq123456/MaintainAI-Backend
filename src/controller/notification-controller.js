import NotificationModel from "../model/notification-model.js";

const GetMyNotifications = async (req, res) => {
    try {
        const notifications = await NotificationModel.find({ recipient: req.user.id })
            .sort({ createdAt: -1 })
            .limit(50)
            .populate("relatedIssue", "issueNumber title");
        return res.status(200).send({ status: true, data: notifications });
    } catch (error) {
        return res.status(500).send({ status: false, message: "Error While Fetching Notifications" });
    }
};

const MarkNotificationRead = async (req, res) => {
    try {
        const { id } = req.params;
        await NotificationModel.findOneAndUpdate({ _id: id, recipient: req.user.id }, { isRead: true });
        return res.status(200).send({ status: true, message: "Marked as read" });
    } catch (error) {
        return res.status(500).send({ status: false, message: "Error While Updating Notification" });
    }
};

export { GetMyNotifications, MarkNotificationRead };