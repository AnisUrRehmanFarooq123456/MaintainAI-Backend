import cloudinary from "../config/cloudinary.js";

const streamUpload = (buffer) => {
    return new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
            { folder: "maintainiq/evidence", resource_type: "auto" },
            (error, result) => {
                if (error) reject(error);
                else resolve(result);
            }
        );
        stream.end(buffer);
    });
};

const UploadEvidence = async (req, res) => {
    try {
        const files = req.files;
        if (!files || files.length === 0) {
            return res.status(400).send({ status: false, message: "No files uploaded" });
        }
        if (files.length > 5) {
            return res.status(400).send({ status: false, message: "Maximum 5 files per upload" });
        }

        const uploadResults = await Promise.all(files.map((file) => streamUpload(file.buffer)));
        const urls = uploadResults.map((r) => r.secure_url);

        return res.status(200).send({ status: true, message: "Files uploaded successfully", data: urls });
    } catch (error) {
        console.log("Error While Uploading Evidence: ", error);
        return res.status(500).send({ status: false, message: error.message || "Error While Uploading Evidence" });
    }
};

export { UploadEvidence };