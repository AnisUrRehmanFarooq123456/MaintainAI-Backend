import QRCode from "qrcode";

const generateQRCodeDataUrl = async (publicUrl) => {
    try {
        const dataUrl = await QRCode.toDataURL(publicUrl);
        return dataUrl;
    } catch (error) {
        console.log("Error While Generating QR Code: ", error);
        return null;
    }
};

export { generateQRCodeDataUrl };