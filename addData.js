const express=require("express")
const rateLimiter = require("./rateLimiter")
const upload=require("./middleware/uploadimage")
const {minioClient,connectMinio}=require("./minio")
const path=require("path")
const { pool } = require("./connectdb")
const router=express.Router()
const bot=require("./teligram")
const target={}
router.post("/emp-data",upload.single("image"),async(req,res)=>{
try{
     const { id, name, department } = req.body;

            if (!id || !name || !department|| !req.file) {
                return res.status(400).json({
                    success: false,
                    message: "All fields are required"
                });
            }

const objectPath=`${req.body.id}${path.extname(req.file.originalname)}`;
await minioClient.putObject(
    "knownfaces",
    objectPath,
    req.file.buffer,
    req.file.size,
    {
        "Content-Type":req.file.mimetype
    }
)
await pool.query(
    `INSERT INTO emp
    (employee_id, full_name, department_id, image_url)
    VALUES ($1,$2,$3,$4)`,
    [
        id,
        name,
        department,
        objectPath
    ]
)
res.json({
    success: true,
    imageName: objectPath
});
}catch(err){
     console.log(err);

            return res.status(500).json({
                success: false,
                message: "Internal Server Error"
            });
}
})
router.post("/past-data", upload.single("image"), async (req, res) => {
    try {

        const { time, type, cam } = req.body;

        if ( !time || !type || !cam || !req.file) {
            return res.status(400).json({
                success: false,
                message: "All fields are required"
            });
        }

        const objectPath = `${time}${path.extname(req.file.originalname)}`;

        await minioClient.putObject(
            "unknownfaces",
            objectPath,
            req.file.buffer,
            req.file.size,
            {
                "Content-Type": req.file.mimetype
            }
        );
        await bot.sendPhoto(
    process.env.CHAT_ID,
    req.file.buffer,
    {
        caption: `⚠️ Unknown face detected
📍 Location: Dining Hall-1
📷 Camera: ${cam}
🕒 Time: ${time}
🍽️ Type: ${type}`
    },
    {
        filename: req.file.originalname,
        contentType: req.file.mimetype
    }
);
        await pool.query(
            `INSERT INTO unknown_faces
            (image_key, captured_at, meal_type, camera_id)
            VALUES ($1, $2, $3, $4)`,
            [
                objectPath,
                time,
                type,
                cam
            ]
        );

        return res.status(201).json({
            success: true,
            message: "Unknown face saved successfully"
        });

    } catch (e) {
        console.log(e);

        return res.status(500).json({
            success: false,
            message: "Internal Server Error"
        });
    }
});
router.post("/known-data",upload.single("image"), async (req, res) => {
    try {
console.log(req.body);

        const { employee_id, time, type, cam } = req.body;

        if (!employee_id || !time || !type || !cam) {
            return res.status(400).json({
                success: false,
                message: "All fields are required"
            });
        }

        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: "Image is required"
            });
        }

        // Check if employee exists
        const employee = await pool.query(
            "SELECT * FROM emp WHERE employee_id = $1",
            [employee_id]
        );

        if (employee.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Employee not found"
            });
        }

        // Check target employee
        if (target.id == employee_id) {

            let chatId;
            let location;
            let camera;

            if (cam !== "bv") {
                chatId = process.env.CHAT_ID;
                location = "N.G.O Colony";
                camera = "002";
            } else {
                chatId = "5089797432";
                location = "B.V Nagar";
                camera = "001";
            }

            // SEND IMAGE DIRECTLY TO TELEGRAM
            await bot.sendPhoto(
                chatId,
                req.file.buffer,
                {
                    caption: `⚠️ Target face detected

📍 Location: ${location}
📷 Camera: ${camera}
🕒 Time: ${time}
🆔 Employee ID: ${employee_id}`
                },
                {
                    filename: req.file.originalname,
                    contentType: req.file.mimetype
                }
            );

            console.log("Telegram image sent successfully");
        }
// const emp = employee.rows[0];
//         // Store attendance
//         await pool.query(
//             `INSERT INTO known_faces
//             (emp_id, captured_at, meal_type, camera_id)
//             VALUES ($1, $2, $3, $4)`,
//             [
//                 emp.id,
//                 time,
//                 type,
//                 cam
//             ]
//         );

        return res.status(201).json({
            success: true,
            message: "alert send succesfully"
        });

    } catch (e) {
        console.log(e);

        return res.status(500).json({
            success: false,
            message: "Internal Server Error"
        });
    }
});
router.post("/target",async(req,res)=>{
    const {id}=req.body
    target.id={id}
    res.status(200).json({message:"target locked 🔒"})
})
module.exports=router