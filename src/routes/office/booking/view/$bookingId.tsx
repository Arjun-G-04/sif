import {
	useMutation,
	useQueryClient,
	queryOptions,
	useSuspenseQuery,
} from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Check, X, AlertCircle } from "lucide-react";
import { useState, useId } from "react";
import { toast } from "sonner";
import { BookingFieldsEditor } from "@/components/office/bookingFieldsEditor";
import { Header } from "@/components/office/header";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { requireAdmin } from "@/lib/auth";
import { acceptBooking, getBooking, rejectBooking } from "@/services/booking";

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
	const queryClient = useQueryClient();

	const [isAcceptDialogOpen, setIsAcceptDialogOpen] = useState(false);
	const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false);
	const [price, setPrice] = useState(data.price?.toString() || "");
	const [remarks, setRemarks] = useState(data.remarks || "");
	const [rejectionReason, setRejectionReason] = useState("");

	const priceId = useId();
	const remarksId = useId();
	const reasonId = useId();

	const acceptMutation = useMutation({
		mutationFn: acceptBooking,
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["booking", bookingId] });
			queryClient.invalidateQueries({ queryKey: ["bookings"] });
			toast.success("Booking accepted successfully");
			setIsAcceptDialogOpen(false);
		},
		onError: (error) => {
			toast.error(error.message || "Failed to accept booking");
		},
	});

	const rejectMutation = useMutation({
		mutationFn: rejectBooking,
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["booking", bookingId] });
			queryClient.invalidateQueries({ queryKey: ["bookings"] });
			toast.success("Booking rejected successfully");
			setIsRejectDialogOpen(false);
		},
		onError: (error) => {
			toast.error(error.message || "Failed to reject booking");
		},
	});

	const handleAccept = () => {
		if (!price || Number.isNaN(Number(price))) {
			toast.error("Please enter a valid price");
			return;
		}
		acceptMutation.mutate({
			data: {
				bookingId,
				price: Number(price),
				remarks,
			},
		});
	};

	const handleReject = () => {
		if (!rejectionReason.trim()) {
			toast.error("Please enter a rejection reason");
			return;
		}
		rejectMutation.mutate({
			data: {
				bookingId,
				reason: rejectionReason,
			},
		});
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

	return (
		<div className="min-h-screen flex flex-col bg-slate-50/50">
			<Header user={user} backTo="/office/booking/view" />
			<main className="flex-1 p-4 md:p-6 lg:p-8">
				<div className="w-full space-y-6">
					<div className="flex justify-between items-center">
						<div>
							<h2 className="text-2xl font-bold tracking-tight text-slate-900">
								Booking Details
							</h2>
							<p className="text-slate-500">
								Viewing details for booking #{data.id}
							</p>
						</div>
						<div className="flex gap-3">
							{data.status === "pending" && (
								<>
									<Button
										variant="destructive"
										className="bg-red-600 hover:bg-red-700"
										onClick={() =>
											setIsRejectDialogOpen(true)
										}
									>
										<X className="w-4 h-4" />
										Reject
									</Button>
									<Button
										className="bg-green-600 hover:bg-green-700"
										onClick={() =>
											setIsAcceptDialogOpen(true)
										}
									>
										<Check className="w-4 h-4" />
										Accept & Set Price
									</Button>
								</>
							)}
						</div>
					</div>

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
								<DetailItem
									label="Status"
									value={data.status.toUpperCase()}
								/>
								{(data.status === "payment" ||
									data.status === "processing") && (
									<>
										<DetailItem
											label="Price"
											value={`₹${data.price}`}
										/>
										<DetailItem
											label="Remarks"
											value={data.remarks || "-"}
										/>
									</>
								)}
							</div>
						</div>

						<div className="md:col-span-3">
							<div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm">
								<BookingFieldsEditor
									bookingId={data.id}
									responses={data.responses}
								/>
							</div>
						</div>
					</div>
				</div>
			</main>

			{/* Accept Dialog */}
			<Dialog
				open={isAcceptDialogOpen}
				onOpenChange={setIsAcceptDialogOpen}
			>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Accept Booking</DialogTitle>
						<DialogDescription>
							Set the final price and any additional remarks for
							the user.
						</DialogDescription>
					</DialogHeader>
					<div className="space-y-4 py-4 text-sm">
						<div className="space-y-2 text-sm">
							<Label htmlFor={priceId}>Price (₹)</Label>
							<Input
								id={priceId}
								type="number"
								placeholder="Enter amount"
								value={price}
								onChange={(e) => setPrice(e.target.value)}
							/>
						</div>
						<div className="space-y-2 text-sm">
							<Label htmlFor={remarksId}>Remarks for User</Label>
							<Textarea
								id={remarksId}
								placeholder="Add any instructions or notes..."
								value={remarks}
								onChange={(e) => setRemarks(e.target.value)}
							/>
						</div>
					</div>
					<DialogFooter>
						<Button
							variant="outline"
							onClick={() => setIsAcceptDialogOpen(false)}
						>
							Cancel
						</Button>
						<Button
							className="bg-green-600 hover:bg-green-700"
							onClick={handleAccept}
							disabled={acceptMutation.isPending}
						>
							{acceptMutation.isPending
								? "Accepting..."
								: "Confirm & Accept"}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			{/* Reject Dialog */}
			<Dialog
				open={isRejectDialogOpen}
				onOpenChange={setIsRejectDialogOpen}
			>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Reject Booking</DialogTitle>
						<DialogDescription>
							Please provide a reason for rejecting this booking.
						</DialogDescription>
					</DialogHeader>
					<div className="py-4 space-y-2 text-sm">
						<Label htmlFor={reasonId}>Rejection Reason</Label>
						<Textarea
							id={reasonId}
							placeholder="Enter reason..."
							value={rejectionReason}
							onChange={(e) => setRejectionReason(e.target.value)}
						/>
					</div>
					<DialogFooter>
						<Button
							variant="outline"
							onClick={() => setIsRejectDialogOpen(false)}
						>
							Cancel
						</Button>
						<Button
							variant="destructive"
							onClick={handleReject}
							disabled={rejectMutation.isPending}
						>
							{rejectMutation.isPending
								? "Rejecting..."
								: "Confirm Reject"}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
}

function DetailItem({ label, value }: { label: string; value: string }) {
	return (
		<div className="space-y-1">
			<p className="text-xs font-medium text-slate-500 uppercase tracking-wider">
				{label}
			</p>
			<p className="text-slate-900 font-semibold">{value}</p>
		</div>
	);
}
