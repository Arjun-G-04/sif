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
	officeEmail: z.email("Invalid email address").optional(),
	registrationCategoryFieldId: z.number().nullable().optional(),
	registrationNameFieldId: z.number().nullable().optional(),
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
			await db.insert(configurations).values({
				id: 1,
				officeEmail: parsedData.officeEmail ?? null,
				registrationCategoryFieldId:
					parsedData.registrationCategoryFieldId ?? null,
				registrationNameFieldId:
					parsedData.registrationNameFieldId ?? null,
			});
		} else {
			const updateData: Partial<typeof configurations.$inferInsert> = {};
			if (parsedData.officeEmail !== undefined) {
				updateData.officeEmail = parsedData.officeEmail;
			}
			if (parsedData.registrationCategoryFieldId !== undefined) {
				updateData.registrationCategoryFieldId =
					parsedData.registrationCategoryFieldId;
			}
			if (parsedData.registrationNameFieldId !== undefined) {
				updateData.registrationNameFieldId =
					parsedData.registrationNameFieldId;
			}

			if (Object.keys(updateData).length > 0) {
				await db
					.update(configurations)
					.set(updateData)
					.where(eq(configurations.id, 1));
			}
		}
	});
