import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { getAvailableEquipments } from "@/services/equipment";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Header } from "@/components/user/header";
import { requireUser } from "@/lib/auth";
import { Action } from "@/components/general/action";
import { Separator } from "@/components/ui/separator";

export const availableEquipmentsQueryOptions = queryOptions({
	queryKey: ["availableEquipments"],
	queryFn: () => getAvailableEquipments(),
});

export const Route = createFileRoute("/book/")({
	component: BookPage,
	loader: async ({ context }) => {
		const user = await requireUser();
		await context.queryClient.ensureQueryData(
			availableEquipmentsQueryOptions,
		);
		return { user };
	},
});

function BookPage() {
	const { user } = Route.useLoaderData();
	const equipmentsQuery = useSuspenseQuery(availableEquipmentsQueryOptions);
	const equipments = equipmentsQuery.data;

	return (
		<div className="min-h-screen flex flex-col bg-slate-50/50">
			<Header user={user} backTo="/" />

			<main className="flex-1 p-4 md:p-6 lg:p-8">
				<div className="w-full space-y-8">
					<div className="space-y-2">
						<h2 className="text-3xl font-bold tracking-tight text-slate-900">
							Book Equipment
						</h2>
						<p className="text-slate-500 text-lg">
							Select an equipment to proceed with booking.
						</p>
					</div>

					<Separator className="bg-slate-200" />

					<div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
						{equipments.map((equipment) => (
							<Card
								key={equipment.id}
								className="shadow-sm border-slate-200"
							>
								<CardHeader className="flex flex-row items-center gap-4 space-y-0">
									<div>
										<CardTitle className="text-lg text-slate-900">
											{equipment.name}
										</CardTitle>
										<CardDescription>
											Code: {equipment.code}
										</CardDescription>
									</div>
								</CardHeader>
								<CardContent className="p-4">
									<Action
										to="/book/$eqId"
										params={{
											eqId: equipment.id.toString(),
										}}
										label="Book Now"
									/>
								</CardContent>
							</Card>
						))}
					</div>

					{equipments.length === 0 && (
						<div className="text-center py-12 text-slate-500">
							No active equipments available at the moment.
						</div>
					)}
				</div>
			</main>
		</div>
	);
}
