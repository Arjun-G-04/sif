import nodemailer from "nodemailer";
import * as z from "zod";
import { createServerOnlyFn } from "@tanstack/react-start";

const SendEmailInput = z.object({
	to: z.email("Invalid email address"),
	message: z.string().min(1, "Message is required"),
	subject: z.string().min(1, "Subject is required").optional(),
});

const transporter = nodemailer.createTransport({
	service: "gmail",
	auth: {
		user: process.env.GMAIL_USER,
		pass: process.env.GMAIL_APP_PASSWORD,
	},
});

export const sendEmail = createServerOnlyFn(
	async (input: z.infer<typeof SendEmailInput>) => {
		const parsed = SendEmailInput.parse(input);

		const mailOptions = {
			from: process.env.GMAIL_USER,
			to: parsed.to,
			subject: parsed.subject ?? "Message from SIF",
			text: parsed.message,
		};

		try {
			await transporter.sendMail(mailOptions);
		} catch (error) {
			console.error("Email sending failed:", error);
			throw new Error("Failed to send email");
		}
	},
);
