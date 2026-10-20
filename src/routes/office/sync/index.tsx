import { Header } from "@/components/office/header";
import { AuthCredentialsCard } from "@/components/office/sync/AuthCredentialsCard";
import {
	EQUIPMENT_API_FIELDS,
	USER_API_FIELDS,
	hasUnmappedBookingFields,
	hasUnmappedFields,
} from "@/components/office/sync/constants";
import { DiagnosticLogsCard } from "@/components/office/sync/DiagnosticLogsCard";
import { FieldMappingsCard } from "@/components/office/sync/FieldMappingsCard";
import { SyncControlsCard } from "@/components/office/sync/SyncControlsCard";
import { requireAdmin } from "@/lib/auth";
import {
	authenticateIstem,
	cancelSyncJob,
	clearSyncJob,
	getSyncJobStatus,
	getSyncStatus,
	saveIstemConfig,
	syncBookings,
	syncEquipments,
	syncUsers,
} from "@/services/istem";
import {
	queryOptions,
	useMutation,
	useQueryClient,
	useSuspenseQuery,
} from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export const syncStatusQueryOptions = queryOptions({
	queryKey: ["istem-sync-status"],
	queryFn: () => getSyncStatus(),
});

export const syncJobStatusQueryOptions = queryOptions({
	queryKey: ["istem-sync-job-status"],
	queryFn: () => getSyncJobStatus(),
	refetchInterval: (query) => {
		const data = query.state.data;
		return data?.status === "running" ? 1500 : false;
	},
});

export const Route = createFileRoute("/office/sync/")({
	component: SyncPage,
	loader: async ({ context }) => {
		const user = await requireAdmin();
		await Promise.all([
			context.queryClient.ensureQueryData(syncStatusQueryOptions),
			context.queryClient.ensureQueryData(syncJobStatusQueryOptions),
		]);
		return user;
	},
});

function SyncPage() {
	const user = Route.useLoaderData();
	const { data: status } = useSuspenseQuery(syncStatusQueryOptions);
	const { data: activeJob } = useSuspenseQuery(syncJobStatusQueryOptions);
	const queryClient = useQueryClient();

	// Credentials state
	const [username, setUsername] = useState("");
	const [password, setPassword] = useState("");

	// Config state
	const [userMapping, setUserMapping] = useState<Record<string, string>>({});
	const [equipmentMapping, setEquipmentMapping] = useState<
		Record<string, string>
	>({});
	const [bookingMappings, setBookingMappings] = useState<
		Record<string, Record<string, string>>
	>({});
	const [selectedEquipmentId, setSelectedEquipmentId] = useState<string>("");
	const [staticDefaults, setStaticDefaults] = useState<
		Record<string, string>
	>({});

	// Error Logs state
	const [diagnosticErrors, setDiagnosticErrors] = useState<string[]>([]);
	const [isInitialized, setIsInitialized] = useState(false);
	const [prevJobState, setPrevJobState] = useState<string | null>(null);

	// Check if booking mappings changed compared to original database value in each equipment
	const isBookingMappingsChanged = () => {
		if (!status?.equipments) return false;
		for (const eq of status.equipments) {
			const currentMapping = bookingMappings[String(eq.id)] || {};
			const originalMapping = eq.istemBookingMapping || {};
			if (
				JSON.stringify(currentMapping) !==
				JSON.stringify(originalMapping)
			) {
				return true;
			}
		}
		return false;
	};

	// Check if configs are dirty (have changes compared to original database values)
	const isConfigChanged = status
		? JSON.stringify(userMapping) !==
				JSON.stringify(status.config.userMapping) ||
			JSON.stringify(equipmentMapping) !==
				JSON.stringify(status.config.equipmentMapping) ||
			JSON.stringify(staticDefaults) !==
				JSON.stringify(status.config.staticDefaults) ||
			isBookingMappingsChanged()
		: false;

	// Initialize config states
	useEffect(() => {
		if (status) {
			const isFirstLoad = !isInitialized;
			if (isFirstLoad || !isConfigChanged) {
				setUserMapping(status.config.userMapping || {});
				setEquipmentMapping(status.config.equipmentMapping || {});
				setStaticDefaults(status.config.staticDefaults || {});

				// Initialize bookingMappings per equipment
				const mappings: Record<string, Record<string, string>> = {};
				if (status.equipments) {
					for (const eq of status.equipments) {
						mappings[String(eq.id)] = eq.istemBookingMapping || {};
					}
				}
				setBookingMappings(mappings);

				if (isFirstLoad) {
					setIsInitialized(true);
				}
			}

			// Initialize selected equipment id if not set
			if (
				status.equipments &&
				status.equipments.length > 0 &&
				!selectedEquipmentId
			) {
				setSelectedEquipmentId(String(status.equipments[0].id));
			}
		}
	}, [status, isInitialized, isConfigChanged, selectedEquipmentId]);

	// Background job status listener and toast alerts
	useEffect(() => {
		if (!activeJob) return;

		const key = `${activeJob.id}:${activeJob.status}:${activeJob.completedAt || ""}`;
		if (key === prevJobState) return;
		setPrevJobState(key);

		if (activeJob.status === "completed") {
			toast.success(
				`${activeJob.type} sync completed: ${activeJob.successCount} synced, ${activeJob.failCount} failed.`,
			);
			if (activeJob.errors && activeJob.errors.length > 0) {
				setDiagnosticErrors((prev) => [...prev, ...activeJob.errors]);
			}
			queryClient.invalidateQueries(syncStatusQueryOptions);
		} else if (activeJob.status === "aborted") {
			toast.info(`${activeJob.type} sync was stopped.`);
			if (activeJob.errors && activeJob.errors.length > 0) {
				setDiagnosticErrors((prev) => [...prev, ...activeJob.errors]);
			}
			queryClient.invalidateQueries(syncStatusQueryOptions);
		} else if (activeJob.status === "failed") {
			toast.error(`${activeJob.type} sync failed.`);
			if (activeJob.errors && activeJob.errors.length > 0) {
				setDiagnosticErrors((prev) => [...prev, ...activeJob.errors]);
			}
			queryClient.invalidateQueries(syncStatusQueryOptions);
		} else if (activeJob.status === "running") {
			queryClient.invalidateQueries(syncStatusQueryOptions);
		}
	}, [activeJob, prevJobState, queryClient]);

	// Mutations
	const loginMutation = useMutation({
		mutationFn: authenticateIstem,
		onSuccess: () => {
			toast.success("Authenticated with I-STEM successfully.");
			queryClient.invalidateQueries(syncStatusQueryOptions);
			setUsername("");
			setPassword("");
		},
		onError: (err: Error) => {
			toast.error(err.message || "Failed to authenticate.");
		},
	});

	const saveConfigMutation = useMutation({
		mutationFn: saveIstemConfig,
		onSuccess: () => {
			toast.success("Configurations saved successfully.");
			queryClient.invalidateQueries(syncStatusQueryOptions);
		},
		onError: (err: Error) => {
			toast.error(err.message || "Failed to save configuration.");
		},
	});

	const syncUsersMutation = useMutation({
		mutationFn: syncUsers,
		onSuccess: (res) => {
			if (!res.started) {
				toast.info(res.message || "No unsynced users found.");
				return;
			}
			toast.info(`Started background sync for ${res.total} users.`);
			queryClient.invalidateQueries(syncJobStatusQueryOptions);
		},
		onError: (err: Error) => {
			toast.error(err.message || "Failed to start user sync.");
			setDiagnosticErrors((prev) => [
				...prev,
				`User Sync Error: ${err.message}`,
			]);
		},
	});

	const syncEquipmentsMutation = useMutation({
		mutationFn: syncEquipments,
		onSuccess: (res) => {
			if (!res.started) {
				toast.info(res.message || "No unsynced equipments found.");
				return;
			}
			toast.info(`Started background sync for ${res.total} equipments.`);
			queryClient.invalidateQueries(syncJobStatusQueryOptions);
		},
		onError: (err: Error) => {
			toast.error(err.message || "Failed to start equipment sync.");
			setDiagnosticErrors((prev) => [
				...prev,
				`Equipment Sync Error: ${err.message}`,
			]);
		},
	});

	const syncBookingsMutation = useMutation({
		mutationFn: syncBookings,
		onSuccess: (res) => {
			if (!res.started) {
				toast.info(res.message || "No unsynced bookings found.");
				return;
			}
			toast.info(`Started background sync for ${res.total} bookings.`);
			queryClient.invalidateQueries(syncJobStatusQueryOptions);
		},
		onError: (err: Error) => {
			toast.error(err.message || "Failed to start booking sync.");
			setDiagnosticErrors((prev) => [
				...prev,
				`Booking Sync Error: ${err.message}`,
			]);
		},
	});

	const cancelSyncMutation = useMutation({
		mutationFn: cancelSyncJob,
		onSuccess: (res) => {
			if (res.cancelled) {
				toast.info("Stopping sync operation...");
			}
			queryClient.invalidateQueries(syncJobStatusQueryOptions);
			queryClient.invalidateQueries(syncStatusQueryOptions);
		},
		onError: (err: Error) => {
			toast.error(err.message || "Failed to stop sync.");
		},
	});

	const clearSyncMutation = useMutation({
		mutationFn: clearSyncJob,
		onSuccess: () => {
			queryClient.invalidateQueries(syncJobStatusQueryOptions);
		},
	});

	const handleLoginSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		loginMutation.mutate({
			data: { username, password },
		});
	};

	const handleSaveConfig = () => {
		saveConfigMutation.mutate({
			data: {
				userMapping,
				equipmentMapping,
				staticDefaults,
				bookingMappings,
			},
		});
	};

	const isPending =
		syncUsersMutation.isPending ||
		syncEquipmentsMutation.isPending ||
		syncBookingsMutation.isPending ||
		cancelSyncMutation.isPending ||
		clearSyncMutation.isPending;

	// Granular unmapped field checks
	const hasUnmappedUserFields = hasUnmappedFields(
		USER_API_FIELDS,
		userMapping,
	);
	const hasUnmappedEquipmentFields = hasUnmappedFields(
		EQUIPMENT_API_FIELDS,
		equipmentMapping,
	);
	const hasUnmappedBookingFieldsState = hasUnmappedBookingFields(
		status?.equipments,
		bookingMappings,
	);

	return (
		<div className="min-h-screen flex flex-col bg-slate-50/50">
			<Header user={user} backTo="/office" />
			<main className="flex-1 p-4 md:p-6 lg:p-8">
				<div className="w-full space-y-6">
					<div>
						<h2 className="text-2xl font-bold tracking-tight text-slate-900">
							I-STEM Synchronization Control
						</h2>
						<p className="text-slate-500">
							Manage I-STEM API authentication, field mappings,
							static defaults, and background sync operations.
						</p>
					</div>

					{/* Card 1: Auth Status / Credentials */}
					<AuthCredentialsCard
						isAuthenticated={status.isAuthenticated}
						tokenExpiresAt={status.tokenExpiresAt}
						username={username}
						setUsername={setUsername}
						password={password}
						setPassword={setPassword}
						onSubmit={handleLoginSubmit}
						isPending={loginMutation.isPending}
					/>

					{/* Card 2: Manual Sync triggers */}
					{status.isAuthenticated && (
						<SyncControlsCard
							status={status}
							activeJob={activeJob}
							isConfigChanged={isConfigChanged}
							hasUnmappedUserFields={hasUnmappedUserFields}
							hasUnmappedEquipmentFields={
								hasUnmappedEquipmentFields
							}
							hasUnmappedBookingFields={
								hasUnmappedBookingFieldsState
							}
							isPending={isPending}
							isSyncingUsers={syncUsersMutation.isPending}
							isSyncingEquipments={
								syncEquipmentsMutation.isPending
							}
							isSyncingBookings={syncBookingsMutation.isPending}
							isCancelling={cancelSyncMutation.isPending}
							isClearing={clearSyncMutation.isPending}
							onSyncUsers={() => syncUsersMutation.mutate({})}
							onSyncEquipments={() =>
								syncEquipmentsMutation.mutate({})
							}
							onSyncBookings={() =>
								syncBookingsMutation.mutate({})
							}
							onCancelSync={() => cancelSyncMutation.mutate({})}
							onClearJob={() => clearSyncMutation.mutate({})}
						/>
					)}

					{/* Diagnostics Log Card */}
					<DiagnosticLogsCard
						errors={diagnosticErrors}
						onClear={() => setDiagnosticErrors([])}
					/>

					{/* Card 3: Mapping Configurations */}
					<FieldMappingsCard
						userFields={status.userFields}
						equipmentFields={status.equipmentFields}
						equipments={status.equipments}
						userMapping={userMapping}
						setUserMapping={setUserMapping}
						equipmentMapping={equipmentMapping}
						setEquipmentMapping={setEquipmentMapping}
						bookingMappings={bookingMappings}
						setBookingMappings={setBookingMappings}
						staticDefaults={staticDefaults}
						setStaticDefaults={setStaticDefaults}
						selectedEquipmentId={selectedEquipmentId}
						setSelectedEquipmentId={setSelectedEquipmentId}
						isConfigChanged={isConfigChanged}
						isPending={saveConfigMutation.isPending}
						onSave={handleSaveConfig}
					/>
				</div>
			</main>
		</div>
	);
}
