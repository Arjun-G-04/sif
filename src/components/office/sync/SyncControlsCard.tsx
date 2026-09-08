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

function SyncBlockerWarning({
	reason,
	isDependency,
}: {
	reason?: string | null;
	isDependency?: boolean;
}) {
	if (!reason) return null;
	return (
		<span
			className={cn(
				"text-xs font-medium flex items-center gap-1.5 mt-0.5",
				isDependency ? "text-red-500" : "text-amber-600",
			)}
		>
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
	const getUserBlocker = () => {
		if (isConfigChanged) {
			return {
				reason: "Save mapping changes before syncing",
				isDependency: false,
			};
		}
		if (hasUnmappedUserFields) {
			return { reason: "Map all user fields first", isDependency: false };
		}
		return null;
	};

	const getEquipmentBlocker = () => {
		if (isConfigChanged) {
			return {
				reason: "Save mapping changes before syncing",
				isDependency: false,
			};
		}
		if (status.unsyncedUsersCount > 0) {
			return { reason: "Sync users first", isDependency: true };
		}
		if (hasUnmappedEquipmentFields) {
			return {
				reason: "Map all equipment fields first",
				isDependency: false,
			};
		}
		return null;
	};

	const getBookingBlocker = () => {
		if (isConfigChanged) {
			return {
				reason: "Save mapping changes before syncing",
				isDependency: false,
			};
		}
		if (
			status.unsyncedUsersCount > 0 ||
			status.unsyncedEquipmentsCount > 0
		) {
			return {
				reason: "Sync users and equipments first",
				isDependency: true,
			};
		}
		if (hasUnmappedBookingFields) {
			return {
				reason: "Map all booking fields for all equipments first",
				isDependency: false,
			};
		}
		return null;
	};

	const userBlocker = getUserBlocker();
	const equipmentBlocker = getEquipmentBlocker();
	const bookingBlocker = getBookingBlocker();

	const isUserDisabled =
		isPending ||
		status.unsyncedUsersCount === 0 ||
		hasUnmappedUserFields ||
		isConfigChanged;

	const isEquipmentDisabled =
		isPending ||
		status.unsyncedEquipmentsCount === 0 ||
		status.unsyncedUsersCount > 0 ||
		hasUnmappedEquipmentFields ||
		isConfigChanged;

	const isBookingDisabled =
		isPending ||
		status.unsyncedBookingsCount === 0 ||
		status.unsyncedUsersCount > 0 ||
		status.unsyncedEquipmentsCount > 0 ||
		hasUnmappedBookingFields ||
		isConfigChanged;

	return (
		<Card className="border-slate-200">
			<CardHeader>
				<CardTitle>Synchronization Controls</CardTitle>
				<CardDescription>
					Manually trigger sync operations. Synchronizations must be
					run sequentially in the order below.
				</CardDescription>
			</CardHeader>
			<CardContent className="space-y-4">
				{/* Users Sync */}
				<div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-4 gap-4">
					<div>
						<h4 className="font-semibold text-slate-900">Users</h4>
						<SyncBlockerWarning
							reason={userBlocker?.reason}
							isDependency={userBlocker?.isDependency}
						/>
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
						<SyncBlockerWarning
							reason={equipmentBlocker?.reason}
							isDependency={equipmentBlocker?.isDependency}
						/>
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
						<SyncBlockerWarning
							reason={bookingBlocker?.reason}
							isDependency={bookingBlocker?.isDependency}
						/>
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
