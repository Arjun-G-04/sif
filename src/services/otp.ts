import { createServerFn } from "@tanstack/react-start";
import { eq, and, gt } from "drizzle-orm";
import * as z from "zod";
import { hash, compare } from "bcrypt";
import { db } from "../db";
import { otpVerifications, otpType, users } from "../db/schema";
import { safeParseAndThrow } from "../lib/utils";
import { verifyTurnstileToken } from "../lib/turnstile";
import { checkRateLimit, recordRequest } from "../lib/rateLimit";
import { sendEmail } from "@/lib/email";

const SendOtpInput = z.object({
	type: z.enum(otpType.enumValues),
	target: z.string().min(1, "Target is required"),
	turnstileToken: z.string().min(1, "Turnstile token is required"),
});

const VerifyOtpInput = z.object({
	type: z.enum(otpType.enumValues),
	target: z.string().min(1, "Target is required"),
	otp: z.string().length(6, "OTP must be 6 digits"),
});

// 10 mins
const OTP_EXPIRY_MS = 10 * 60 * 1000;
const MAX_VERIFICATION_ATTEMPTS = 5;

export const verifyOtp = createServerFn({ method: "POST" })
	.inputValidator(VerifyOtpInput)
	.handler(async ({ data }) => {
		const parsedData = safeParseAndThrow(data, VerifyOtpInput);

		// Find the most recent unverified OTP for this target
		const [otpRecord] = await db
			.select()
			.from(otpVerifications)
			.where(
				and(
					eq(otpVerifications.type, parsedData.type),
					eq(otpVerifications.target, parsedData.target),
					eq(otpVerifications.verified, false),
					gt(otpVerifications.expiresAt, new Date()),
				),
			)
			.orderBy(otpVerifications.createdAt)
			.limit(1);

		if (!otpRecord) {
			throw new Error("No valid OTP found. Please request a new one.");
		}

		// Check max attempts
		if (otpRecord.attempts >= MAX_VERIFICATION_ATTEMPTS) {
			throw new Error(
				"Maximum verification attempts exceeded. Please request a new OTP.",
			);
		}

		// Increment attempts
		await db
			.update(otpVerifications)
			.set({ attempts: otpRecord.attempts + 1 })
			.where(eq(otpVerifications.id, otpRecord.id));

		// Verify OTP
		const isValid = await compare(parsedData.otp, otpRecord.otpHash);
		if (!isValid) {
			const remainingAttempts =
				MAX_VERIFICATION_ATTEMPTS - otpRecord.attempts - 1;
			throw new Error(
				`Invalid OTP. ${remainingAttempts} attempts remaining.`,
			);
		}

		// Mark as verified
		await db
			.update(otpVerifications)
			.set({ verified: true })
			.where(eq(otpVerifications.id, otpRecord.id));

		return { message: "OTP verified successfully" };
	});

export const sendOtp = createServerFn({ method: "POST" })
	.inputValidator(SendOtpInput)
	.handler(async ({ data }) => {
		const parsedData = safeParseAndThrow(data, SendOtpInput);

		// Specific validations based on type
		if (parsedData.type === "email") {
			const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
			if (!emailRegex.test(parsedData.target)) {
				throw new Error("Invalid email format");
			}
		} else if (parsedData.type === "phone") {
			// const phoneDigits = parsedData.target.replace(/\D/g, "");
			// if (phoneDigits.length < 10) {
			// 	throw new Error("Invalid phone number format");
			// }
		}

		// Verify Turnstile token
		const isTurnstileValid = await verifyTurnstileToken(
			parsedData.turnstileToken,
		);
		if (!isTurnstileValid) {
			throw new Error("Turnstile verification failed. Please try again.");
		}

		// Check rate limits
		const rateCheck = checkRateLimit(parsedData.target);
		if (!rateCheck.allowed) {
			throw new Error(
				`Too many requests. Please try again in ${rateCheck.retryAfter} seconds.`,
			);
		}

		// Check if user already exists for email type
		if (parsedData.type === "email") {
			const [existingUser] = await db
				.select()
				.from(users)
				.where(eq(users.username, parsedData.target))
				.limit(1);

			if (existingUser) {
				throw new Error("An account with this email already exists.");
			}
		}

		// Generate OTP
		const otp = Math.floor(100000 + Math.random() * 900000).toString();
		const otpHash = await hash(otp, 10);
		const expiresAt = new Date(Date.now() + OTP_EXPIRY_MS);

		// Store OTP in database
		await db.insert(otpVerifications).values({
			type: parsedData.type,
			target: parsedData.target,
			otpHash,
			expiresAt,
			turnstileToken: parsedData.turnstileToken,
		});

		// Record request for rate limiting
		recordRequest(parsedData.target);

		if (parsedData.type === "email") {
			await sendEmail({
				to: parsedData.target,
				message: `Your OTP is ${otp}`,
				subject: "OTP for SIF Registration",
			});
		} else if (parsedData.type === "phone") {
			await sendEmail({
				to: parsedData.target,
				message: `[Simulated Phone] Your OTP is ${otp}`,
				subject: "[Simulated Phone] OTP for SIF Registration",
			});
		}

		return { message: `OTP sent to your ${parsedData.type}` };
	});
