import {
	queryOptions,
	useMutation,
	useQueryClient,
	useSuspenseQuery,
} from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Ban, Check, X } from "lucide-react";
import { useId, useState } from "react";
import { toast } from "sonner";
import { FieldResponsesDisplay } from "@/components/general/fieldResponses";
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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { requireAdmin } from "@/lib/auth";
import {
	acceptRegistration,
	getRegistration,
	rejectRegistration,
} from "@/services/registration";

export const registrationQueryOptions = (regId: number) =>
	queryOptions({
		queryKey: ["registration", regId],
		queryFn: () => getRegistration({ data: { regId } }),
	});

export const Route = createFileRoute("/office/registration/view/$regId")({
	component: RegistrationDetailPage,
	loader: async ({ context, params }) => {
		const user = await requireAdmin();
		const regId = Number(params.regId);
		if (Number.isNaN(regId)) {
			throw new Error("Invalid registration ID");
		}
		await context.queryClient.ensureQueryData(
			registrationQueryOptions(regId),
		);
		return user;
	},
});

function RegistrationDetailPage() {
	const user = Route.useLoaderData();
	const { regId: regIdStr } = Route.useParams();
	const regId = Number(regIdStr);
	const registration = useSuspenseQuery(registrationQueryOptions(regId));
	const reg = registration.data;
	const queryClient = useQueryClient();
	const reasonId = useId();
	const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false);
	const [isAcceptDialogOpen, setIsAcceptDialogOpen] = useState(false);
	const [rejectionReason, setRejectionReason] = useState("");

	const acceptMutation = useMutation({
		mutationFn: () => acceptRegistration({ data: { regId } }),
		onSuccess: () => {
			toast.success("Registration accepted successfully");
			queryClient.invalidateQueries({
				queryKey: ["registration", regId],
			});
			setIsAcceptDialogOpen(false);
		},
		onError: (error) => {
			toast.error(`Failed to accept registration: ${error.message}`);
		},
	});

	const rejectMutation = useMutation({
		mutationFn: () =>
			rejectRegistration({ data: { regId, reason: rejectionReason } }),
		onSuccess: () => {
			toast.success("Registration rejected successfully");
			queryClient.invalidateQueries({
				queryKey: ["registration", regId],
			});
			setIsRejectDialogOpen(false);
			setRejectionReason("");
		},
		onError: (error) => {
			toast.error(`Failed to reject registration: ${error.message}`);
		},
	});

	const handleReject = () => {
		if (!rejectionReason.trim()) {
			toast.error("Please enter a rejection reason");
			return;
		}
		rejectMutation.mutate();
	};

	let statusColor = "text-slate-900";
	let statusText = "Pending";
	if (reg.accepted === true) {
		statusColor = "text-green-600";
		statusText = "Accepted";
	} else if (reg.accepted === false) {
		statusColor = "text-red-600";
		statusText = "Rejected";
	}

	return (
		<div className="min-h-screen flex flex-col bg-slate-50/50">
			<Header user={user} backTo="/office/registration/view" />
			<main className="flex-1 p-4 md:p-6 lg:p-8">
				<div className="w-full space-y-6">
					<div className="flex items-center justify-between">
						<div>
							<h2 className="text-2xl font-bold tracking-tight text-slate-900">
								Registration Details
							</h2>
							<p className="text-slate-500">
								Viewing details for registration #{reg.id}
							</p>
							{reg.accepted === null && (
								<div className="mt-4 flex gap-2">
									<Button
										onClick={() =>
											setIsAcceptDialogOpen(true)
										}
										disabled={acceptMutation.isPending}
										className="bg-green-600 hover:bg-green-700"
									>
										{acceptMutation.isPending ? (
											"Accepting..."
										) : (
											<>
												<Check className="h-4 w-4" />
												Accept
											</>
										)}
									</Button>
									<Button
										variant="destructive"
										onClick={() =>
											setIsRejectDialogOpen(true)
										}
										disabled={rejectMutation.isPending}
									>
										<X className="h-4 w-4" />
										Reject
									</Button>
								</div>
							)}
						</div>
					</div>

					<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
						<div className="md:col-span-1 space-y-6">
							<div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm space-y-4">
								<h2 className="text-lg font-semibold text-slate-900 border-bottom pb-2">
									Basic Information
								</h2>
								<div className="space-y-1">
									<p className="text-sm font-medium text-slate-500">
										Status
									</p>
									<p
										className={`font-semibold ${statusColor}`}
									>
										{statusText}
									</p>
								</div>
								{reg.accepted === false &&
									reg.rejectionReason && (
										<DetailItem
											label="Rejection Reason"
											value={reg.rejectionReason}
										/>
									)}
								<DetailItem
									label="Registration No."
									value={reg.id.toString()}
								/>
								<DetailItem label="Email" value={reg.email} />
								<DetailItem label="Phone" value={reg.phone} />
								<DetailItem
									label="Created At"
									value={
										reg.createdAt
											? new Date(
													reg.createdAt,
												).toLocaleString()
											: "-"
									}
								/>
							</div>
						</div>

						<div className="md:col-span-2">
							<div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm space-y-4">
								<h2 className="text-lg font-semibold text-slate-900 border-bottom pb-2">
									Field Responses
								</h2>
								<FieldResponsesDisplay
									responses={reg.responses}
									emptyMessage="No dynamic field responses."
								/>
							</div>
						</div>
					</div>
				</div>
			</main>

			<Dialog
				open={isAcceptDialogOpen}
				onOpenChange={setIsAcceptDialogOpen}
			>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Accept Registration</DialogTitle>
						<DialogDescription>
							Are you sure you want to accept this registration?
							This will create a new user account for the
							registrant.
						</DialogDescription>
					</DialogHeader>
					<DialogFooter>
						<Button
							variant="outline"
							onClick={() => setIsAcceptDialogOpen(false)}
						>
							Cancel
						</Button>
						<Button
							className="bg-green-600 hover:bg-green-700"
							onClick={() => acceptMutation.mutate()}
							disabled={acceptMutation.isPending}
						>
							{acceptMutation.isPending ? (
								"Accepting..."
							) : (
								<>
									<Check className="h-4 w-4" />
									Confirm Accept
								</>
							)}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			<Dialog
				open={isRejectDialogOpen}
				onOpenChange={setIsRejectDialogOpen}
			>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Reject Registration</DialogTitle>
						<DialogDescription>
							Are you sure you want to reject this registration?
							Please provide a reason. This action cannot be
							undone.
						</DialogDescription>
					</DialogHeader>
					<div className="grid gap-4 py-4">
						<div className="grid gap-2">
							<Label htmlFor={reasonId}>Rejection Reason</Label>
							<Textarea
								id={reasonId}
								placeholder="Enter reason for rejection"
								value={rejectionReason}
								onChange={(e) =>
									setRejectionReason(e.target.value)
								}
							/>
						</div>
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
							{rejectMutation.isPending ? (
								"Rejecting..."
							) : (
								<>
									<Ban className="h-4 w-4" />
									Reject Registration
								</>
							)}
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
			<p className="text-sm font-medium text-slate-500">{label}</p>
			<p className="text-slate-900 font-semibold">{value}</p>
		</div>
	);
}
