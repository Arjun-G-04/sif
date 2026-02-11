import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Eye } from "lucide-react";
import { Header } from "@/components/office/header";
import { Button } from "@/components/ui/button";
import { type Column, DataTable } from "@/components/general/DataTable";

import { requireAdmin } from "@/lib/auth";
import { getRegistrations } from "@/services/registration";

export const registrationsQueryOptions = queryOptions({
	queryKey: ["registrations"],
	queryFn: () => getRegistrations(),
});

export const Route = createFileRoute("/office/registration/view/")({
	component: RegistrationViewPage,
	loader: async ({ context }) => {
		const user = await requireAdmin();
		await context.queryClient.ensureQueryData(registrationsQueryOptions);
		return user;
	},
});

function RegistrationViewPage() {
	const user = Route.useLoaderData();
	const registrations = useSuspenseQuery(registrationsQueryOptions);
	const navigate = useNavigate();

	const columns: Column<(typeof registrations.data)[0]>[] = [
		{
			header: "Registration No.",
			accessorKey: "id",
			className: "font-semibold",
		},
		{
			header: "Email",
			accessorKey: "email",
			className: "font-semibold",
		},
		{
			header: "Phone",
			accessorKey: "phone",
			className: "font-semibold",
		},
		{
			header: "Status",
			accessorKey: "accepted",
			className: "font-semibold",
			cell: (reg) => (
				<>
					{reg.accepted === true && (
						<span className="inline-flex items-center rounded-md bg-green-50 px-2 py-1 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-600/20">
							Accepted
						</span>
					)}
					{reg.accepted === false && (
						<span className="inline-flex items-center rounded-md bg-red-50 px-2 py-1 text-xs font-medium text-red-700 ring-1 ring-inset ring-red-600/20">
							Rejected
						</span>
					)}
					{reg.accepted === null && (
						<span className="inline-flex items-center rounded-md bg-slate-50 px-2 py-1 text-xs font-medium text-slate-600 ring-1 ring-inset ring-slate-500/10">
							Pending
						</span>
					)}
				</>
			),
		},
		{
			header: "Actions",
			className: "font-semibold",
			cell: () => (
				<Button variant="ghost" size="sm" className="h-8 w-8 p-0">
					<Eye className="h-4 w-4 text-slate-500" />
				</Button>
			),
		},
	];

	return (
		<div className="min-h-screen flex flex-col bg-slate-50/50">
			<Header user={user} backTo="/office" />
			<main className="flex-1 p-4 md:p-6 lg:p-8">
				<div className="w-full space-y-6">
					<div>
						<h2 className="text-2xl font-bold tracking-tight text-slate-900">
							User Registrations
						</h2>
						<p className="text-slate-500">
							View and manage submitted user registrations.
						</p>
					</div>

					<DataTable
						data={registrations.data}
						columns={columns}
						keyExtractor={(item) => item.id}
						onRowClick={(reg) =>
							navigate({
								to: "/office/registration/view/$regId",
								params: {
									regId: String(reg.id),
								},
							})
						}
					/>
				</div>
			</main>
		</div>
	);
}
