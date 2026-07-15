import { rateLimit } from "express-rate-limit";
import { RedisStore } from "rate-limit-redis";
import redisClient from "../config/redis-client.js";

const publicEndpointLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 20,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        status: false,
        message: "Too many requests from this device. Please try again later."
    },
    store: new RedisStore({
        sendCommand: (...args) => redisClient.call(...args)
    })
});

export { publicEndpointLimiter };