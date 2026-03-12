import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();

/**
 * Initializes the email transporter.
 * Uses Gmail SMTP by default. For production, ensure EMAIL_PASS is an App Password.
 */
const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
});

/**
 * Sends the monthly LeetCode status report via email.
 */
export async function sendMonthlyReportEmail(excelBuffer, className, batchYear, month) {
    const recipient = process.env.REPORT_RECIPIENT || "bmk@vcet.ac.in";
    const fileName = `${batchYear}_CSE_${className}_LeetCode_Status_${month.replace(' ', '_')}.xlsx`;

    const mailOptions = {
        from: process.env.EMAIL_USER,
        to: recipient,
        subject: `📊 Monthly LeetCode Status Report: ${className} | ${month}`,
        text: `Respected Sir,\n\nPlease find attached the monthly LeetCode performance report for Batch ${batchYear}, Class ${className} for the period of ${month}.\n\nThis is an automated report generated after the 5th weekly tracking.\n\nBest regards,\nLeetCode Status Tracker Bot`,
        attachments: [
            {
                filename: fileName,
                content: excelBuffer,
            },
        ],
    };

    try {
        const info = await transporter.sendMail(mailOptions);
        console.log(`✅ Email sent successfully to ${recipient}: ${info.response}`);
        return { success: true, message: info.response };
    } catch (error) {
        console.error("❌ Failed to send email:", error);
        throw error;
    }
}
