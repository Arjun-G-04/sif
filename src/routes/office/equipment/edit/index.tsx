import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { EquipmentDialog } from "@/components/office/equipmentDialog";
import { EquipmentsView } from "@/components/office/equipmentsView";
import { Header } from "@/components/office/header";
import { requireAdmin } from "@/lib/auth";
import { getEquipments } from "@/services/equipment";

export const equipmentsQueryOptions = queryOptions({
	queryKey: ["equipments"],
	queryFn: () => getEquipments(),
});

export const Route = createFileRoute("/office/equipment/edit/")({
	component: EquipmentEditPage,
	loader: async ({ context }) => {
		const user = await requireAdmin();
		await context.queryClient.ensureQueryData(equipmentsQueryOptions);
		return user;
	},
});

function EquipmentEditPage() {
	const user = Route.useLoaderData();
	const equipments = useSuspenseQuery(equipmentsQueryOptions);

	return (
		<div className="min-h-screen flex flex-col bg-slate-50/50">
			<Header user={user} backTo="/office" />
			<main className="flex-1 p-4 md:p-6 lg:p-8">
				<div className="w-full space-y-6">
					<div className="flex justify-between items-center">
						<div>
							<h2 className="text-2xl font-bold tracking-tight text-slate-900">
								Equipments
							</h2>
							<p className="text-slate-500">
								Manage equipment entries.
							</p>
						</div>
						<EquipmentDialog />
					</div>
					<EquipmentsView equipments={equipments.data} />
				</div>
			</main>
		</div>
	);
}
