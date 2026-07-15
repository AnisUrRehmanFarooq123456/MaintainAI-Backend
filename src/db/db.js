import mongoose from "mongoose";

const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_DB_URL, {
            dbName: "MaintainIQ",
        });
        console.log("Database Connected Successfully");
    } catch (error) {
        console.log("Error While Connecting MongoDB: ", error);
        process.exit(1); 
    }
};

mongoose.connection.on("disconnected", () => {
    console.log("MongoDB disconnected");
});

mongoose.connection.on("error", (err) => {
    console.log("MongoDB connection error: ", err);
});

export default connectDB;