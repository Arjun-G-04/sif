import { createServerOnlyFn } from "@tanstack/react-start";

// In-memory rate limit store
// Key format: "target:{target}"
const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

const RATE_LIMITS = {
	perTarget: { max: 3, windowMs: 60 * 60 * 1000 }, // 3 requests per hour per email/phone
};

export const checkRateLimit = createServerOnlyFn((target: string) => {
	const now = Date.now();

	// Clean expired entries
	for (const [key, value] of rateLimitStore.entries()) {
		if (value.resetAt <= now) {
			rateLimitStore.delete(key);
		}
	}

	// Check target (email/phone) rate limit
	const targetKey = `target:${target}`;
	const targetEntry = rateLimitStore.get(targetKey);
	if (
		targetEntry &&
		targetEntry.resetAt > now &&
		targetEntry.count >= RATE_LIMITS.perTarget.max
	) {
		return {
			allowed: false,
			retryAfter: Math.ceil((targetEntry.resetAt - now) / 1000),
		};
	}

	return { allowed: true };
});

export const recordRequest = createServerOnlyFn((target: string): void => {
	const now = Date.now();

	const targetKey = `target:${target}`;
	const targetEntry = rateLimitStore.get(targetKey);
	if (targetEntry && targetEntry.resetAt > now) {
		targetEntry.count++;
	} else {
		rateLimitStore.set(targetKey, {
			count: 1,
			resetAt: now + RATE_LIMITS.perTarget.windowMs,
		});
	}
});
