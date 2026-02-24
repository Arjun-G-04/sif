import { redirect } from "@tanstack/react-router";
import { createServerFn, createServerOnlyFn } from "@tanstack/react-start";
import { getRequest, setResponseHeader } from "@tanstack/react-start/server";
import { compare, hash } from "bcrypt";
import { and, eq } from "drizzle-orm";
import jwt from "jsonwebtoken";
import * as z from "zod";
import crypto from "node:crypto";
import { db } from "../db";
import { users } from "../db/schema";
import { sendEmail } from "./email";
import { safeParseAndThrow } from "./utils";

const getJWTSecret = createServerOnlyFn(() => {
	if (!process.env.JWT_SECRET) {
		throw new Error("JWT_SECRET is not defined");
	}
	const JWT_SECRET = process.env.JWT_SECRET;
	return JWT_SECRET;
});

const OfficeSignInInput = z.object({
	username: z.string().min(1, "Username is required"),
	password: z.string().min(1, "Password is required"),
});

const PublicSignInInput = z.object({
	username: z.string().min(1, "Username is required"),
	password: z.string().min(1, "Password is required"),
});

export const officeSignIn = createServerFn({ method: "POST" })
	.inputValidator(OfficeSignInInput)
	.handler(async ({ data }) => {
		const parsedData = safeParseAndThrow(data, OfficeSignInInput);

		// Check if user exists in database
		const [user] = await db
			.select()
			.from(users)
			.where(
				and(
					eq(users.username, parsedData.username),
					eq(users.role, "admin"),
				),
			)
			.limit(1);

		if (!user) {
			throw new Error("Invalid username or password");
		}

		// Verify password with bcrypt
		const isPasswordValid = await compare(
			parsedData.password,
			user.password,
		);

		if (!isPasswordValid) {
			throw new Error("Invalid username or password");
		}

		// Create JWT with username and admin boolean
		const token = jwt.sign(
			{
				username: user.username,
				admin: user.role === "admin",
			},
			getJWTSecret(),
			{ expiresIn: "7d" },
		);

		// Store JWT as HTTP-only cookie
		const maxAge = 60 * 60 * 24 * 7; // 7 days
		const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
		const cookieValue = `auth_token=${token}; HttpOnly; Path=/; SameSite=Lax; Max-Age=${maxAge}${secure}`;
		setResponseHeader("Set-Cookie", cookieValue);
	});

export const publicSignIn = createServerFn({ method: "POST" })
	.inputValidator(PublicSignInInput)
	.handler(async ({ data }) => {
		const parsedData = safeParseAndThrow(data, PublicSignInInput);

		// Check if user exists in database
		const [user] = await db
			.select()
			.from(users)
			.where(
				and(
					eq(users.username, parsedData.username),
					eq(users.role, "public"),
				),
			)
			.limit(1);

		if (!user) {
			throw new Error("Invalid username or password");
		}

		// Verify password with bcrypt
		const isPasswordValid = await compare(
			parsedData.password,
			user.password,
		);

		if (!isPasswordValid) {
			throw new Error("Invalid username or password");
		}

		// Create JWT with username and admin boolean
		const token = jwt.sign(
			{
				username: user.username,
				admin: user.role === "admin",
			},
			getJWTSecret(),
			{ expiresIn: "7d" },
		);

		// Store JWT as HTTP-only cookie
		const maxAge = 60 * 60 * 24 * 7; // 7 days
		const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
		const cookieValue = `auth_token=${token}; HttpOnly; Path=/; SameSite=Lax; Max-Age=${maxAge}${secure}`;
		setResponseHeader("Set-Cookie", cookieValue);
	});

export type AuthPayload = {
	username: string;
	admin: boolean;
};

export const verifyAuth = createServerFn({ method: "GET" }).handler(
	async () => {
		const JWT_SECRET = getJWTSecret();

		if (!JWT_SECRET) {
			return { authenticated: false, user: null };
		}

		const cookieHeader = getRequest()?.headers.get("Cookie") || "";
		const cookies = Object.fromEntries(
			cookieHeader.split("; ").map((c: string) => {
				const [key, ...val] = c.split("=");
				return [key, val.join("=")];
			}),
		);

		const token = cookies.auth_token;
		if (!token) {
			return { authenticated: false, user: null };
		}

		try {
			const payload = jwt.verify(token, JWT_SECRET) as AuthPayload;
			return { authenticated: true, user: payload };
		} catch {
			return { authenticated: false, user: null };
		}
	},
);

export const officeSignOut = createServerFn({ method: "POST" }).handler(
	async () => {
		const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
		const cookieValue = `auth_token=; HttpOnly; Path=/; SameSite=Lax; Max-Age=0${secure}`;
		setResponseHeader("Set-Cookie", cookieValue);
	},
);

export const publicSignOut = createServerFn({ method: "POST" }).handler(
	async () => {
		const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
		const cookieValue = `auth_token=; HttpOnly; Path=/; SameSite=Lax; Max-Age=0${secure}`;
		setResponseHeader("Set-Cookie", cookieValue);
	},
);

export async function requireAdmin() {
	const authStatus = await verifyAuth();
	if (!authStatus.authenticated || !authStatus.user.admin) {
		throw redirect({
			to: "/office",
		});
	}

	return authStatus.user;
}

export async function requireUser() {
	const authStatus = await verifyAuth();
	if (!authStatus.authenticated) {
		throw redirect({
			to: "/",
		});
	}

	return authStatus.user;
}

const RequestResetInput = z.object({
	email: z.email("Invalid email address"),
});

export const requestPasswordReset = createServerFn({ method: "POST" })
	.inputValidator(RequestResetInput)
	.handler(async ({ data }) => {
		const { email } = safeParseAndThrow(data, RequestResetInput);

		// 1. Find user
		const [user] = await db
			.select()
			.from(users)
			.where(eq(users.username, email))
			.limit(1);

		if (!user) {
			// Don't reveal if user exists or not for security
			return { success: true };
		}

		// 2. Generate token
		const token = crypto.randomBytes(32).toString("hex");
		const expires = new Date(Date.now() + 3600000); // 1 hour from now

		// 3. Store token in DB
		await db
			.update(users)
			.set({
				resetPasswordToken: token,
				resetPasswordExpires: expires,
			})
			.where(eq(users.id, user.id));

		// 4. Send email
		const resetUrl = `${process.env.APP_URL}/reset-password?token=${token}`;

		try {
			await sendEmail({
				to: email,
				subject: "Password Reset Request",
				message: `You requested a password reset. Please click the link below to reset your password:\n\n${resetUrl}\n\nThis link will expire in 1 hour. If you didn't request this, please ignore this email.`,
			});
		} catch (error) {
			console.error("Failed to send reset email:", error);
			// Optional: you might want to handle this differently
		}

		return { success: true };
	});

const ResetPasswordInput = z.object({
	token: z.string().min(1, "Token is required"),
	password: z.string().min(8, "Password must be at least 8 characters"),
});

export const resetPassword = createServerFn({ method: "POST" })
	.inputValidator(ResetPasswordInput)
	.handler(async ({ data }) => {
		const { token, password } = safeParseAndThrow(data, ResetPasswordInput);

		// 1. Find user with valid token
		const [user] = await db
			.select()
			.from(users)
			.where(eq(users.resetPasswordToken, token))
			.limit(1);

		if (
			!user ||
			!user.resetPasswordExpires ||
			user.resetPasswordExpires < new Date()
		) {
			throw new Error("Invalid or expired reset token");
		}

		// 2. Hash new password
		const hashedPassword = await hash(password, 10);

		// 3. Update password and clear token
		await db
			.update(users)
			.set({
				password: hashedPassword,
				resetPasswordToken: null,
				resetPasswordExpires: null,
			})
			.where(eq(users.id, user.id));

		return { success: true };
	});
