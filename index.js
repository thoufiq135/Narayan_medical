const express=require("express")
const app=express()
require("dotenv").config()
const addData=require("./addData")
const trigger=require("./trigger")
const getData=require("./getData")
const {minioClient,connectMinio}=require("./minio")
const rateLimiter=require("./rateLimiter")
const {connectDB,pool}=require("./connectdb")

const { connectRedis, redisClient }=require("./redisConnect")
app.use(express.json())
connectDB()
connectRedis()
connectMinio()
app.use("/addData",addData)
app.use("/trigger",trigger)
app.use("/getData",getData)

app.get("/testServer",(req,res)=>{
if(!pool||!redisClient||!minioClient){
return res.status(500).json({message:"internal server error"})
}
res.send("<h1>all are running well</h1>")
})
app.get("/",(req,res)=>{
    res.send("<h1>server is succesfully started")
})
const port=process.env.PORT
app.listen(port,()=>{
    console.log("app is listening on port 3000")
})
