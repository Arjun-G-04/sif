import { createServerOnlyFn } from "@tanstack/react-start";
import {
	Agent,
	type RequestInfo,
	type RequestInit,
	type Response as UndiciResponse,
	fetch as undiciFetch,
} from "undici";

export const ISTEM_BASE_URL =
	process.env.ISTEM_BASE_URL || "https://istemstaging.iisc.ac.in/istem3";

// Helper to extract detailed error message including cause if present
export function getErrorMessage(err: unknown): string {
	if (err instanceof Error) {
		const cause = (err as { cause?: unknown }).cause;
		if (cause) {
			const causeMsg =
				cause instanceof Error
					? cause.message
					: typeof cause === "object" &&
							cause !== null &&
							"code" in cause
						? String((cause as { code: unknown }).code)
						: String(cause);
			return `${err.message} (${causeMsg})`;
		}
		return err.message;
	}
	return String(err);
}

const istemDispatcher = new Agent({
	connect: {
		rejectUnauthorized: false,
	},
});

// Helper to execute fetch requests to I-STEM server allowing staging certificates
export const istemFetch = createServerOnlyFn(
	(input: RequestInfo, init?: RequestInit): Promise<UndiciResponse> => {
		return undiciFetch(input, {
			...init,
			dispatcher: istemDispatcher,
		});
	},
);

// Helper to format Date into Asia/Kolkata (IST) timezone formatted string "YYYY-MM-DD HH:mm:ss"
export function formatToLocalIstemTime(date: Date): string {
	const formatter = new Intl.DateTimeFormat("en-CA", {
		timeZone: "Asia/Kolkata",
		year: "numeric",
		month: "2-digit",
		day: "2-digit",
		hour: "2-digit",
		minute: "2-digit",
		second: "2-digit",
		hour12: false,
	});
	const parts = formatter.formatToParts(date);
	const r = (type: string) => parts.find((p) => p.type === type)?.value;
	return `${r("year")}-${r("month")}-${r("day")} ${r("hour")}:${r("minute")}:${r("second")}`;
}
