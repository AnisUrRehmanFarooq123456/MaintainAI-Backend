import "dotenv/config"

import express from "express"
import connectDB from "./src/db/db.js"
import cors from "cors"
import dotenv from "dotenv"

import "./src/config/redis-client.js" // now runs AFTER .env is loaded

import userRoutes from "./src/routes/user-routes.js"
import assetRoutes from "./src/routes/asset-routes.js"
import issueRoutes from "./src/routes/issue-routes.js"
import maintenanceRoutes from "./src/routes/maintenance-routes.js"
import historyRoutes from "./src/routes/history-routes.js"
import qrRoutes from "./src/routes/qr-routes.js"
import triageRoutes from "./src/routes/triage-routes.js"
import dashboardRoutes from "./src/routes/dashboard-routes.js"
import technicianRoutes from "./src/routes/technician-routes.js"
import notificationRoutes from "./src/routes/notification-routes.js"
import uploadRoutes from "./src/routes/upload-routes.js"

const port = process.env.PORT || 3000
const app = express()

app.use(express.json())
app.use(cors())

app.use(userRoutes)
app.use(assetRoutes)
app.use(issueRoutes)
app.use(maintenanceRoutes)
app.use(historyRoutes)
app.use(qrRoutes)
app.use(triageRoutes)
app.use(dashboardRoutes)
app.use(technicianRoutes)
app.use(notificationRoutes)
app.use(uploadRoutes)

app.get("/", (req, res) => {
    res.send("MaintainIQ API is running")
})

app.listen(port, () => {
    console.log(`Server is Running on http://localhost:${port}`)
    connectDB()
})