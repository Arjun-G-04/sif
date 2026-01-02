import { db } from "@/db";
import { configurations } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import { safeParseAndThrow } from "@/lib/utils";
import { createServerFn, createServerOnlyFn } from "@tanstack/react-start";
import { eq } from "drizzle-orm";
import * as z from "zod";

export const getConfigHelper = createServerOnlyFn(async () => {
	const [config] = await db
		.select()
		.from(configurations)
		.where(eq(configurations.id, 1))
		.limit(1);
	return config ? config : null;
});

export const getConfiguration = createServerFn({ method: "GET" }).handler(
	async () => {
		await requireAdmin();

		return await getConfigHelper();
	},
);

const UpdateConfigurationInput = z.object({
	officeEmail: z.email("Invalid email address"),
});

export const updateConfiguration = createServerFn({ method: "POST" })
	.inputValidator(UpdateConfigurationInput)
	.handler(async ({ data }) => {
		await requireAdmin();

		const parsedData = safeParseAndThrow(data, UpdateConfigurationInput);

		const [config] = await db
			.select()
			.from(configurations)
			.where(eq(configurations.id, 1))
			.limit(1);
		if (!config) {
			await db.insert(configurations).values({ id: 1, ...parsedData });
		} else {
			await db
				.update(configurations)
				.set(parsedData)
				.where(eq(configurations.id, 1));
		}
	});
