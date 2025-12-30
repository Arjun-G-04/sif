import { createServerOnlyFn } from "@tanstack/react-start";

const TURNSTILE_VERIFY_URL =
	"https://challenges.cloudflare.com/turnstile/v0/siteverify";

export const verifyTurnstileToken = createServerOnlyFn(
	async (token: string) => {
		const secretKey = process.env.TURNSTILE_SECRET_KEY;

		if (!secretKey) {
			console.error("[Turnstile] TURNSTILE_SECRET_KEY is not configured");
			throw new Error("Turnstile is not configured");
		}

		try {
			const formData = new URLSearchParams();
			formData.append("secret", secretKey);
			formData.append("response", token);

			const response = await fetch(TURNSTILE_VERIFY_URL, {
				method: "POST",
				headers: {
					"Content-Type": "application/x-www-form-urlencoded",
				},
				body: formData.toString(),
			});

			const result = (await response.json()) as {
				success: boolean;
				"error-codes"?: string[];
			};

			if (!result.success) {
				console.warn(
					"[Turnstile] Verification failed:",
					result["error-codes"],
				);
				return false;
			}

			return true;
		} catch (error) {
			console.error("[Turnstile] Verification error:", error);
			return false;
		}
	},
);
