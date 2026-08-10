const express=require("express")
const router=express.Router()
const{minioClient,connectMinio}=require("./minio")
const {connectDB,pool}=require("./connectdb")
router.get("/known-data", async (req, res) => {
    try {

        const { date, type, page = 1 } = req.query;

        const limit = 10;
        const currentPage = Math.max(parseInt(page) || 1, 1);
        const offset = (currentPage - 1) * limit;

        // Build filters
        const values = [];
        const conditions = [];

        if (date) {
            values.push(date);
            conditions.push(`DATE(k.captured_at) = $${values.length}`);
        }

        if (type) {
            values.push(type);
            conditions.push(`k.meal_type = $${values.length}`);
        }

        let whereClause = "";

        if (conditions.length > 0) {
            whereClause = `WHERE ${conditions.join(" AND ")}`;
        }

        // Count total records
        const countQuery = `
            SELECT COUNT(*) AS total
            FROM known_faces k
            JOIN emp e ON k.emp_id = e.id
            ${whereClause}
        `;

        const countResult = await pool.query(
            countQuery,
            values
        );

        const totalRecords = parseInt(
            countResult.rows[0].total
        );

        const totalPages = Math.ceil(
            totalRecords / limit
        );

        // Get current page
        const dataQuery = `
            SELECT
                k.id,
                e.employee_id,
                e.full_name,
                e.department_id,
                e.image_url,
                k.captured_at,
                k.meal_type,
                k.camera_id,
                k.created_at
            FROM known_faces k
            JOIN emp e ON k.emp_id = e.id
            ${whereClause}
            ORDER BY k.captured_at DESC
            LIMIT $${values.length + 1}
            OFFSET $${values.length + 2}
        `;

        const dataResult = await pool.query(
            dataQuery,
            [
                ...values,
                limit,
                offset
            ]
        );

        // Generate MinIO URLs
        const data = await Promise.all(
            dataResult.rows.map(async (employee) => {

                const imageURL =
                    await minioClient.presignedGetObject(
                        "knownfaces",
                        employee.image_url,
                        3600
                    );

                return {
                    ...employee,
                    image_url: imageURL
                };
            })
        );

        return res.status(200).json({
            success: true,

            pagination: {
                currentPage,
                totalPages,
                totalRecords,
                recordsPerPage: limit
            },

            data: data
        });

    } catch (error) {

        console.error(error);

        return res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
});
router.get("/unknown-data", async (req, res) => {
    try {

        const { date, type, page } = req.query;

        const limit = 10;
        const currentPage = Math.max(parseInt(page) || 1, 1);
        const offset = (currentPage - 1) * limit;

        // Build filters
        const values = [];
        const conditions = [];

        if (date) {
            values.push(date);
            conditions.push(`DATE(captured_at) = $${values.length}`);
        }

        if (type) {
            values.push(type);
            conditions.push(`meal_type = $${values.length}`);
        }

        let whereClause = "";

        if (conditions.length > 0) {
            whereClause = `WHERE ${conditions.join(" AND ")}`;
        }

        // Count total records
        const countQuery = `
            SELECT COUNT(*) AS total
            FROM unknown_faces
            ${whereClause}
        `;

        const countResult = await pool.query(
            countQuery,
            values
        );

        const totalRecords = parseInt(
            countResult.rows[0].total
        );

        const totalPages = Math.ceil(
            totalRecords / limit
        );

        // Get current page data
        const dataQuery = `
            SELECT
                id,
                image_key,
                captured_at,
                meal_type,
                camera_id,
                created_at
            FROM unknown_faces
            ${whereClause}
            ORDER BY captured_at DESC
            LIMIT $${values.length + 1}
            OFFSET $${values.length + 2}
        `;

        const dataResult = await pool.query(
            dataQuery,
            [
                ...values,
                limit,
                offset
            ]
        );

        // Generate MinIO URLs
        const data = await Promise.all(
            dataResult.rows.map(async (image) => {

                const imageURL =
                    await minioClient.presignedGetObject(
                        "unknownfaces",
                        image.image_key,
                        3600
                    );

                return {
                    ...image,
                    image_url: imageURL
                };
            })
        );

        return res.status(200).json({
            success: true,

            pagination: {
                currentPage,
                totalPages,
                totalRecords,
                recordsPerPage: limit
            },

            data: data
        });

    } catch (error) {

        console.error(error);

        return res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
});
router.get("/regstered_emp", async (req, res) => {
    try {

        const result = await pool.query(`
            SELECT
                e.id,
                e.employee_id,
                e.full_name,
                e.department_id,
                d.department_name,
                e.image_url,
                e.created_at
            FROM emp e
            JOIN departments d
                ON e.department_id = d.id
            ORDER BY e.id DESC
        `);
 const employees = await Promise.all(
            result.rows.map(async (employee) => {

                const imageUrl = await minioClient.presignedGetObject(
                    "knownfaces",
                    employee.image_url,
                    3600
                );

                return {
                    ...employee,
                    image_url: imageUrl
                };
            })
        );

        return res.status(200).json({
            success: true,
            count: employees.length,
            data: employees
        });

    } catch (error) {

        console.error(error);

        return res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
});
module.exports=router