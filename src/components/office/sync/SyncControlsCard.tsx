import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";
import type { SyncJobState } from "@/services/istem";
import { AlertCircle, CheckCircle2, Square, XCircle } from "lucide-react";

interface SyncStatusCounts {
	syncedUsersCount: number;
	unsyncedUsersCount: number;
	syncedEquipmentsCount: number;
	unsyncedEquipmentsCount: number;
	syncedBookingsCount: number;
	unsyncedBookingsCount: number;
}

interface SyncControlsCardProps {
	status: SyncStatusCounts;
	activeJob?: SyncJobState | null;
	isConfigChanged: boolean;
	hasUnmappedUserFields: boolean;
	hasUnmappedEquipmentFields: boolean;
	hasUnmappedBookingFields: boolean;
	isPending: boolean;
	isSyncingUsers: boolean;
	isSyncingEquipments: boolean;
	isSyncingBookings: boolean;
	isCancelling?: boolean;
	isClearing?: boolean;
	onSyncUsers: () => void;
	onSyncEquipments: () => void;
	onSyncBookings: () => void;
	onCancelSync?: () => void;
	onClearJob?: () => void;
}

function SyncBlockerWarning({ reason }: { reason?: string | null }) {
	if (!reason) return null;
	return (
		<span className="text-xs font-medium flex items-center gap-1.5 mt-0.5 text-amber-600">
			<AlertCircle className="w-3.5 h-3.5 shrink-0" />
			Blocked: {reason}
		</span>
	);
}

export function SyncControlsCard({
	status,
	activeJob,
	isConfigChanged,
	hasUnmappedUserFields,
	hasUnmappedEquipmentFields,
	hasUnmappedBookingFields,
	isPending,
	isSyncingUsers,
	isSyncingEquipments,
	isSyncingBookings,
	isCancelling = false,
	isClearing = false,
	onSyncUsers,
	onSyncEquipments,
	onSyncBookings,
	onCancelSync,
	onClearJob,
}: SyncControlsCardProps) {
	const isJobRunning = activeJob?.status === "running";

	// Blocker evaluations
	const getBlocker = (hasUnmappedFields: boolean, unmappedReason: string) => {
		if (isConfigChanged) {
			return "Save mapping changes before syncing";
		}
		if (hasUnmappedFields) {
			return unmappedReason;
		}
		return null;
	};

	const userBlocker = getBlocker(
		hasUnmappedUserFields,
		"Map all user fields first",
	);
	const equipmentBlocker = getBlocker(
		hasUnmappedEquipmentFields,
		"Map all equipment fields first",
	);
	const bookingBlocker = getBlocker(
		hasUnmappedBookingFields,
		"Map all booking fields for all equipments first",
	);

	const isUserDisabled =
		isPending ||
		isJobRunning ||
		status.unsyncedUsersCount === 0 ||
		Boolean(userBlocker);

	const isEquipmentDisabled =
		isPending ||
		isJobRunning ||
		status.unsyncedEquipmentsCount === 0 ||
		Boolean(equipmentBlocker);

	const isBookingDisabled =
		isPending ||
		isJobRunning ||
		status.unsyncedBookingsCount === 0 ||
		Boolean(bookingBlocker);

	const isUserJobActive = isJobRunning && activeJob?.type === "users";
	const isEquipmentJobActive =
		isJobRunning && activeJob?.type === "equipments";
	const isBookingJobActive = isJobRunning && activeJob?.type === "bookings";

	const progressPercentage =
		activeJob && activeJob.total > 0
			? Math.min(
					100,
					Math.round((activeJob.processed / activeJob.total) * 100),
				)
			: 0;

	return (
		<Card className="border-slate-200">
			<CardHeader>
				<CardTitle>Synchronization Controls</CardTitle>
				<CardDescription>
					Manually trigger background sync operations.
				</CardDescription>
			</CardHeader>
			<CardContent className="space-y-4">
				{/* Active Background Worker Progress Section */}
				{isJobRunning && activeJob && (
					<div className="rounded-lg border border-blue-200 bg-blue-50/70 p-4 space-y-3">
						<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
							<div className="flex items-center gap-2">
								<Spinner className="w-4 h-4 text-blue-600" />
								<span className="font-semibold text-sm text-blue-950 capitalize">
									Syncing {activeJob.type} in background
								</span>
								<span className="text-xs font-semibold text-blue-700 bg-blue-100/90 border border-blue-200 px-2 py-0.5 rounded-full">
									{activeJob.processed} of {activeJob.total}{" "}
									processed
								</span>
							</div>
							{onCancelSync && (
								<Button
									variant="outline"
									size="sm"
									onClick={onCancelSync}
									disabled={isCancelling}
									className="h-8 gap-1.5 text-xs font-semibold text-rose-600 border-rose-200 hover:bg-rose-50 hover:text-rose-700 w-fit"
								>
									{isCancelling ? (
										<Spinner className="w-3.5 h-3.5" />
									) : (
										<Square className="w-3.5 h-3.5 fill-current" />
									)}
									{isCancelling ? "Stopping..." : "Stop Sync"}
								</Button>
							)}
						</div>

						<Progress
							value={progressPercentage}
							className="h-2 bg-blue-200/70"
						/>

						<div className="flex items-center justify-between text-xs text-blue-800">
							<span className="font-medium">
								{progressPercentage}% completed
							</span>
							<div className="flex items-center gap-3">
								<span className="text-emerald-700 font-semibold flex items-center gap-1">
									<CheckCircle2 className="w-3.5 h-3.5" />
									{activeJob.successCount} synced
								</span>
								{activeJob.failCount > 0 && (
									<span className="text-rose-700 font-semibold flex items-center gap-1">
										<XCircle className="w-3.5 h-3.5" />
										{activeJob.failCount} failed
									</span>
								)}
							</div>
						</div>
					</div>
				)}

				{/* Previous Job Completion Summary */}
				{!isJobRunning &&
					activeJob &&
					(activeJob.status === "completed" ||
						activeJob.status === "aborted" ||
						activeJob.status === "failed") && (
						<div
							className={cn(
								"rounded-lg border p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs",
								activeJob.status === "completed" &&
									"bg-emerald-50/70 border-emerald-200 text-emerald-950",
								activeJob.status === "aborted" &&
									"bg-amber-50/70 border-amber-200 text-amber-950",
								activeJob.status === "failed" &&
									"bg-rose-50/70 border-rose-200 text-rose-950",
							)}
						>
							<div className="flex items-center gap-2">
								{activeJob.status === "completed" && (
									<CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
								)}
								{activeJob.status === "aborted" && (
									<AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
								)}
								{activeJob.status === "failed" && (
									<XCircle className="w-4 h-4 text-rose-600 shrink-0" />
								)}
								<span>
									<strong className="capitalize">
										Last {activeJob.type} sync{" "}
										{activeJob.status}:
									</strong>{" "}
									{activeJob.successCount} succeeded,{" "}
									{activeJob.failCount} failed out of{" "}
									{activeJob.total} total items.
								</span>
							</div>
							{onClearJob && (
								<Button
									variant="ghost"
									size="sm"
									onClick={onClearJob}
									disabled={isClearing}
									className="h-6 px-2 text-xs text-slate-500 hover:text-slate-900 w-fit self-end sm:self-auto gap-1.5"
								>
									{isClearing && (
										<Spinner className="w-3 h-3" />
									)}
									{isClearing ? "Dismissing..." : "Dismiss"}
								</Button>
							)}
						</div>
					)}

				{/* Users Sync */}
				<div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-4 gap-4">
					<div>
						<h4 className="font-semibold text-slate-900">Users</h4>
						<SyncBlockerWarning reason={userBlocker} />
					</div>
					<div className="flex flex-wrap items-center gap-3">
						<div className="flex items-center gap-2 text-xs">
							<span className="inline-flex items-center px-2 py-1 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200/40 font-semibold">
								{status.syncedUsersCount} synced
							</span>
							<span
								className={cn(
									"inline-flex items-center px-2 py-1 rounded-md border font-semibold",
									status.unsyncedUsersCount > 0
										? "bg-amber-50 text-amber-700 border-amber-200/40"
										: "bg-slate-50 text-slate-400 border-slate-200/40",
								)}
							>
								{status.unsyncedUsersCount} require sync
							</span>
						</div>
						<Button
							onClick={onSyncUsers}
							disabled={isUserDisabled}
							className="gap-2"
						>
							{(isSyncingUsers || isUserJobActive) && <Spinner />}
							{isSyncingUsers
								? "Starting..."
								: isUserJobActive
									? "Syncing in background..."
									: "Sync"}
						</Button>
					</div>
				</div>

				{/* Equipments Sync */}
				<div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-4 gap-4">
					<div>
						<h4 className="font-semibold text-slate-900">
							Equipments
						</h4>
						<SyncBlockerWarning reason={equipmentBlocker} />
					</div>
					<div className="flex flex-wrap items-center gap-3">
						<div className="flex items-center gap-2 text-xs">
							<span className="inline-flex items-center px-2 py-1 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200/40 font-semibold">
								{status.syncedEquipmentsCount} synced
							</span>
							<span
								className={cn(
									"inline-flex items-center px-2 py-1 rounded-md border font-semibold",
									status.unsyncedEquipmentsCount > 0
										? "bg-amber-50 text-amber-700 border-amber-200/40"
										: "bg-slate-50 text-slate-400 border-slate-200/40",
								)}
							>
								{status.unsyncedEquipmentsCount} require sync
							</span>
						</div>
						<Button
							onClick={onSyncEquipments}
							disabled={isEquipmentDisabled}
							className="gap-2"
						>
							{(isSyncingEquipments || isEquipmentJobActive) && (
								<Spinner />
							)}
							{isSyncingEquipments
								? "Starting..."
								: isEquipmentJobActive
									? "Syncing in background..."
									: "Sync"}
						</Button>
					</div>
				</div>

				{/* Bookings Sync */}
				<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
					<div>
						<h4 className="font-semibold text-slate-900">
							Bookings
						</h4>
						<SyncBlockerWarning reason={bookingBlocker} />
					</div>
					<div className="flex flex-wrap items-center gap-3">
						<div className="flex items-center gap-2 text-xs">
							<span className="inline-flex items-center px-2 py-1 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200/40 font-semibold">
								{status.syncedBookingsCount} synced
							</span>
							<span
								className={cn(
									"inline-flex items-center px-2 py-1 rounded-md border font-semibold",
									status.unsyncedBookingsCount > 0
										? "bg-amber-50 text-amber-700 border-amber-200/40"
										: "bg-slate-50 text-slate-400 border-slate-200/40",
								)}
							>
								{status.unsyncedBookingsCount} require sync
							</span>
						</div>
						<Button
							onClick={onSyncBookings}
							disabled={isBookingDisabled}
							className="gap-2"
						>
							{(isSyncingBookings || isBookingJobActive) && (
								<Spinner />
							)}
							{isSyncingBookings
								? "Starting..."
								: isBookingJobActive
									? "Syncing in background..."
									: "Sync"}
						</Button>
					</div>
				</div>
			</CardContent>
		</Card>
	);
}
