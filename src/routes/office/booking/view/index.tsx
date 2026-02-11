import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Eye } from "lucide-react";
import { Header } from "@/components/office/header";
import { Button } from "@/components/ui/button";
import { DataTable, type Column } from "@/components/general/DataTable";

import { requireAdmin } from "@/lib/auth";
import { getBookings } from "@/services/booking";

export const bookingsQueryOptions = queryOptions({
	queryKey: ["bookings"],
	queryFn: () => getBookings(),
});

export const Route = createFileRoute("/office/booking/view/")({
	component: BookingViewPage,
	loader: async ({ context }) => {
		const user = await requireAdmin();
		await context.queryClient.ensureQueryData(bookingsQueryOptions);
		return user;
	},
});

function BookingViewPage() {
	const user = Route.useLoaderData();
	const bookings = useSuspenseQuery(bookingsQueryOptions);
	const navigate = useNavigate();

	const formatDate = (date: Date | string | null) => {
		if (!date) return "-";
		const d = new Date(date);
		return d.toLocaleDateString("en-US", {
			year: "numeric",
			month: "short",
			day: "numeric",
			hour: "2-digit",
			minute: "2-digit",
		});
	};

	const columns: Column<(typeof bookings.data)[0]>[] = [
		{
			header: "Booking No.",
			accessorKey: "id",
			className: "font-semibold",
		},
		{
			header: "User",
			accessorKey: "userEmail",
			cell: (booking) => booking.userEmail ?? "-",
		},
		{
			header: "Equipment",
			accessorKey: "equipmentName",
			cell: (booking) => booking.equipmentName ?? "-",
		},
		{
			header: "Status",
			accessorKey: "status",
			cell: (booking) => (
				<>
					{booking.status === "payment" && (
						<span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-600/20">
							Payment
						</span>
					)}
					{booking.status === "rejected" && (
						<span className="inline-flex items-center rounded-md bg-red-50 px-2 py-1 text-xs font-medium text-red-700 ring-1 ring-inset ring-red-600/20">
							Rejected
						</span>
					)}
					{booking.status === "pending" && (
						<span className="inline-flex items-center rounded-md bg-slate-50 px-2 py-1 text-xs font-medium text-slate-600 ring-1 ring-inset ring-slate-500/10">
							Pending
						</span>
					)}
					{booking.status === "processing" && (
						<span className="inline-flex items-center rounded-md bg-amber-50 px-2 py-1 text-xs font-medium text-amber-700 ring-1 ring-inset ring-amber-600/20">
							Processing
						</span>
					)}
					{booking.status === "payment_verification" && (
						<span className="inline-flex items-center rounded-md bg-purple-50 px-2 py-1 text-xs font-medium text-purple-700 ring-1 ring-inset ring-purple-600/20">
							Verifying Payment
						</span>
					)}
					{booking.status === "completed" && (
						<span className="inline-flex items-center rounded-md bg-green-50 px-2 py-1 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-600/20">
							Completed
						</span>
					)}
				</>
			),
		},
		{
			header: "Created At",
			accessorKey: "createdAt",
			cell: (booking) => formatDate(booking.createdAt),
		},
		{
			header: "Actions",
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
							All Booking Requests
						</h2>
						<p className="text-slate-500">
							Manage and view all equipment booking requests.
						</p>
					</div>

					<DataTable
						data={bookings.data}
						columns={columns}
						keyExtractor={(item) => item.id}
						onRowClick={(booking) =>
							navigate({
								to: "/office/booking/view/$bookingId",
								params: {
									bookingId: String(booking.id),
								},
							})
						}
					/>
				</div>
			</main>
		</div>
	);
}
