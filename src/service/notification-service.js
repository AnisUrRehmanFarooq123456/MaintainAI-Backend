import NotificationModel from "../model/notification-model.js";

const createNotification = async ({ recipient, title, message, type, relatedIssue }) => {
    try {
        await NotificationModel.create({ recipient, title, message, type, relatedIssue });
    } catch (error) {
        console.log("Error While Creating Notification: ", error);
    }
};

export { createNotification };