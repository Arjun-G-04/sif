import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { FieldResponsesDisplay } from "@/components/general/fieldResponses";
import { Header } from "@/components/office/header";
import { requireAdmin } from "@/lib/auth";
import { getBooking } from "@/services/booking";

export const bookingQueryOptions = (bookingId: number) =>
	queryOptions({
		queryKey: ["booking", bookingId],
		queryFn: () => getBooking({ data: { bookingId } }),
	});

export const Route = createFileRoute("/office/booking/view/$bookingId")({
	component: BookingDetailPage,
	loader: async ({ context, params }) => {
		const user = await requireAdmin();
		const bookingId = Number(params.bookingId);
		if (Number.isNaN(bookingId)) {
			throw new Error("Invalid booking ID");
		}
		await context.queryClient.ensureQueryData(
			bookingQueryOptions(bookingId),
		);
		return user;
	},
});

function BookingDetailPage() {
	const user = Route.useLoaderData();
	const { bookingId: bookingIdStr } = Route.useParams();
	const bookingId = Number(bookingIdStr);
	const booking = useSuspenseQuery(bookingQueryOptions(bookingId));
	const data = booking.data;

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
			<Header user={user} backTo="/office/booking/view" />
			<main className="flex-1 p-4 md:p-6 lg:p-8">
				<div className="w-full space-y-6">
					<div>
						<h2 className="text-2xl font-bold tracking-tight text-slate-900">
							Booking Details
						</h2>
						<p className="text-slate-500">
							Viewing details for booking #{data.id}
						</p>
					</div>

					<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
						<div className="md:col-span-1 space-y-6">
							<div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm space-y-4">
								<h2 className="text-lg font-semibold text-slate-900 border-bottom pb-2">
									Basic Information
								</h2>
								<DetailItem
									label="Booking No."
									value={data.id.toString()}
								/>
								<DetailItem
									label="User"
									value={data.userEmail ?? "-"}
								/>
								<DetailItem
									label="Equipment"
									value={data.equipmentName ?? "-"}
								/>
								<DetailItem
									label="Created At"
									value={formatDate(data.createdAt)}
								/>
							</div>
						</div>

						<div className="md:col-span-2">
							<div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm space-y-4">
								<h2 className="text-lg font-semibold text-slate-900 border-bottom pb-2">
									Field Responses
								</h2>
								<FieldResponsesDisplay
									responses={data.responses}
									emptyMessage="No dynamic field responses."
								/>
							</div>
						</div>
					</div>
				</div>
			</main>
		</div>
	);
}

function DetailItem({ label, value }: { label: string; value: string }) {
	return (
		<div className="space-y-1">
			<p className="text-sm font-medium text-slate-500">{label}</p>
			<p className="text-slate-900 font-semibold">{value}</p>
		</div>
	);
}
