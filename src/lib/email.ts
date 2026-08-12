import nodemailer from "nodemailer";
import * as z from "zod";
import { createServerOnlyFn } from "@tanstack/react-start";

const SendEmailInput = z.object({
	to: z.email("Invalid email address"),
	message: z.string().min(1, "Message is required"),
	subject: z.string().min(1, "Subject is required").optional(),
});

// NITT Webmail Configuration
const nittUser = process.env.NITT_USER || "";
const nittAuthUser = nittUser.includes("@") ? nittUser.split("@")[0] : nittUser;
const nittPass = process.env.NITT_PASSWORD;
const nittHost = process.env.WEBMAIL_HOST || "webmail.nitt.edu";
const smtpPort = process.env.SMTP_PORT
	? Number.parseInt(process.env.SMTP_PORT, 10)
	: 465;
const smtpSecure =
	process.env.SMTP_SECURE !== undefined
		? process.env.SMTP_SECURE === "true"
		: true;

const hasNittCreds = !!(nittUser && nittPass);

const nittTransporter = hasNittCreds
	? nodemailer.createTransport({
			host: nittHost,
			port: smtpPort,
			secure: smtpSecure,
			auth: {
				user: nittAuthUser,
				pass: nittPass,
			},
		})
	: null;

// Brevo API Helper (Sends over HTTPS Port 443)
async function sendViaBrevo(to: string, subject: string, textContent: string) {
	const apiKey = process.env.BREVO_API_KEY;
	if (!apiKey) return false;

	const senderEmail =
		process.env.BREVO_SENDER_EMAIL || nittUser || "no-reply@nitt.edu";
	const senderName = process.env.BREVO_SENDER_NAME || "SIF";

	const response = await fetch("https://api.brevo.com/v3/smtp/email", {
		method: "POST",
		headers: {
			accept: "application/json",
			"api-key": apiKey,
			"content-type": "application/json",
		},
		body: JSON.stringify({
			sender: {
				name: senderName,
				email: senderEmail,
			},
			to: [{ email: to }],
			subject,
			textContent,
		}),
	});

	if (!response.ok) {
		const errorData = await response.json().catch(() => ({}));
		throw new Error(
			errorData.message || `Brevo API HTTP error ${response.status}`,
		);
	}

	return true;
}

export const sendEmail = createServerOnlyFn(
	async (input: z.infer<typeof SendEmailInput>) => {
		const parsed = SendEmailInput.parse(input);
		const subject = parsed.subject ?? "Message from SIF";

		if (process.env.NODE_ENV !== "production") {
			console.log("--- DEVELOPMENT EMAIL CONTENT ---");
			console.log(`To: ${parsed.to}`);
			console.log(`Subject: ${subject}`);
			console.log("Message:");
			console.log(parsed.message);
			console.log("----------------------------------");
			return;
		}

		// Try NITT Webmail first if credentials exist
		if (nittTransporter) {
			try {
				await nittTransporter.sendMail({
					from: nittUser,
					to: parsed.to,
					subject,
					text: parsed.message,
				});
				return;
			} catch (nittError) {
				console.warn(
					"NITT Webmail sending failed. Checking for Brevo fallback...",
					nittError,
				);
			}
		}

		// Try Brevo HTTP API (as fallback or primary if no NITT creds)
		if (process.env.BREVO_API_KEY) {
			try {
				await sendViaBrevo(parsed.to, subject, parsed.message);
				return;
			} catch (brevoError) {
				console.error("Brevo API sending failed:", brevoError);
			}
		}

		console.error(
			"Email sending failed: No working email transport available.",
		);
		throw new Error("Failed to send email");
	},
);
