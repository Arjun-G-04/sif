import nodemailer from "nodemailer";
import * as z from "zod";
import { createServerOnlyFn } from "@tanstack/react-start";

const SendEmailInput = z.object({
	to: z.email("Invalid email address"),
	message: z.string().min(1, "Message is required"),
	subject: z.string().min(1, "Subject is required").optional(),
});

const transporter = nodemailer.createTransport({
	host: "students.nitt.edu",
	port: 465,
	secure: true,
	auth: {
		user: process.env.NITT_USER,
		pass: process.env.NITT_PASSWORD,
	},
});

export const sendEmail = createServerOnlyFn(
	async (input: z.infer<typeof SendEmailInput>) => {
		const parsed = SendEmailInput.parse(input);

		const mailOptions = {
			from: process.env.NITT_USER,
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
