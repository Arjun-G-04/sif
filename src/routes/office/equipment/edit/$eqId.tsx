import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { FieldDialog } from "@/components/office/fieldDialog";
import { FieldsView } from "@/components/office/fieldsView";
import { Header } from "@/components/office/header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { requireAdmin } from "@/lib/auth";
import { getEquipmentNameById } from "@/services/equipment";
import { getFields } from "@/services/field";

const equipmentQueryOptions = (eqId: number) =>
	queryOptions({
		queryKey: ["equipment", eqId],
		queryFn: () => getEquipmentNameById({ data: { id: eqId } }),
	});

const fieldsQueryOptions = (eqId: number) =>
	queryOptions({
		queryKey: ["fields", "equipment", eqId],
		queryFn: () =>
			getFields({
				data: { entityType: "equipment", entityId: eqId },
			}),
	});

const defaultFieldsQueryOptions = queryOptions({
	queryKey: ["fields", "equipment", "defaults"],
	queryFn: () => getFields({ data: { entityType: "equipment" } }),
});

export const Route = createFileRoute("/office/equipment/edit/$eqId")({
	component: EquipmentFieldsPage,
	loader: async ({ context, params }) => {
		const user = await requireAdmin();
		const eqId = Number(params.eqId);

		await Promise.all([
			context.queryClient.ensureQueryData(equipmentQueryOptions(eqId)),
			context.queryClient.ensureQueryData(fieldsQueryOptions(eqId)),
			context.queryClient.ensureQueryData(defaultFieldsQueryOptions),
		]);

		return { user, eqId };
	},
});

function EquipmentFieldsPage() {
	const { user, eqId } = Route.useLoaderData();
	const equipmentQuery = useSuspenseQuery(equipmentQueryOptions(eqId));
	const fieldsQuery = useSuspenseQuery(fieldsQueryOptions(eqId));
	const defaultFieldsQuery = useSuspenseQuery(defaultFieldsQueryOptions);
	const defaultFieldIds = useMemo(
		() => defaultFieldsQuery.data.map((field) => field.id),
		[defaultFieldsQuery.data],
	);
	const mergedFields = useMemo(
		() => [...defaultFieldsQuery.data, ...fieldsQuery.data],
		[defaultFieldsQuery.data, fieldsQuery.data],
	);

	return (
		<div className="min-h-screen flex flex-col bg-slate-50/50">
			<Header user={user} backTo="/office/equipment/edit" />
			<main className="flex-1 p-4 md:p-6 lg:p-8">
				<div className="w-full space-y-6">
					<div className="flex justify-between items-center">
						<div>
							<h2 className="text-2xl font-bold tracking-tight text-slate-900">
								{equipmentQuery.data ?? "Equipment"} Fields
							</h2>
							<p className="text-slate-500">
								Manage equipment-specific fields with default
								fields visible as read-only reference.
							</p>
						</div>
					</div>

					<Tabs defaultValue="initial" className="w-full space-y-6">
						<TabsList className="w-full bg-white border">
							<TabsTrigger
								value="initial"
								className="data-[state=active]:bg-slate-100"
							>
								Initial Booking Fields
							</TabsTrigger>
							<TabsTrigger
								value="payment"
								className="data-[state=active]:bg-slate-100"
							>
								Payment Stage Fields
							</TabsTrigger>
						</TabsList>

						<TabsContent
							value="initial"
							className="space-y-6 outline-none"
						>
							<div className="flex justify-end">
								<FieldDialog
									entityType="equipment"
									entityId={eqId}
									stage="initial"
									allowedRelations={[
										{
											entityType: "registration",
											label: "Registration",
										},
									]}
								/>
							</div>
							<FieldsView
								fields={mergedFields}
								stage="initial"
								readOnlyFieldIds={defaultFieldIds}
								allowedRelations={[
									{
										entityType: "registration",
										label: "Registration",
									},
								]}
							/>
						</TabsContent>

						<TabsContent
							value="payment"
							className="space-y-6 outline-none"
						>
							<div className="flex justify-end">
								<FieldDialog
									entityType="equipment"
									entityId={eqId}
									stage="payment"
									allowedRelations={[
										{
											entityType: "registration",
											label: "Registration",
										},
									]}
								/>
							</div>
							<FieldsView
								fields={mergedFields}
								stage="payment"
								readOnlyFieldIds={defaultFieldIds}
								allowedRelations={[
									{
										entityType: "registration",
										label: "Registration",
									},
								]}
							/>
						</TabsContent>
					</Tabs>
				</div>
			</main>
		</div>
	);
}
