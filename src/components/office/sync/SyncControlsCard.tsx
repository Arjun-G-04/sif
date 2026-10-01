import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";
import { AlertCircle } from "lucide-react";

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
	isConfigChanged: boolean;
	hasUnmappedUserFields: boolean;
	hasUnmappedEquipmentFields: boolean;
	hasUnmappedBookingFields: boolean;
	isPending: boolean;
	isSyncingUsers: boolean;
	isSyncingEquipments: boolean;
	isSyncingBookings: boolean;
	onSyncUsers: () => void;
	onSyncEquipments: () => void;
	onSyncBookings: () => void;
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
	isConfigChanged,
	hasUnmappedUserFields,
	hasUnmappedEquipmentFields,
	hasUnmappedBookingFields,
	isPending,
	isSyncingUsers,
	isSyncingEquipments,
	isSyncingBookings,
	onSyncUsers,
	onSyncEquipments,
	onSyncBookings,
}: SyncControlsCardProps) {
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
		isPending || status.unsyncedUsersCount === 0 || Boolean(userBlocker);

	const isEquipmentDisabled =
		isPending ||
		status.unsyncedEquipmentsCount === 0 ||
		Boolean(equipmentBlocker);

	const isBookingDisabled =
		isPending ||
		status.unsyncedBookingsCount === 0 ||
		Boolean(bookingBlocker);

	return (
		<Card className="border-slate-200">
			<CardHeader>
				<CardTitle>Synchronization Controls</CardTitle>
				<CardDescription>
					Manually trigger sync operations.
				</CardDescription>
			</CardHeader>
			<CardContent className="space-y-4">
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
							{isSyncingUsers && <Spinner />}
							{isSyncingUsers ? "Syncing" : "Sync"}
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
							{isSyncingEquipments && <Spinner />}
							{isSyncingEquipments ? "Syncing" : "Sync"}
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
							{isSyncingBookings && <Spinner />}
							{isSyncingBookings ? "Syncing" : "Sync"}
						</Button>
					</div>
				</div>
			</CardContent>
		</Card>
	);
}
