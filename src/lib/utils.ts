import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import * as z from "zod";

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}

export function safeParseAndThrow<T>(data: T, schema: z.ZodSchema<T>) {
	const parsedData = schema.safeParse(data);
	if (!parsedData.success) {
		const errorMessage = parsedData.error.issues
			.map((issue) => `${issue.path}: ${issue.message}`)
			.join(", ");
		throw new Error(errorMessage);
	}
	return parsedData.data;
}
