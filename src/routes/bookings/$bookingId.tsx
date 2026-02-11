import {
	useMutation,
	useQuery,
	useQueryClient,
	queryOptions,
	useSuspenseQuery,
} from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { AlertCircle, Info } from "lucide-react";
import { toast } from "sonner";
import { FieldsForm } from "@/components/general/fieldsForm";
import { FileViewer } from "@/components/general/fieldResponses";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { requireUser } from "@/lib/auth";
import { getUserBooking, submitBookingPaymentInfo } from "@/services/booking";
import { getFields } from "@/services/field";
import { Header } from "@/components/user/header";
import { Separator } from "@/components/ui/separator";

export const userBookingQueryOptions = (bookingId: number) =>
	queryOptions({
		queryKey: ["user-booking", bookingId],
		queryFn: () => getUserBooking({ data: { bookingId } }),
	});

export const Route = createFileRoute("/bookings/$bookingId")({
	component: UserBookingDetailPage,
	loader: async ({ context, params }) => {
		const user = await requireUser();
		const bookingId = Number(params.bookingId);
		await context.queryClient.ensureQueryData(
			userBookingQueryOptions(bookingId),
		);
		return { user };
	},
});

function UserBookingDetailPage() {
	const { user } = Route.useLoaderData();
	const { bookingId: bookingIdStr } = Route.useParams();
	const bookingId = Number(bookingIdStr);
	const booking = useSuspenseQuery(userBookingQueryOptions(bookingId));
	const data = booking.data;
	const queryClient = useQueryClient();

	const { data: paymentFields } = useQuery({
		queryKey: ["fields", "equipment", data.equipmentId, "payment"],
		queryFn: () =>
			getFields({
				data: {
					entityType: "equipment",
					entityId: data.equipmentId,
					stage: "payment",
				},
			}),
		enabled:
			data.status === "payment" || data.status === "payment_verification",
	});

	const paymentMutation = useMutation({
		mutationFn: submitBookingPaymentInfo,
		onSuccess: () => {
			queryClient.invalidateQueries({
				queryKey: ["user-booking", bookingId],
			});
			toast.success("Additional information submitted successfully");
		},
		onError: (error) => {
			toast.error(error.message || "Failed to submit information");
		},
	});

	const handlePaymentSubmit = async (formData: FormData) => {
		formData.append("bookingId", String(bookingId));
		paymentMutation.mutate({ data: formData });
	};

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

	const filteredPaymentFields = paymentFields?.filter((field) => {
		return !data.responses.some((resp) => resp.fieldId === field.id);
	});

	const sortedResponses = [...data.responses].sort((a, b) => {
		const aEffectiveParentOrder = a.parentOrder ?? a.order;
		const bEffectiveParentOrder = b.parentOrder ?? b.order;

		if (aEffectiveParentOrder !== bEffectiveParentOrder)
			return aEffectiveParentOrder - bEffectiveParentOrder;

		if (a.parentId !== b.parentId) {
			if (a.parentId === null) return -1;
			if (b.parentId === null) return 1;
		}

		if (a.iteration !== b.iteration) return a.iteration - b.iteration;
		return a.order - b.order;
	});

	const initialResponses = sortedResponses.filter(
		(r) => r.stage !== "payment",
	);
	const paymentResponses = sortedResponses.filter(
		(r) => r.stage === "payment",
	);

	return (
		<div className="min-h-screen bg-slate-50/50 flex flex-col pb-12">
			<Header user={user} backTo="/bookings" />

			<main className="flex-1 p-4 md:p-6 lg:p-8">
				<div className="w-full space-y-8">
					<div className="space-y-2">
						<h1 className="text-3xl font-bold tracking-tight text-slate-900">
							Booking Details
						</h1>
						<p className="text-slate-500 text-lg">
							Viewing details for booking #{data.id}
						</p>
					</div>

					<Separator className="bg-slate-200" />

					{(data.status === "payment" ||
						data.status === "payment_verification" ||
						data.status === "processing" ||
						data.status === "completed") && (
						<div className="p-6 md:p-8 bg-blue-50/50 border border-blue-100 rounded-xl grid grid-cols-1 md:grid-cols-2 gap-8">
							<div className="space-y-2">
								<h3 className="text-sm font-semibold text-blue-900 uppercase tracking-wider">
									Final Price
								</h3>
								<p className="text-3xl font-bold text-blue-900">
									₹{data.price}
								</p>
							</div>
							<div className="space-y-2">
								<h3 className="text-sm font-semibold text-blue-900 uppercase tracking-wider">
									Admin Remarks
								</h3>
								<p className="text-blue-800 text-sm leading-relaxed whitespace-pre-wrap italic">
									"{data.remarks || "No remarks provided."}"
								</p>
							</div>
						</div>
					)}

					{data.status === "rejected" && (
						<div className="bg-red-50 border border-red-200 p-4 rounded-lg flex items-start gap-3">
							<AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
							<div>
								<h3 className="font-semibold text-red-900">
									Booking Rejected
								</h3>
								<p className="text-red-700 text-sm">
									Reason: {data.rejectionReason}
								</p>
							</div>
						</div>
					)}

					<div className="grid grid-cols-1 md:grid-cols-4 gap-6">
						<div className="md:col-span-1 space-y-6">
							<div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm space-y-4 text-sm">
								<h2 className="text-lg font-semibold text-slate-900 border-b pb-2">
									Basic Information
								</h2>
								<DetailItem
									label="Booking No."
									value={`#${data.id}`}
								/>
								<DetailItem
									label="Equipment"
									value={data.equipmentName ?? "-"}
								/>
								<DetailItem
									label="Created At"
									value={formatDate(data.createdAt)}
								/>
								<DetailItem
									label="Status"
									value={
										data.status === "payment"
											? "Payment Required"
											: data.status === "pending"
												? "Under Review"
												: data.status ===
														"payment_verification"
													? "Payment Verification"
													: data.status ===
															"processing"
														? "Processing"
														: data.status ===
																"completed"
															? "Completed"
															: data.status.toUpperCase()
									}
									status={data.status}
								/>
							</div>
						</div>

						<div className="md:col-span-3 space-y-6">
							<div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm space-y-6">
								<h2 className="text-xl font-bold text-slate-900">
									Submitted Information
								</h2>

								<div className="space-y-6">
									<div className="border rounded-xl overflow-hidden">
										<Table>
											<TableHeader>
												<TableRow className="bg-slate-50">
													<TableHead className="w-1/3 font-semibold text-xs uppercase tracking-wider">
														Initial Field
													</TableHead>
													<TableHead className="font-semibold text-xs uppercase tracking-wider">
														Value
													</TableHead>
												</TableRow>
											</TableHeader>
											<TableBody>
												{initialResponses.map(
													(resp) => (
														<TableRow
															key={
																resp.responseId
															}
														>
															<TableCell className="font-medium text-slate-700 py-4">
																<div className="flex flex-col gap-1">
																	<span className="flex items-center gap-1">
																		{
																			resp.fieldName
																		}
																		{(resp.iteration >
																			0 ||
																			resp.parentId !==
																				null) && (
																			<span className="text-xs text-slate-400 font-normal">
																				(#
																				{resp.iteration +
																					1}
																				)
																			</span>
																		)}
																	</span>
																</div>
															</TableCell>
															<TableCell className="py-4">
																<div className="flex items-center gap-3">
																	{resp.adminValue ? (
																		<>
																			<span className="text-slate-400 text-sm line-through decoration-slate-300">
																				{resp.fieldType ===
																				"file"
																					? "File uploaded"
																					: resp.value ||
																						"—"}
																			</span>
																			<span className="text-blue-700 font-semibold bg-blue-50 px-2.5 py-1 rounded text-sm border border-blue-100/50">
																				{
																					resp.adminValue
																				}
																			</span>
																		</>
																	) : (
																		<div className="text-slate-700">
																			{resp.fieldType ===
																			"file" ? (
																				<FileViewer
																					responseId={
																						resp.responseId
																					}
																					name={
																						resp.fieldName
																					}
																					hasFile={
																						!!resp.value
																					}
																				/>
																			) : (
																				resp.value ||
																				"—"
																			)}
																		</div>
																	)}
																</div>
															</TableCell>
														</TableRow>
													),
												)}
											</TableBody>
										</Table>
									</div>

									{paymentResponses.length > 0 && (
										<div className="space-y-4">
											<h3 className="text-sm font-semibold text-blue-900 uppercase tracking-wider flex items-center gap-2">
												<Info className="w-4 h-4" />
												Payment Stage Information
											</h3>
											<div className="border border-blue-100 rounded-xl overflow-hidden bg-blue-50/20">
												<Table>
													<TableHeader>
														<TableRow className="bg-blue-50/50">
															<TableHead className="w-1/3 font-semibold text-xs uppercase tracking-wider text-blue-900">
																Payment Field
															</TableHead>
															<TableHead className="font-semibold text-xs uppercase tracking-wider text-blue-900">
																Value
															</TableHead>
														</TableRow>
													</TableHeader>
													<TableBody>
														{paymentResponses.map(
															(resp) => (
																<TableRow
																	key={
																		resp.responseId
																	}
																	className="border-blue-50"
																>
																	<TableCell className="font-medium text-slate-700 py-4">
																		<div className="flex flex-col gap-1">
																			<span className="flex items-center gap-1">
																				{
																					resp.fieldName
																				}
																				{(resp.iteration >
																					0 ||
																					resp.parentId !==
																						null) && (
																					<span className="text-xs text-slate-400 font-normal">
																						(#
																						{resp.iteration +
																							1}
																						)
																					</span>
																				)}
																			</span>
																		</div>
																	</TableCell>
																	<TableCell className="py-4">
																		<div className="flex items-center gap-3">
																			{resp.adminValue ? (
																				<>
																					<span className="text-slate-400 text-sm line-through decoration-slate-300">
																						{resp.fieldType ===
																						"file"
																							? "File uploaded"
																							: resp.value ||
																								"—"}
																					</span>
																					<span className="text-blue-700 font-semibold bg-blue-50 px-2.5 py-1 rounded text-sm border border-blue-100/50">
																						{
																							resp.adminValue
																						}
																					</span>
																				</>
																			) : (
																				<div className="text-slate-700">
																					{resp.fieldType ===
																					"file" ? (
																						<FileViewer
																							responseId={
																								resp.responseId
																							}
																							name={
																								resp.fieldName
																							}
																							hasFile={
																								!!resp.value
																							}
																						/>
																					) : (
																						resp.value ||
																						"—"
																					)}
																				</div>
																			)}
																		</div>
																	</TableCell>
																</TableRow>
															),
														)}
													</TableBody>
												</Table>
											</div>
										</div>
									)}
								</div>
							</div>

							{data.status === "payment" &&
								filteredPaymentFields &&
								filteredPaymentFields.length > 0 && (
									<div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden p-6 md:p-8 space-y-6">
										<h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
											<Info className="w-5 h-5 text-blue-600" />
											Additional Information Required
										</h2>
										<p className="text-slate-500 text-sm">
											Admin has requested the following
											additional information/files for
											your booking.
										</p>
										<div className="pt-4">
											<FieldsForm
												fields={filteredPaymentFields}
												onSubmit={handlePaymentSubmit}
												isLoading={
													paymentMutation.isPending
												}
												submitText="Submit Additional Info"
											/>
										</div>
									</div>
								)}
						</div>
					</div>
				</div>
			</main>
		</div>
	);
}

function DetailItem({
	label,
	value,
	status,
}: {
	label: string;
	value: string;
	status?: string;
}) {
	return (
		<div className="space-y-1">
			<p className="text-xs font-medium text-slate-500 uppercase tracking-wider">
				{label}
			</p>
			{status ? (
				<div className="pt-1">
					{status === "payment" && (
						<span className="inline-flex items-center rounded-md bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-600/20">
							Payment Required
						</span>
					)}
					{status === "rejected" && (
						<span className="inline-flex items-center rounded-md bg-red-50 px-2.5 py-0.5 text-xs font-medium text-red-700 ring-1 ring-inset ring-red-600/20">
							Rejected
						</span>
					)}
					{status === "pending" && (
						<span className="inline-flex items-center rounded-md bg-slate-50 px-2.5 py-0.5 text-xs font-medium text-slate-600 ring-1 ring-inset ring-slate-500/10">
							Under Review
						</span>
					)}
					{status === "processing" && (
						<span className="inline-flex items-center rounded-md bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-700 ring-1 ring-inset ring-amber-600/20">
							Processing
						</span>
					)}

					{status === "payment_verification" && (
						<span className="inline-flex items-center rounded-md bg-purple-50 px-2.5 py-0.5 text-xs font-medium text-purple-700 ring-1 ring-inset ring-purple-600/20">
							Verifying Payment
						</span>
					)}
					{status === "completed" && (
						<span className="inline-flex items-center rounded-md bg-green-50 px-2.5 py-0.5 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-600/20">
							Completed
						</span>
					)}
				</div>
			) : (
				<p className="text-slate-900 font-semibold">{value}</p>
			)}
		</div>
	);
}
