import Redis from "ioredis";

const redisClient = new Redis(process.env.REDIS_URL, {
    maxRetriesPerRequest: 3,
    lazyConnect: false,
    tls: process.env.REDIS_URL?.startsWith("rediss://") ? {} : undefined
});

redisClient.on("connect", () => {
    console.log("Redis Connected Successfully");
});

redisClient.on("error", (err) => {
    console.log("Redis Connection Error: ", err);
});

export default redisClient;