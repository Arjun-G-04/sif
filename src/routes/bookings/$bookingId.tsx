import {
	useMutation,
	useQuery,
	useQueryClient,
	queryOptions,
	useSuspenseQuery,
} from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { AlertCircle, Info, Mail, MapPin, Phone } from "lucide-react";
import { toast } from "sonner";
import { FieldsForm } from "@/components/general/fieldsForm";
import { ResponseValueDisplay } from "@/components/general/fieldResponses";
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
import { getEquipmentFields } from "@/services/equipment";
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
		queryKey: ["equipment", "fields", data.equipmentId, "payment"],
		queryFn: () =>
			getEquipmentFields({
				data: {
					equipmentId: data.equipmentId,
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
	const gstAmount = data.gst ?? 0;
	const priceAmount = data.price ?? 0;
	const totalAmount = Number((priceAmount + gstAmount).toFixed(2));

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
						data.status === "payment_rejected" ||
						data.status === "processing" ||
						data.status === "completed") && (
						<div className="p-6 md:p-8 bg-blue-50/50 border border-blue-100 rounded-xl grid grid-cols-1 md:grid-cols-2 gap-8">
							<div className="space-y-2">
								<h3 className="text-sm font-semibold text-blue-900 uppercase tracking-wider">
									Total Charges (Testing Fee + GST)
								</h3>
								<div className="space-y-1 text-blue-900">
									<p className="text-3xl font-bold">
										₹{priceAmount} + ₹{gstAmount} = ₹
										{totalAmount}
									</p>
								</div>
							</div>
							<div className="space-y-2">
								<h3 className="text-sm font-semibold text-blue-900 uppercase tracking-wider">
									Admin Remarks
								</h3>
								<p className="text-blue-800 text-sm leading-relaxed whitespace-pre-wrap italic">
									{data.remarks || "No remarks provided."}
								</p>
							</div>
						</div>
					)}

					{data.status === "payment_verification" && (
						<div className="bg-purple-50/50 border border-purple-100 rounded-xl p-6 md:p-8 space-y-6">
							<div className="flex items-start gap-3">
								<Info className="w-5 h-5 text-purple-700 mt-0.5 animate-pulse" />
								<div className="space-y-4">
									<div>
										<h3 className="text-lg font-bold text-purple-900">
											Next Step: Submit or Dispatch
											Samples
										</h3>
										<p className="text-purple-800 text-sm leading-relaxed mt-1">
											Please submit or dispatch your
											samples to the address below for
											analysis:
										</p>
									</div>

									<div className="bg-white border border-purple-100 rounded-lg p-5 text-slate-800 text-sm font-medium space-y-2 max-w-lg shadow-sm">
										<p className="font-bold text-purple-950 flex items-center gap-2">
											<MapPin className="w-4 h-4 text-purple-700 shrink-0" />
											Sophisticated Instrumentation
											Facility (SIF)
										</p>
										<div className="pl-6 space-y-1 text-slate-700 font-normal">
											<p>CEDI Building (Left Wing)</p>
											<p>Opposite to Central Library</p>
											<p>
												National Institute of Technology
												Tiruchirappalli
											</p>
											<p>Tiruchirappalli – 620 015</p>
											<p>Tamil Nadu, India</p>
										</div>
										<div className="pt-2 pl-6 border-t border-purple-100/50 flex flex-col gap-1.5 text-xs text-slate-500 font-normal">
											<p className="flex items-center gap-1.5">
												<Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
												Email:{" "}
												<a
													href="mailto:sif@nitt.edu"
													className="text-purple-700 hover:underline"
												>
													sif@nitt.edu
												</a>
											</p>
											<p className="flex items-center gap-1.5">
												<Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
												Phone: +91 94893 94853
											</p>
										</div>
									</div>

									<p className="text-purple-800 text-sm font-semibold">
										Once your samples are received at SIF,
										the testing process will be initiated.
										You will be notified upon completion of
										the test!
									</p>
								</div>
							</div>
						</div>
					)}

					{data.status === "payment" && (
						<div className="bg-blue-50/50 border border-blue-100 rounded-xl p-6 md:p-8 space-y-6">
							<div className="flex items-start gap-3">
								<Info className="w-5 h-5 text-blue-700 mt-0.5 animate-pulse" />
								<div className="space-y-4">
									<div>
										<h3 className="text-lg font-bold text-blue-900">
											Payment Procedure – SBI Collect
										</h3>
										<p className="text-blue-800 text-sm leading-relaxed mt-1">
											Please follow the steps below to
											make the payment:
										</p>
									</div>

									<div className="bg-white border border-blue-100 rounded-lg p-5 text-slate-800 text-sm font-medium space-y-3 shadow-sm">
										<ol className="space-y-2 list-decimal list-inside text-slate-700 font-normal">
											<li>
												Go to{" "}
												<a
													href="https://www.onlinesbi.sbi/sbicollect/"
													target="_blank"
													rel="noopener noreferrer"
													className="text-blue-700 hover:underline font-medium"
												>
													SBI Collect webpage
												</a>
											</li>
											<li>
												Select the &lsquo;Educational
												Institution&rsquo; category
											</li>
											<li>
												Search for &lsquo;Conference and
												Workshop NIT Trichy&rsquo; and
												select the same.
											</li>
											<li>
												In the payment category, select
												&lsquo;SIF&rsquo;
											</li>
											<li>
												Fill in the required areas and
												make the payment
											</li>
											<li>
												Save the payment receipt and
												submit it with exact details in
												the form below
											</li>
											<li>
												Submit the printed copy of the
												payment receipt and the
												requisition form.
											</li>
										</ol>
									</div>

									<div className="bg-red-50 border border-red-200 rounded-lg p-4">
										<div>
											<h4 className="text-xs font-bold text-red-800 uppercase tracking-wider">
												Important Note
											</h4>
											<p className="text-red-700 text-sm mt-0.5 leading-relaxed">
												Do not make any payment without
												prior confirmation from the SIF
												Office. Payments made without
												approval are non-refundable.
											</p>
										</div>
									</div>
								</div>
							</div>
						</div>
					)}

					{(data.status === "rejected" ||
						data.status === "payment_rejected") && (
						<div className="bg-red-50 border border-red-200 p-4 rounded-lg flex items-start gap-3">
							<AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
							<div>
								<h3 className="font-semibold text-red-900">
									{data.status === "payment_rejected"
										? "Payment Rejected"
										: "Booking Rejected"}
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
															"payment_rejected"
														? "Payment Rejected"
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
									<div className="border rounded-xl overflow-hidden shadow-xs">
										<Table className="table-fixed w-full">
											<TableHeader>
												<TableRow className="bg-slate-50/80">
													<TableHead className="w-[30%] font-semibold text-xs uppercase tracking-wider text-slate-800">
														Initial Field
													</TableHead>
													<TableHead className="w-[70%] font-semibold text-xs uppercase tracking-wider text-slate-800">
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
															className="hover:bg-slate-50/40 align-top"
														>
															<TableCell className="font-medium text-slate-700 py-3.5 px-4 align-top max-w-0 break-words">
																<div className="flex flex-col gap-1">
																	<span className="font-medium text-slate-800 leading-snug">
																		{
																			resp.fieldName
																		}
																		{(resp.iteration >
																			0 ||
																			resp.parentId !==
																				null) && (
																			<span className="ml-1.5 text-xs text-slate-400 font-normal">
																				(#
																				{resp.iteration +
																					1}
																				)
																			</span>
																		)}
																	</span>
																</div>
															</TableCell>
															<TableCell className="py-3.5 px-4 align-top max-w-0">
																<ResponseValueDisplay
																	value={
																		resp.value
																	}
																	fieldType={
																		resp.fieldType
																	}
																	responseId={
																		resp.responseId
																	}
																	fieldName={
																		resp.fieldName
																	}
																	adminValue={
																		resp.adminValue
																	}
																/>
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
											<div className="border border-blue-100 rounded-xl overflow-hidden bg-blue-50/20 shadow-xs">
												<Table className="table-fixed w-full">
													<TableHeader>
														<TableRow className="bg-blue-50/50">
															<TableHead className="w-[30%] font-semibold text-xs uppercase tracking-wider text-blue-900">
																Payment Field
															</TableHead>
															<TableHead className="w-[70%] font-semibold text-xs uppercase tracking-wider text-blue-900">
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
																	className="border-blue-50/70 hover:bg-blue-50/40 align-top"
																>
																	<TableCell className="font-medium text-slate-700 py-3.5 px-4 align-top max-w-0 break-words">
																		<div className="flex flex-col gap-1">
																			<span className="font-medium text-slate-800 leading-snug">
																				{
																					resp.fieldName
																				}
																				{(resp.iteration >
																					0 ||
																					resp.parentId !==
																						null) && (
																					<span className="ml-1.5 text-xs text-slate-400 font-normal">
																						(#
																						{resp.iteration +
																							1}
																						)
																					</span>
																				)}
																			</span>
																		</div>
																	</TableCell>
																	<TableCell className="py-3.5 px-4 align-top max-w-0">
																		<ResponseValueDisplay
																			value={
																				resp.value
																			}
																			fieldType={
																				resp.fieldType
																			}
																			responseId={
																				resp.responseId
																			}
																			fieldName={
																				resp.fieldName
																			}
																			adminValue={
																				resp.adminValue
																			}
																		/>
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
					{status === "payment_rejected" && (
						<span className="inline-flex items-center rounded-md bg-red-50 px-2.5 py-0.5 text-xs font-medium text-red-700 ring-1 ring-inset ring-red-600/20">
							Payment Rejected
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
