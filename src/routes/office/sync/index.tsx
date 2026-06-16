import { Header } from "@/components/office/header";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { requireAdmin } from "@/lib/auth";
import { cn } from "@/lib/utils";
import {
	authenticateIstem,
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
import { AlertCircle, Trash2 } from "lucide-react";
import { useState, useEffect, useId } from "react";
import { toast } from "sonner";

export const syncStatusQueryOptions = queryOptions({
	queryKey: ["istem-sync-status"],
	queryFn: () => getSyncStatus(),
});

export const Route = createFileRoute("/office/sync/")({
	component: SyncPage,
	loader: async ({ context }) => {
		const user = await requireAdmin();
		await context.queryClient.ensureQueryData(syncStatusQueryOptions);
		return user;
	},
});

const USER_API_FIELDS = [
	{ key: "user_first_name", label: "First Name" },
	{ key: "user_last_name", label: "Last Name" },
	{ key: "user_email", label: "Email Address" },
	{ key: "user_contactno", label: "Contact Number" },
	{ key: "user_organisation", label: "Organisation" },
	{ key: "billing_user_name", label: "Billing Name" },
	{ key: "billing_address", label: "Billing Address" },
	{ key: "user_gender", label: "Gender" },
	{ key: "user_salutation", label: "Salutation" },
	{ key: "user_address", label: "Address" },
	{ key: "user_city", label: "City" },
	{ key: "user_district", label: "District" },
	{ key: "user_state", label: "State" },
	{ key: "user_country", label: "Country" },
	{ key: "user_pin", label: "PIN Code" },
	{ key: "institute_id", label: "Institute ID" },
	{ key: "user_type", label: "User Type (e.g. Academic User)" },
];

const EQUIPMENT_API_FIELDS = [
	{ key: "equipment_name", label: "Equipment Name" },
	{ key: "equipment_make", label: "Make" },
	{ key: "equipment_model", label: "Model" },
	{ key: "equipment_dept_lab", label: "Department / Lab" },
	{ key: "equipment_rate", label: "Usage Rate" },
	{ key: "equipment_srno", label: "Serial Number" },
	{ key: "equipment_location", label: "Location" },
	{ key: "equipment_website", label: "Website URL" },
	{ key: "equipment_description", label: "Description" },
	{ key: "institute_id", label: "Institute ID" },
];

const BOOKING_API_FIELDS = [
	{ key: "service_type", label: "Service Type (e.g. Fabrication)" },
	{ key: "billing_state", label: "Billing State" },
	{ key: "billing_address", label: "Billing Address" },
	{ key: "booking_remark", label: "Booking Remark" },
	{ key: "booking_title", label: "Booking Title" },
	{ key: "background_of_work", label: "Background of Work" },
	{ key: "exclusive_use", label: "Exclusive Use Info" },
];

function SyncPage() {
	const user = Route.useLoaderData();
	const { data: status } = useSuspenseQuery(syncStatusQueryOptions);
	const queryClient = useQueryClient();

	// Credentials state
	const usernameId = useId();
	const passwordId = useId();
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
		onMutate: () => {
			setDiagnosticErrors([]);
		},
		onSuccess: (res) => {
			toast.success(
				`User Sync Complete: ${res.successCount} synced, ${res.failCount} failed.`,
			);
			if (res.errors && res.errors.length > 0) {
				setDiagnosticErrors((prev) => [...prev, ...res.errors]);
				toast.error(
					`${res.failCount} errors occurred. See Diagnostics Log.`,
				);
			}
			queryClient.invalidateQueries(syncStatusQueryOptions);
		},
		onError: (err: Error) => {
			toast.error(err.message || "Failed to sync users.");
			setDiagnosticErrors((prev) => [
				...prev,
				`User Sync Error: ${err.message}`,
			]);
		},
	});

	const syncEquipmentsMutation = useMutation({
		mutationFn: syncEquipments,
		onMutate: () => {
			setDiagnosticErrors([]);
		},
		onSuccess: (res) => {
			toast.success(
				`Equipment Sync Complete: ${res.successCount} synced, ${res.failCount} failed.`,
			);
			if (res.errors && res.errors.length > 0) {
				setDiagnosticErrors((prev) => [...prev, ...res.errors]);
				toast.error(
					`${res.failCount} errors occurred. See Diagnostics Log.`,
				);
			}
			queryClient.invalidateQueries(syncStatusQueryOptions);
		},
		onError: (err: Error) => {
			toast.error(err.message || "Failed to sync equipments.");
			setDiagnosticErrors((prev) => [
				...prev,
				`Equipment Sync Error: ${err.message}`,
			]);
		},
	});

	const syncBookingsMutation = useMutation({
		mutationFn: syncBookings,
		onMutate: () => {
			setDiagnosticErrors([]);
		},
		onSuccess: (res) => {
			toast.success(
				`Booking Sync Complete: ${res.successCount} synced, ${res.failCount} failed.`,
			);
			if (res.errors && res.errors.length > 0) {
				setDiagnosticErrors((prev) => [...prev, ...res.errors]);
				toast.error(
					`${res.failCount} errors occurred. See Diagnostics Log.`,
				);
			}
			queryClient.invalidateQueries(syncStatusQueryOptions);
		},
		onError: (err: Error) => {
			toast.error(err.message || "Failed to sync bookings.");
			setDiagnosticErrors((prev) => [
				...prev,
				`Booking Sync Error: ${err.message}`,
			]);
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
		syncBookingsMutation.isPending;

	// Detect if any field has an unmapped value ("default")
	const getHasUnmappedFields = () => {
		// Check user mapping fields
		for (const field of USER_API_FIELDS) {
			const val = userMapping[field.key];
			if (!val || val === "default") return true;
		}
		// Check equipment mapping fields
		for (const field of EQUIPMENT_API_FIELDS) {
			const val = equipmentMapping[field.key];
			if (!val || val === "default") return true;
		}
		// Check booking mappings for all equipments
		if (status?.equipments) {
			for (const eq of status.equipments) {
				const eqMapping = bookingMappings[String(eq.id)] || {};
				for (const field of BOOKING_API_FIELDS) {
					const val = eqMapping[field.key];
					if (!val || val === "default") return true;
				}
			}
		}
		return false;
	};

	const hasUnmappedFields = getHasUnmappedFields();

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
							static defaults, and manual sync operations.
						</p>
					</div>

					{/* Card 1: Auth Status / Credentials */}
					<Card className="border-slate-200">
						<CardHeader>
							<CardTitle>I-STEM API Authentication</CardTitle>
							<CardDescription>
								Authenticate against the I-STEM Staging API to
								retrieve an access token.
							</CardDescription>
						</CardHeader>
						<CardContent>
							{status.isAuthenticated ? (
								<div className="bg-teal-50 border border-teal-200 p-4 rounded-lg">
									<div className="space-y-1">
										<div className="flex items-center gap-2">
											<span className="h-2.5 w-2.5 rounded-full bg-teal-500 animate-pulse" />
											<span className="font-semibold text-teal-950">
												Successfully Authenticated
											</span>
										</div>
										<p className="text-teal-800 text-sm">
											Token expires on:{" "}
											{status.tokenExpiresAt
												? new Date(
														status.tokenExpiresAt,
													).toLocaleString("en-IN", {
														dateStyle: "medium",
														timeStyle: "medium",
													})
												: "Unknown"}
										</p>
									</div>
								</div>
							) : (
								<form
									onSubmit={handleLoginSubmit}
									className="space-y-4 max-w-md"
								>
									<div className="space-y-2">
										<Label htmlFor={usernameId}>
											I-STEM Username
										</Label>
										<Input
											id={usernameId}
											type="text"
											placeholder="e.g. IR01189"
											value={username}
											onChange={(e) =>
												setUsername(e.target.value)
											}
											required
										/>
									</div>
									<div className="space-y-2">
										<Label htmlFor={passwordId}>
											I-STEM Password
										</Label>
										<Input
											id={passwordId}
											type="password"
											value={password}
											onChange={(e) =>
												setPassword(e.target.value)
											}
											required
										/>
									</div>
									<Button
										type="submit"
										disabled={loginMutation.isPending}
									>
										{loginMutation.isPending && <Spinner />}
										{loginMutation.isPending
											? "Connecting..."
											: "Authenticate"}
									</Button>
								</form>
							)}
						</CardContent>
					</Card>

					{/* Card 2: Manual Sync triggers */}
					{status.isAuthenticated && (
						<Card className="border-slate-200">
							<CardHeader>
								<CardTitle>Synchronization Controls</CardTitle>
								<CardDescription>
									Manually trigger sync operations.
									Synchronizations must be run sequentially in
									the order below.
								</CardDescription>
							</CardHeader>
							<CardContent className="space-y-4">
								{hasUnmappedFields && (
									<div className="bg-amber-50 border border-amber-200 text-amber-900 rounded-lg p-3 text-sm flex items-start gap-2">
										<AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
										<div>
											<span className="font-semibold">
												Sync Blocked:
											</span>{" "}
											Unmapped fields exist in your
											configurations. Please ensure all
											User, Equipment, and Booking fields
											(for all equipments) are mapped or
											assigned static defaults before
											syncing.
										</div>
									</div>
								)}

								{/* Users Sync */}
								<div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-4 gap-4">
									<div>
										<h4 className="font-semibold text-slate-900">
											Users
										</h4>
									</div>
									<div className="flex flex-wrap items-center gap-3">
										<div className="flex items-center gap-2 text-xs">
											<span className="inline-flex items-center px-2 py-1 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200/40 font-semibold">
												{status.syncedUsersCount} synced
											</span>
											<span
												className={cn(
													"inline-flex items-center px-2 py-1 rounded-md border font-semibold",
													status.unsyncedUsersCount >
														0
														? "bg-amber-50 text-amber-700 border-amber-200/40"
														: "bg-slate-50 text-slate-400 border-slate-200/40",
												)}
											>
												{status.unsyncedUsersCount}{" "}
												require sync
											</span>
										</div>
										<Button
											onClick={() =>
												syncUsersMutation.mutate({})
											}
											disabled={
												isPending ||
												status.unsyncedUsersCount ===
													0 ||
												hasUnmappedFields
											}
											className="gap-2"
										>
											{syncUsersMutation.isPending && (
												<Spinner />
											)}
											{syncUsersMutation.isPending
												? "Syncing"
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
										{status.unsyncedUsersCount > 0 && (
											<span className="text-red-500 text-xs font-medium block mt-0.5">
												⚠️ Blocked: Sync users first
											</span>
										)}
									</div>
									<div className="flex flex-wrap items-center gap-3">
										<div className="flex items-center gap-2 text-xs">
											<span className="inline-flex items-center px-2 py-1 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200/40 font-semibold">
												{status.syncedEquipmentsCount}{" "}
												synced
											</span>
											<span
												className={cn(
													"inline-flex items-center px-2 py-1 rounded-md border font-semibold",
													status.unsyncedEquipmentsCount >
														0
														? "bg-amber-50 text-amber-700 border-amber-200/40"
														: "bg-slate-50 text-slate-400 border-slate-200/40",
												)}
											>
												{status.unsyncedEquipmentsCount}{" "}
												require sync
											</span>
										</div>
										<Button
											onClick={() =>
												syncEquipmentsMutation.mutate(
													{},
												)
											}
											disabled={
												isPending ||
												status.unsyncedEquipmentsCount ===
													0 ||
												status.unsyncedUsersCount > 0 ||
												hasUnmappedFields
											}
											className="gap-2"
										>
											{syncEquipmentsMutation.isPending && (
												<Spinner />
											)}
											{syncEquipmentsMutation.isPending
												? "Syncing"
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
										{(status.unsyncedUsersCount > 0 ||
											status.unsyncedEquipmentsCount >
												0) && (
											<span className="text-red-500 text-xs font-medium block mt-0.5">
												⚠️ Blocked: Sync users and
												equipments first
											</span>
										)}
									</div>
									<div className="flex flex-wrap items-center gap-3">
										<div className="flex items-center gap-2 text-xs">
											<span className="inline-flex items-center px-2 py-1 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200/40 font-semibold">
												{status.syncedBookingsCount}{" "}
												synced
											</span>
											<span
												className={cn(
													"inline-flex items-center px-2 py-1 rounded-md border font-semibold",
													status.unsyncedBookingsCount >
														0
														? "bg-amber-50 text-amber-700 border-amber-200/40"
														: "bg-slate-50 text-slate-400 border-slate-200/40",
												)}
											>
												{status.unsyncedBookingsCount}{" "}
												require sync
											</span>
										</div>
										<Button
											onClick={() =>
												syncBookingsMutation.mutate({})
											}
											disabled={
												isPending ||
												status.unsyncedBookingsCount ===
													0 ||
												status.unsyncedUsersCount > 0 ||
												status.unsyncedEquipmentsCount >
													0 ||
												hasUnmappedFields
											}
											className="gap-2"
										>
											{syncBookingsMutation.isPending && (
												<Spinner />
											)}
											{syncBookingsMutation.isPending
												? "Syncing"
												: "Sync"}
										</Button>
									</div>
								</div>
							</CardContent>
						</Card>
					)}

					{/* Diagnostics Log Card */}
					{diagnosticErrors.length > 0 && (
						<Card className="border-red-200 bg-red-50/25">
							<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
								<div className="space-y-1">
									<CardTitle className="text-red-950 flex items-center gap-2">
										<AlertCircle className="w-5 h-5 text-red-600" />
										Diagnostics Log (Sync Errors)
									</CardTitle>
									<CardDescription className="text-red-700">
										Detailed errors returned from the I-STEM
										API. Use this log to troubleshoot field
										mappings.
									</CardDescription>
								</div>
								<Button
									variant="ghost"
									className="text-red-700 hover:text-red-900 hover:bg-red-100 transition-colors"
									onClick={() => setDiagnosticErrors([])}
								>
									<Trash2 />
									Clear Log
								</Button>
							</CardHeader>
							<CardContent>
								<div className="max-h-60 overflow-y-auto border border-red-200 bg-white rounded-lg p-3 font-mono text-xs text-red-800 space-y-1.5">
									{diagnosticErrors.map((err, i) => (
										<div
											// biome-ignore lint/suspicious/noArrayIndexKey: diagnostics log is readonly list
											key={i}
											className="pb-1.5 border-b border-red-50 last:border-b-0 last:pb-0"
										>
											<span className="font-semibold mr-1.5">
												[{i + 1}]
											</span>
											{err}
										</div>
									))}
								</div>
							</CardContent>
						</Card>
					)}

					{/* Card 3: Mapping Configurations */}
					<Card className="border-slate-200">
						<CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 space-y-0 pb-4">
							<div className="space-y-1">
								<CardTitle>
									Field Mappings and Defaults
								</CardTitle>
								<CardDescription>
									Map I-STEM API fields to SIF dynamic fields
									or define static default values directly
									inline.
								</CardDescription>
							</div>
							<Button
								onClick={handleSaveConfig}
								disabled={
									saveConfigMutation.isPending ||
									!isConfigChanged
								}
							>
								{saveConfigMutation.isPending && <Spinner />}
								{saveConfigMutation.isPending
									? "Saving..."
									: "Save Mappings & Defaults"}
							</Button>
						</CardHeader>
						<CardContent>
							<Tabs defaultValue="users" className="w-full">
								<TabsList className="grid w-full grid-cols-3 bg-slate-100/80 p-1 rounded-lg">
									<TabsTrigger value="users">
										Users
									</TabsTrigger>
									<TabsTrigger value="equipments">
										Equipments
									</TabsTrigger>
									<TabsTrigger value="bookings">
										Bookings
									</TabsTrigger>
								</TabsList>

								{/* Users Mapping Tab */}
								<TabsContent
									value="users"
									className="space-y-4 pt-4"
								>
									<div className="grid gap-4 md:grid-cols-2">
										{USER_API_FIELDS.map((f) => (
											<div
												key={f.key}
												className="space-y-1.5 p-3 bg-white rounded-lg border border-slate-200/60 shadow-xs"
											>
												<Label className="text-sm font-semibold text-slate-800">
													{f.label}
												</Label>
												<div className="flex flex-col sm:flex-row gap-2">
													<Select
														value={
															userMapping[
																f.key
															] || "default"
														}
														onValueChange={(val) =>
															setUserMapping(
																(prev) => ({
																	...prev,
																	[f.key]:
																		val,
																}),
															)
														}
													>
														<SelectTrigger className="w-full sm:w-1/2 bg-white">
															<SelectValue placeholder="Select mapped field" />
														</SelectTrigger>
														<SelectContent>
															<SelectItem value="default">
																Unmapped
															</SelectItem>
															<SelectItem value="static">
																Use Static
																Default
															</SelectItem>
															{status.userFields.map(
																(field) => (
																	<SelectItem
																		key={
																			field.id
																		}
																		value={String(
																			field.id,
																		)}
																	>
																		{
																			field.name
																		}{" "}
																		(ID:{" "}
																		{
																			field.id
																		}
																		)
																	</SelectItem>
																),
															)}
														</SelectContent>
													</Select>
													{userMapping[f.key] ===
														"static" && (
														<Input
															type="text"
															placeholder="Enter static value"
															value={
																staticDefaults[
																	`user_${f.key}`
																] || ""
															}
															onChange={(e) =>
																setStaticDefaults(
																	(prev) => ({
																		...prev,
																		[`user_${f.key}`]:
																			e
																				.target
																				.value,
																	}),
																)
															}
															className="w-full sm:w-1/2"
														/>
													)}
												</div>
											</div>
										))}
									</div>
								</TabsContent>

								{/* Equipments Mapping Tab */}
								<TabsContent
									value="equipments"
									className="space-y-4 pt-4"
								>
									<div className="grid gap-4 md:grid-cols-2">
										{EQUIPMENT_API_FIELDS.map((f) => (
											<div
												key={f.key}
												className="space-y-1.5 p-3 bg-white rounded-lg border border-slate-200/60 shadow-xs"
											>
												<Label className="text-sm font-semibold text-slate-800">
													{f.label}
												</Label>
												<div className="flex flex-col sm:flex-row gap-2">
													<Select
														value={
															equipmentMapping[
																f.key
															] || "default"
														}
														onValueChange={(val) =>
															setEquipmentMapping(
																(prev) => ({
																	...prev,
																	[f.key]:
																		val,
																}),
															)
														}
													>
														<SelectTrigger className="w-full sm:w-1/2 bg-white">
															<SelectValue placeholder="Select mapped field" />
														</SelectTrigger>
														<SelectContent>
															<SelectItem value="default">
																Unmapped
															</SelectItem>
															<SelectItem value="static">
																Use Static
																Default
															</SelectItem>
															<SelectItem value="name">
																Name
															</SelectItem>
															<SelectItem value="code">
																Code
															</SelectItem>
															<SelectItem value="active">
																Active
															</SelectItem>
														</SelectContent>
													</Select>
													{equipmentMapping[f.key] ===
														"static" && (
														<Input
															type="text"
															placeholder="Enter static value"
															value={
																staticDefaults[
																	`equipment_${f.key}`
																] || ""
															}
															onChange={(e) =>
																setStaticDefaults(
																	(prev) => ({
																		...prev,
																		[`equipment_${f.key}`]:
																			e
																				.target
																				.value,
																	}),
																)
															}
															className="w-full sm:w-1/2"
														/>
													)}
												</div>
											</div>
										))}
									</div>
								</TabsContent>

								{/* Bookings Mapping Tab */}
								<TabsContent
									value="bookings"
									className="space-y-4 pt-4"
								>
									<div className="flex flex-col sm:flex-row sm:items-center gap-3 p-4 bg-slate-50 border border-slate-200 rounded-lg">
										<Label className="text-sm font-semibold text-slate-700 shrink-0">
											Configure Bookings Mapping For:
										</Label>
										<Select
											value={selectedEquipmentId}
											onValueChange={
												setSelectedEquipmentId
											}
										>
											<SelectTrigger className="w-full sm:w-80 bg-white">
												<SelectValue placeholder="Select an equipment" />
											</SelectTrigger>
											<SelectContent>
												{status.equipments?.map(
													(eq) => (
														<SelectItem
															key={eq.id}
															value={String(
																eq.id,
															)}
														>
															{eq.name} (Code:{" "}
															{eq.code})
														</SelectItem>
													),
												)}
											</SelectContent>
										</Select>
									</div>

									{selectedEquipmentId && (
										<div className="grid gap-4 md:grid-cols-2">
											{BOOKING_API_FIELDS.map((f) => {
												const currentBookingMapping =
													bookingMappings[
														selectedEquipmentId
													] || {};
												const selectedValue =
													currentBookingMapping[
														f.key
													] || "default";

												// Filter fields for this selected equipment:
												// entityType === "equipment" AND (entityId === selectedEquipmentId OR entityId IS NULL)
												const filteredFields =
													status.equipmentFields?.filter(
														(field) =>
															field.entityType ===
																"equipment" &&
															(field.entityId ===
																null ||
																String(
																	field.entityId,
																) ===
																	selectedEquipmentId),
													) || [];

												return (
													<div
														key={f.key}
														className="space-y-1.5 p-3 bg-white rounded-lg border border-slate-200/60 shadow-xs"
													>
														<Label className="text-sm font-semibold text-slate-800">
															{f.label}
														</Label>
														<div className="flex flex-col sm:flex-row gap-2">
															<Select
																value={
																	selectedValue
																}
																onValueChange={(
																	val,
																) => {
																	setBookingMappings(
																		(
																			prev,
																		) => {
																			const eqMap =
																				prev[
																					selectedEquipmentId
																				] ||
																				{};
																			return {
																				...prev,
																				[selectedEquipmentId]:
																					{
																						...eqMap,
																						[f.key]:
																							val,
																					},
																			};
																		},
																	);
																}}
															>
																<SelectTrigger className="w-full sm:w-1/2 bg-white">
																	<SelectValue placeholder="Select mapped field" />
																</SelectTrigger>
																<SelectContent>
																	<SelectItem value="default">
																		Unmapped
																	</SelectItem>
																	<SelectItem value="static">
																		Use
																		Static
																		Default
																	</SelectItem>
																	{filteredFields.map(
																		(
																			field,
																		) => (
																			<SelectItem
																				key={
																					field.id
																				}
																				value={String(
																					field.id,
																				)}
																			>
																				{
																					field.name
																				}{" "}
																				(ID:{" "}
																				{
																					field.id
																				}
																				)
																			</SelectItem>
																		),
																	)}
																</SelectContent>
															</Select>
															{selectedValue ===
																"static" && (
																<Input
																	type="text"
																	placeholder="Enter static value"
																	value={
																		staticDefaults[
																			`booking_${selectedEquipmentId}_${f.key}`
																		] || ""
																	}
																	onChange={(
																		e,
																	) =>
																		setStaticDefaults(
																			(
																				prev,
																			) => ({
																				...prev,
																				[`booking_${selectedEquipmentId}_${f.key}`]:
																					e
																						.target
																						.value,
																			}),
																		)
																	}
																	className="w-full sm:w-1/2"
																/>
															)}
														</div>
													</div>
												);
											})}
										</div>
									)}
								</TabsContent>
							</Tabs>
						</CardContent>
					</Card>
				</div>
			</main>
		</div>
	);
}
