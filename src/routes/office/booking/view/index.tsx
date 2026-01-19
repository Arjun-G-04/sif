import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Eye } from "lucide-react";
import { Header } from "@/components/office/header";
import { Button } from "@/components/ui/button";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
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

	return (
		<div className="min-h-screen flex flex-col bg-slate-50/50">
			<Header user={user} backTo="/office" />
			<main className="flex-1 p-4 md:p-6 lg:p-8">
				<div className="w-full space-y-6">
					<div>
						<h2 className="text-2xl font-bold tracking-tight text-slate-900">
							Bookings
						</h2>
						<p className="text-slate-500">
							View and manage equipment bookings.
						</p>
					</div>

					<div className="bg-white rounded-lg border border-slate-200 overflow-hidden shadow-sm">
						<Table>
							<TableHeader>
								<TableRow className="bg-slate-50">
									<TableHead className="font-semibold">
										Booking No.
									</TableHead>
									<TableHead className="font-semibold">
										User
									</TableHead>
									<TableHead className="font-semibold">
										Equipment
									</TableHead>
									<TableHead className="font-semibold">
										Created At
									</TableHead>
									<TableHead className="font-semibold">
										Actions
									</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{bookings.data.length === 0 ? (
									<TableRow>
										<TableCell
											colSpan={5}
											className="h-32 text-center text-slate-500"
										>
											No bookings found.
										</TableCell>
									</TableRow>
								) : (
									bookings.data.map((booking) => (
										<TableRow
											key={booking.id}
											className="cursor-pointer hover:bg-slate-50/80 transition-colors"
											onClick={() =>
												navigate({
													to: "/office/booking/view/$bookingId",
													params: {
														bookingId: String(
															booking.id,
														),
													},
												})
											}
										>
											<TableCell>{booking.id}</TableCell>
											<TableCell>
												{booking.userEmail ?? "-"}
											</TableCell>
											<TableCell>
												{booking.equipmentName ?? "-"}
											</TableCell>
											<TableCell>
												{formatDate(booking.createdAt)}
											</TableCell>
											<TableCell>
												<Button
													variant="ghost"
													size="sm"
													className="h-8 w-8 p-0"
												>
													<Eye className="h-4 w-4 text-slate-500" />
												</Button>
											</TableCell>
										</TableRow>
									))
								)}
							</TableBody>
						</Table>
					</div>
				</div>
			</main>
		</div>
	);
}
