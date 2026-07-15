const sendEmail = async ({ to, subject, text }) => {
    try {
        if (!to) return;

        const response = await fetch("https://api.brevo.com/v3/smtp/email", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "api-key": process.env.BREVO_API_KEY
            },
            body: JSON.stringify({
                sender: { name: "MaintainIQ", email: process.env.BREVO_SENDER_EMAIL },
                to: [{ email: to }],
                subject: subject,
                textContent: text
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            console.log("Brevo Email Error: ", errorData);
        }
    } catch (error) {
        console.log("Error While Sending Email: ", error.message);
    }
};

export { sendEmail };