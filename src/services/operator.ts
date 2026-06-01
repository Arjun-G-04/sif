import { hash } from "bcrypt";
import { db } from "@/db";
import { equipments, operatorEquipments, users } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import { safeParseAndThrow } from "@/lib/utils";
import { createServerFn } from "@tanstack/react-start";
import { and, asc, eq, inArray } from "drizzle-orm";
import * as z from "zod";

const PasswordSchema = z
	.string()
	.min(8, "Password must be at least 8 characters");

const EquipmentIdsSchema = z
	.array(z.number().int().positive())
	.min(1, "At least one equipment assignment is required")
	.transform((values) => [...new Set(values)]);

const CreateOperatorInput = z.object({
	username: z.string().min(1, "Username is required"),
	password: PasswordSchema,
	equipmentIds: EquipmentIdsSchema,
});

const UpdateOperatorAssignmentsInput = z.object({
	operatorId: z.number().int().positive(),
	equipmentIds: EquipmentIdsSchema,
});

const SetOperatorActiveInput = z.object({
	operatorId: z.number().int().positive(),
	active: z.boolean(),
});

const ResetOperatorPasswordInput = z.object({
	operatorId: z.number().int().positive(),
	password: PasswordSchema,
});

async function assertActiveEquipmentIds(equipmentIds: number[]) {
	const available = await db
		.select({ id: equipments.id })
		.from(equipments)
		.where(
			and(
				inArray(equipments.id, equipmentIds),
				eq(equipments.active, true),
			),
		);

	if (available.length !== equipmentIds.length) {
		throw new Error(
			"One or more selected equipments are invalid or inactive",
		);
	}
}

async function assertOperator(operatorId: number) {
	const [operator] = await db
		.select({ id: users.id })
		.from(users)
		.where(and(eq(users.id, operatorId), eq(users.role, "operator")))
		.limit(1);

	if (!operator) {
		throw new Error("Operator not found");
	}
}

export const getOperatorManagementData = createServerFn({
	method: "GET",
}).handler(async () => {
	await requireAdmin();

	const [operatorRows, equipmentRows, assignmentRows] = await Promise.all([
		db
			.select({
				id: users.id,
				username: users.username,
				active: users.active,
			})
			.from(users)
			.where(eq(users.role, "operator"))
			.orderBy(asc(users.username), users.id),
		db
			.select({
				id: equipments.id,
				name: equipments.name,
				active: equipments.active,
			})
			.from(equipments)
			.orderBy(asc(equipments.name), equipments.id),
		db
			.select({
				operatorId: operatorEquipments.operatorId,
				equipmentId: operatorEquipments.equipmentId,
				equipmentName: equipments.name,
				equipmentActive: equipments.active,
			})
			.from(operatorEquipments)
			.innerJoin(
				equipments,
				eq(operatorEquipments.equipmentId, equipments.id),
			),
	]);

	const assignmentsByOperator = new Map<
		number,
		Array<{ id: number; name: string; active: boolean }>
	>();

	for (const assignment of assignmentRows) {
		const current = assignmentsByOperator.get(assignment.operatorId) ?? [];
		current.push({
			id: assignment.equipmentId,
			name: assignment.equipmentName,
			active: assignment.equipmentActive,
		});
		assignmentsByOperator.set(assignment.operatorId, current);
	}

	const operators = operatorRows.map((operator) => ({
		...operator,
		assignments: (assignmentsByOperator.get(operator.id) ?? []).sort(
			(a, b) => a.name.localeCompare(b.name),
		),
	}));

	return {
		operators,
		equipments: equipmentRows,
	};
});

export const createOperator = createServerFn({ method: "POST" })
	.inputValidator(CreateOperatorInput)
	.handler(async ({ data }) => {
		await requireAdmin();
		const parsed = safeParseAndThrow(data, CreateOperatorInput);
		await assertActiveEquipmentIds(parsed.equipmentIds);

		const [existingUser] = await db
			.select({ id: users.id })
			.from(users)
			.where(eq(users.username, parsed.username))
			.limit(1);

		if (existingUser) {
			throw new Error("Username is already taken");
		}

		const hashedPassword = await hash(parsed.password, 10);

		await db.transaction(async (tx) => {
			const [created] = await tx
				.insert(users)
				.values({
					username: parsed.username,
					password: hashedPassword,
					role: "operator",
					active: true,
				})
				.returning({ id: users.id });

			await tx.insert(operatorEquipments).values(
				parsed.equipmentIds.map((equipmentId) => ({
					operatorId: created.id,
					equipmentId,
				})),
			);
		});

		return { success: true };
	});

export const updateOperatorAssignments = createServerFn({ method: "POST" })
	.inputValidator(UpdateOperatorAssignmentsInput)
	.handler(async ({ data }) => {
		await requireAdmin();
		const parsed = safeParseAndThrow(data, UpdateOperatorAssignmentsInput);

		await assertOperator(parsed.operatorId);
		await assertActiveEquipmentIds(parsed.equipmentIds);

		await db.transaction(async (tx) => {
			await tx
				.delete(operatorEquipments)
				.where(eq(operatorEquipments.operatorId, parsed.operatorId));

			await tx.insert(operatorEquipments).values(
				parsed.equipmentIds.map((equipmentId) => ({
					operatorId: parsed.operatorId,
					equipmentId,
				})),
			);
		});

		return { success: true };
	});

export const setOperatorActive = createServerFn({ method: "POST" })
	.inputValidator(SetOperatorActiveInput)
	.handler(async ({ data }) => {
		await requireAdmin();
		const parsed = safeParseAndThrow(data, SetOperatorActiveInput);
		await assertOperator(parsed.operatorId);

		await db
			.update(users)
			.set({ active: parsed.active })
			.where(eq(users.id, parsed.operatorId));

		return { success: true };
	});

export const resetOperatorPassword = createServerFn({ method: "POST" })
	.inputValidator(ResetOperatorPasswordInput)
	.handler(async ({ data }) => {
		await requireAdmin();
		const parsed = safeParseAndThrow(data, ResetOperatorPasswordInput);
		await assertOperator(parsed.operatorId);

		const hashedPassword = await hash(parsed.password, 10);
		await db
			.update(users)
			.set({
				password: hashedPassword,
				resetPasswordToken: null,
				resetPasswordExpires: null,
			})
			.where(eq(users.id, parsed.operatorId));

		return { success: true };
	});
