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

const JWTAuthPayload = z.object({
	username: z.string(),
	role: z.enum(["public", "admin", "operator"]),
});

export type AuthPayload = z.infer<typeof JWTAuthPayload>;
export type AuthRole = AuthPayload["role"];

export const officeSignIn = createServerFn({ method: "POST" })
	.inputValidator(OfficeSignInInput)
	.handler(async ({ data }) => {
		const parsedData = safeParseAndThrow(data, OfficeSignInInput);

		const [user] = await db
			.select({
				username: users.username,
				password: users.password,
				role: users.role,
			})
			.from(users)
			.where(
				and(
					eq(users.username, parsedData.username),
					eq(users.active, true),
				),
			)
			.limit(1);

		if (!user || (user.role !== "admin" && user.role !== "operator")) {
			throw new Error("Invalid username or password");
		}

		const isPasswordValid = await compare(
			parsedData.password,
			user.password,
		);

		if (!isPasswordValid) {
			throw new Error("Invalid username or password");
		}

		const token = jwt.sign(
			{
				username: user.username,
				role: user.role,
			},
			getJWTSecret(),
			{ expiresIn: "7d" },
		);

		const maxAge = 60 * 60 * 24 * 7;
		const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
		const cookieValue = `auth_token=${token}; HttpOnly; Path=/; SameSite=Lax; Max-Age=${maxAge}${secure}`;
		setResponseHeader("Set-Cookie", cookieValue);
	});

export const publicSignIn = createServerFn({ method: "POST" })
	.inputValidator(PublicSignInInput)
	.handler(async ({ data }) => {
		const parsedData = safeParseAndThrow(data, PublicSignInInput);

		const [user] = await db
			.select({
				username: users.username,
				password: users.password,
				role: users.role,
			})
			.from(users)
			.where(
				and(
					eq(users.username, parsedData.username),
					eq(users.role, "public"),
					eq(users.active, true),
				),
			)
			.limit(1);

		if (!user) {
			throw new Error("Invalid username or password");
		}

		const isPasswordValid = await compare(
			parsedData.password,
			user.password,
		);

		if (!isPasswordValid) {
			throw new Error("Invalid username or password");
		}

		const token = jwt.sign(
			{
				username: user.username,
				role: user.role,
			},
			getJWTSecret(),
			{ expiresIn: "7d" },
		);

		const maxAge = 60 * 60 * 24 * 7;
		const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
		const cookieValue = `auth_token=${token}; HttpOnly; Path=/; SameSite=Lax; Max-Age=${maxAge}${secure}`;
		setResponseHeader("Set-Cookie", cookieValue);
	});

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
			const rawPayload = jwt.verify(token, JWT_SECRET);
			const parsedPayload = JWTAuthPayload.safeParse(rawPayload);
			if (!parsedPayload.success) {
				return { authenticated: false, user: null };
			}
			const payload = parsedPayload.data;

			const [dbUser] = await db
				.select({
					username: users.username,
					role: users.role,
					active: users.active,
				})
				.from(users)
				.where(eq(users.username, payload.username))
				.limit(1);

			if (!dbUser || !dbUser.active) {
				return { authenticated: false, user: null };
			}

			return {
				authenticated: true,
				user: {
					username: dbUser.username,
					role: dbUser.role,
				} satisfies AuthPayload,
			};
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

export async function requireOfficeUser() {
	const authStatus = await verifyAuth();
	if (
		!authStatus.authenticated ||
		(authStatus.user.role !== "admin" &&
			authStatus.user.role !== "operator")
	) {
		throw redirect({
			to: "/office",
		});
	}

	return authStatus.user;
}

export async function requireAdmin() {
	const authStatus = await verifyAuth();
	if (!authStatus.authenticated || authStatus.user.role !== "admin") {
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

		const [user] = await db
			.select()
			.from(users)
			.where(and(eq(users.username, email), eq(users.role, "public")))
			.limit(1);

		if (!user) {
			return { success: true };
		}

		const token = crypto.randomBytes(32).toString("hex");
		const expires = new Date(Date.now() + 3600000);

		await db
			.update(users)
			.set({
				resetPasswordToken: token,
				resetPasswordExpires: expires,
			})
			.where(eq(users.id, user.id));

		const resetUrl = `${process.env.APP_URL}/reset-password?token=${token}`;

		try {
			await sendEmail({
				to: email,
				subject: "Password Reset Request",
				message: `You requested a password reset. Please click the link below to reset your password:\n\n${resetUrl}\n\nThis link will expire in 1 hour. If you didn't request this, please ignore this email.`,
			});
		} catch (error) {
			console.error("Failed to send reset email:", error);
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

		const [user] = await db
			.select()
			.from(users)
			.where(
				and(
					eq(users.resetPasswordToken, token),
					eq(users.role, "public"),
				),
			)
			.limit(1);

		if (
			!user ||
			!user.resetPasswordExpires ||
			user.resetPasswordExpires < new Date()
		) {
			throw new Error("Invalid or expired reset token");
		}

		const hashedPassword = await hash(password, 10);

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
