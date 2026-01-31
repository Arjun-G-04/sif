import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { requireUser } from "@/lib/auth";
import { getUserBookings } from "@/services/booking";
import { Header } from "@/components/user/header";
import { Separator } from "@/components/ui/separator";

export const userBookingsQueryOptions = queryOptions({
	queryKey: ["user-bookings"],
	queryFn: () => getUserBookings(),
});

export const Route = createFileRoute("/bookings/")({
	component: UserBookingsPage,
	loader: async ({ context }) => {
		const user = await requireUser();
		await context.queryClient.ensureQueryData(userBookingsQueryOptions);
		return { user };
	},
});

function UserBookingsPage() {
	const { user } = Route.useLoaderData();
	const bookings = useSuspenseQuery(userBookingsQueryOptions);
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
			<Header user={user} backTo="/" />

			<main className="flex-1 p-4 md:p-6 lg:p-8">
				<div className="w-full space-y-8">
					<div className="space-y-2">
						<h1 className="text-3xl font-bold tracking-tight text-slate-900">
							My Bookings
						</h1>
						<p className="text-slate-500 text-lg">
							Track the status of your equipment bookings.
						</p>
					</div>

					<Separator className="bg-slate-200" />

					<div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
						<Table>
							<TableHeader>
								<TableRow className="bg-slate-50">
									<TableHead className="font-semibold">
										Booking No.
									</TableHead>
									<TableHead className="font-semibold">
										Equipment
									</TableHead>
									<TableHead className="font-semibold">
										Status
									</TableHead>
									<TableHead className="font-semibold">
										Date
									</TableHead>
									<TableHead className="font-semibold text-right">
										Action
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
											You haven't made any bookings yet.
										</TableCell>
									</TableRow>
								) : (
									bookings.data.map((booking) => (
										<TableRow
											key={booking.id}
											className="cursor-pointer hover:bg-slate-50/80 transition-colors"
											onClick={() =>
												navigate({
													to: "/bookings/$bookingId",
													params: {
														bookingId: String(
															booking.id,
														),
													},
												})
											}
										>
											<TableCell className="font-medium">
												#{booking.id}
											</TableCell>
											<TableCell>
												{booking.equipmentName}
											</TableCell>
											<TableCell>
												{booking.status ===
													"payment" && (
													<span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-600/20">
														Payment Required
													</span>
												)}
												{booking.status ===
													"rejected" && (
													<span className="inline-flex items-center rounded-md bg-red-50 px-2 py-1 text-xs font-medium text-red-700 ring-1 ring-inset ring-red-600/20">
														Rejected
													</span>
												)}
												{booking.status ===
													"pending" && (
													<span className="inline-flex items-center rounded-md bg-slate-50 px-2 py-1 text-xs font-medium text-slate-600 ring-1 ring-inset ring-slate-500/10">
														Under Review
													</span>
												)}
												{booking.status ===
													"processing" && (
													<span className="inline-flex items-center rounded-md bg-amber-50 px-2 py-1 text-xs font-medium text-amber-700 ring-1 ring-inset ring-amber-600/20">
														Processing
													</span>
												)}
											</TableCell>
											<TableCell className="text-slate-500">
												{formatDate(booking.createdAt)}
											</TableCell>
											<TableCell className="text-right">
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
