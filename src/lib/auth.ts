import { createServerFn, createServerOnlyFn } from "@tanstack/react-start";
import {
	getRequestHeader,
	setResponseHeader,
} from "@tanstack/react-start/server";
import { compare } from "bcrypt";
import { and, eq } from "drizzle-orm";
import jwt from "jsonwebtoken";
import * as z from "zod";
import { db } from "../db";
import { users } from "../db/schema";
import { safeParseAndThrow } from "./utils";
import { redirect } from "@tanstack/react-router";

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

		const cookieHeader = getRequestHeader("Cookie") || "";
		const cookies = Object.fromEntries(
			cookieHeader.split("; ").map((c) => {
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

export async function requireAdmin() {
	const authStatus = await verifyAuth();
	if (!authStatus.authenticated || !authStatus.user.admin) {
		throw redirect({
			to: "/office",
		});
	}

	return authStatus.user;
}
