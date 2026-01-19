import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { FieldDialog } from "@/components/office/fieldDialog";
import { FieldsView } from "@/components/office/fieldsView";
import { Header } from "@/components/office/header";
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

export const Route = createFileRoute("/office/equipment/edit/$eqId")({
	component: EquipmentFieldsPage,
	loader: async ({ context, params }) => {
		const user = await requireAdmin();
		const eqId = Number(params.eqId);

		await Promise.all([
			context.queryClient.ensureQueryData(equipmentQueryOptions(eqId)),
			context.queryClient.ensureQueryData(fieldsQueryOptions(eqId)),
		]);

		return { user, eqId };
	},
});

function EquipmentFieldsPage() {
	const { user, eqId } = Route.useLoaderData();
	const equipmentQuery = useSuspenseQuery(equipmentQueryOptions(eqId));
	const fieldsQuery = useSuspenseQuery(fieldsQueryOptions(eqId));

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
								Manage custom fields for this equipment.
							</p>
						</div>
						<FieldDialog
							entityType="equipment"
							entityId={eqId}
							allowedRelations={[
								{
									entityType: "registration",
									label: "Registration",
								},
							]}
						/>
					</div>
					<FieldsView
						fields={fieldsQuery.data}
						allowedRelations={[
							{
								entityType: "registration",
								label: "Registration",
							},
						]}
					/>
				</div>
			</main>
		</div>
	);
}
