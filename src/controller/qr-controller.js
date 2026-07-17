import AssetModel from "../model/asset-model.js";
import { generateQRCodeDataUrl } from "../service/qr-service.js";

const getPublicBaseUrl = () => {
    const frontendUrl = process.env.FRONTEND_URL;
    if (frontendUrl && !frontendUrl.includes("localhost")) {
        return frontendUrl.replace(/\/+$/, "");
    }
    const nextPublicUrl = process.env.NEXT_PUBLIC_API_URL;
    if (nextPublicUrl && !nextPublicUrl.includes("localhost")) {
        return nextPublicUrl.replace(/\/+$/, "");
    }
    throw new Error("Public frontend URL is not configured");
};

const GetAssetQR = async (req, res) => {
    try {
        const { assetCode } = req.params;
        const asset = await AssetModel.findOne({ assetCode });

        if (!asset) {
            return res.status(404).send({
                status: false,
                message: "Asset not found"
            });
        }
        if (asset.status === "Retired") {
            return res.status(200).send({
                status: true,
                message: "Asset is retired",
                data: { qrCodeUrl: asset.qrCodeUrl, publicUrl: asset.publicUrl, retired: true }
            });
        }

        return res.status(200).send({
            status: true,
            data: { qrCodeUrl: asset.qrCodeUrl, publicUrl: asset.publicUrl }
        });
    } catch (error) {
        return res.status(500).send({
            status: false,
            message: "Error While Fetching QR Code"
        });
    }
};

const RegenerateAssetQR = async (req, res) => {
    try {
        const { assetCode } = req.params;
        const asset = await AssetModel.findOne({ assetCode });

        if (!asset) {
            return res.status(404).send({
                status: false,
                message: "Asset not found"
            });
        }

        const publicUrl = `${process.env.FRONTEND_URL}/asset/${asset.assetCode}`;
        const qrCodeUrl = await generateQRCodeDataUrl(publicUrl);

        if (!qrCodeUrl) {
            return res.status(500).send({
                status: false,
                message: "Failed to generate QR code"
            });
        }

        asset.publicUrl = publicUrl;
        asset.qrCodeUrl = qrCodeUrl;
        await asset.save();

        return res.status(200).send({
            status: true,
            message: "QR code regenerated successfully",
            data: { qrCodeUrl, publicUrl }
        });
    } catch (error) {
        return res.status(500).send({
            status: false,
            message: "Error While Regenerating QR Code"
        });
    }
};

const DownloadAssetQR = async (req, res) => {
    try {
        const { assetCode } = req.params;
        const asset = await AssetModel.findOne({ assetCode });

        if (!asset || !asset.qrCodeUrl) {
            return res.status(404).send({
                status: false,
                message: "QR code not found for this asset"
            });
        }

        const base64Data = asset.qrCodeUrl.replace(/^data:image\/png;base64,/, "");
        const buffer = Buffer.from(base64Data, "base64");

        res.setHeader("Content-Type", "image/png");
        res.setHeader("Content-Disposition", `attachment; filename=${asset.assetCode}-qr.png`);
        return res.send(buffer);
    } catch (error) {
        return res.status(500).send({
            status: false,
            message: "Error While Downloading QR Code"
        });
    }
};

export { GetAssetQR, RegenerateAssetQR, DownloadAssetQR };