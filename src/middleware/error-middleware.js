import mongoose from "mongoose";
const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_DB_URL, { dbName: "Hackathon" })
        console.log("DataBase Connected Successfully")


    }
    catch (error) {
        console.log("Error While Connecting MongoDB: ", error)
    }

}
export default connectDB