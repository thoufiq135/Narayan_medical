const { createClient } = require("redis");
require("dotenv").config()
const redisClient = createClient({
    url: `redis://${process.env.IP}:6379`,
});

redisClient.on("connect", () => {
    console.log("✅ Redis Connected");
});

redisClient.on("error", (err) => {
    console.log("❌ Redis Error:", err.message);
});

async function connectRedis() {
    try {
        await redisClient.connect();
        return redisClient;
    } catch (err) {
        console.log("Retrying Redis connection in 10 seconds...");
        setTimeout(connectRedis, 10000);
    }
}

module.exports = { connectRedis, redisClient };