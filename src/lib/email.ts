import nodemailer from "nodemailer";
import * as z from "zod";
import { createServerOnlyFn } from "@tanstack/react-start";

const SendEmailInput = z.object({
	to: z.email("Invalid email address"),
	message: z.string().min(1, "Message is required"),
	subject: z.string().min(1, "Subject is required").optional(),
});

const gmailEmail = process.env.GMAIL_EMAILID;
const gmailPass = process.env.GMAIL_APP_PASSWORD;
const isGmail = !!(gmailEmail && gmailPass);

const nittUser = process.env.NITT_USER || "";

const smtpHost = isGmail
	? "smtp.gmail.com"
	: process.env.WEBMAIL_HOST || "webmail.nitt.edu";

const smtpUser = isGmail
	? gmailEmail
	: nittUser.includes("@")
		? nittUser.split("@")[0]
		: nittUser;

const smtpPass = isGmail ? gmailPass : process.env.NITT_PASSWORD;

const smtpPort = process.env.SMTP_PORT
	? Number.parseInt(process.env.SMTP_PORT, 10)
	: 465;
const smtpSecure =
	process.env.SMTP_SECURE !== undefined
		? process.env.SMTP_SECURE === "true"
		: true;

const transporter = nodemailer.createTransport({
	host: smtpHost,
	port: smtpPort,
	secure: smtpSecure,
	auth: {
		user: smtpUser,
		pass: smtpPass,
	},
});

export const sendEmail = createServerOnlyFn(
	async (input: z.infer<typeof SendEmailInput>) => {
		const parsed = SendEmailInput.parse(input);

		const mailOptions = {
			from: isGmail ? gmailEmail : nittUser,
			to: parsed.to,
			subject: parsed.subject ?? "Message from SIF",
			text: parsed.message,
		};

		if (process.env.NODE_ENV !== "production") {
			console.log("--- DEVELOPMENT EMAIL CONTENT ---");
			console.log(`To: ${mailOptions.to}`);
			console.log(`Subject: ${mailOptions.subject}`);
			console.log("Message:");
			console.log(mailOptions.text);
			console.log("----------------------------------");
			return;
		}

		try {
			await transporter.sendMail(mailOptions);
		} catch (error) {
			console.error("Email sending failed:", error);
			throw new Error("Failed to send email");
		}
	},
);
