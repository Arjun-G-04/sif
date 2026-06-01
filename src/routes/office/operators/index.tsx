import {
	queryOptions,
	useMutation,
	useQueryClient,
	useSuspenseQuery,
} from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { Header } from "@/components/office/header";
import { DataTable, type Column } from "@/components/general/DataTable";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { requireAdmin } from "@/lib/auth";
import {
	createOperator,
	getOperatorManagementData,
	resetOperatorPassword,
	setOperatorActive,
	updateOperatorAssignments,
} from "@/services/operator";
import { toast } from "sonner";

export const operatorsQueryOptions = queryOptions({
	queryKey: ["operators", "management"],
	queryFn: () => getOperatorManagementData(),
});

export const Route = createFileRoute("/office/operators/")({
	component: OperatorsPage,
	loader: async ({ context }) => {
		const user = await requireAdmin();
		await context.queryClient.ensureQueryData(operatorsQueryOptions);
		return user;
	},
});

function OperatorsPage() {
	const user = Route.useLoaderData();
	const managementQuery = useSuspenseQuery(operatorsQueryOptions);
	const queryClient = useQueryClient();
	const data = managementQuery.data;

	const createMutation = useMutation({
		mutationFn: createOperator,
		onSuccess: () => {
			queryClient.invalidateQueries({
				queryKey: ["operators", "management"],
			});
			toast.success("Operator created successfully");
		},
		onError: (error) => {
			toast.error(error.message || "Failed to create operator");
		},
	});

	const updateAssignmentsMutation = useMutation({
		mutationFn: updateOperatorAssignments,
		onSuccess: () => {
			queryClient.invalidateQueries({
				queryKey: ["operators", "management"],
			});
			toast.success("Assignments updated successfully");
		},
		onError: (error) => {
			toast.error(error.message || "Failed to update assignments");
		},
	});

	const resetPasswordMutation = useMutation({
		mutationFn: resetOperatorPassword,
		onSuccess: () => {
			toast.success("Operator password reset successfully");
		},
		onError: (error) => {
			toast.error(error.message || "Failed to reset password");
		},
	});

	const setActiveMutation = useMutation({
		mutationFn: setOperatorActive,
		onSuccess: (_, variables) => {
			queryClient.invalidateQueries({
				queryKey: ["operators", "management"],
			});
			toast.success(
				`Operator ${variables.data.active ? "activated" : "deactivated"} successfully`,
			);
		},
		onError: (error) => {
			toast.error(error.message || "Failed to update operator status");
		},
	});

	const columns: Column<(typeof data.operators)[0]>[] = [
		{
			header: "Username",
			accessorKey: "username",
			className: "font-semibold",
			filter: {
				type: "text",
				placeholder: "Search username",
			},
		},
		{
			header: "Status",
			accessorKey: "active",
			cell: (operator) =>
				operator.active ? (
					<span className="inline-flex items-center rounded-md bg-green-50 px-2 py-1 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-600/20">
						Active
					</span>
				) : (
					<span className="inline-flex items-center rounded-md bg-red-50 px-2 py-1 text-xs font-medium text-red-700 ring-1 ring-inset ring-red-600/20">
						Inactive
					</span>
				),
			filter: {
				type: "select",
				placeholder: "All statuses",
				options: [
					{ label: "Active", value: "true" },
					{ label: "Inactive", value: "false" },
				],
			},
		},
		{
			header: "Assignments",
			cell: (operator) => (
				<div className="flex flex-wrap gap-1 max-w-md">
					{operator.assignments.length === 0 ? (
						<span className="text-xs text-slate-500">
							No assignments
						</span>
					) : (
						operator.assignments.map((assignment) => (
							<Badge
								key={`${operator.id}-${assignment.id}`}
								variant="secondary"
							>
								{assignment.name}
								{!assignment.active && (
									<span className="ml-1 text-[10px] text-red-600">
										(Inactive)
									</span>
								)}
							</Badge>
						))
					)}
				</div>
			),
		},
		{
			header: "Actions",
			cell: (operator) => (
				<div className="flex items-center gap-2">
					<AssignmentDialog
						operator={operator}
						equipments={data.equipments}
						onSubmit={(equipmentIds) =>
							updateAssignmentsMutation.mutateAsync({
								data: {
									operatorId: operator.id,
									equipmentIds,
								},
							})
						}
						isPending={updateAssignmentsMutation.isPending}
					/>
					<ResetPasswordDialog
						onSubmit={(password) =>
							resetPasswordMutation.mutateAsync({
								data: {
									operatorId: operator.id,
									password,
								},
							})
						}
						isPending={resetPasswordMutation.isPending}
					/>
					<Button
						variant={operator.active ? "destructive" : "outline"}
						size="sm"
						onClick={() =>
							setActiveMutation.mutate({
								data: {
									operatorId: operator.id,
									active: !operator.active,
								},
							})
						}
						disabled={setActiveMutation.isPending}
					>
						{operator.active ? "Deactivate" : "Activate"}
					</Button>
				</div>
			),
		},
	];

	return (
		<div className="min-h-screen flex flex-col bg-slate-50/50">
			<Header user={user} backTo="/office" />
			<main className="flex-1 p-4 md:p-6 lg:p-8">
				<div className="w-full space-y-6">
					<div className="flex justify-between items-center">
						<div>
							<h2 className="text-2xl font-bold tracking-tight text-slate-900">
								Operators
							</h2>
							<p className="text-slate-500">
								Manage operator credentials and equipment
								assignments.
							</p>
						</div>
						<CreateOperatorDialog
							equipments={data.equipments}
							onSubmit={(payload) =>
								createMutation.mutateAsync({ data: payload })
							}
							isPending={createMutation.isPending}
						/>
					</div>

					<DataTable
						data={data.operators}
						columns={columns}
						keyExtractor={(item) => item.id}
						enableFiltering
					/>
				</div>
			</main>
		</div>
	);
}

function CreateOperatorDialog({
	equipments,
	onSubmit,
	isPending,
}: {
	equipments: Array<{ id: number; name: string; active: boolean }>;
	onSubmit: (payload: {
		username: string;
		password: string;
		equipmentIds: number[];
	}) => Promise<unknown>;
	isPending: boolean;
}) {
	const [open, setOpen] = useState(false);
	const [username, setUsername] = useState("");
	const [password, setPassword] = useState("");
	const [selectedEquipmentIds, setSelectedEquipmentIds] = useState<number[]>(
		[],
	);

	const activeEquipments = useMemo(
		() => equipments.filter((equipment) => equipment.active),
		[equipments],
	);

	const reset = () => {
		setUsername("");
		setPassword("");
		setSelectedEquipmentIds([]);
	};

	const handleSubmit = async () => {
		if (!username.trim()) {
			toast.error("Username is required");
			return;
		}
		if (password.length < 8) {
			toast.error("Password must be at least 8 characters");
			return;
		}
		if (selectedEquipmentIds.length === 0) {
			toast.error("Select at least one equipment");
			return;
		}

		try {
			await onSubmit({
				username: username.trim(),
				password,
				equipmentIds: selectedEquipmentIds,
			});
			setOpen(false);
			reset();
		} catch {
			// handled by mutation onError toast
		}
	};

	return (
		<Dialog
			open={open}
			onOpenChange={(value) => {
				setOpen(value);
				if (!value) reset();
			}}
		>
			<DialogTrigger asChild>
				<Button>
					<Plus className="h-4 w-4" />
					Create Operator
				</Button>
			</DialogTrigger>
			<DialogContent className="max-w-2xl">
				<DialogHeader>
					<DialogTitle>Create Operator</DialogTitle>
					<DialogDescription>
						Create a new operator and assign at least one active
						equipment.
					</DialogDescription>
				</DialogHeader>
				<div className="space-y-4 py-4">
					<div className="space-y-2">
						<Label>Username</Label>
						<Input
							value={username}
							onChange={(event) =>
								setUsername(event.target.value)
							}
							placeholder="Enter operator username"
						/>
					</div>
					<div className="space-y-2">
						<Label>Password</Label>
						<Input
							type="password"
							value={password}
							onChange={(event) =>
								setPassword(event.target.value)
							}
							placeholder="Minimum 8 characters"
						/>
					</div>

					<EquipmentSelector
						equipments={activeEquipments}
						selectedIds={selectedEquipmentIds}
						onToggle={(equipmentId, selected) => {
							setSelectedEquipmentIds((current) => {
								if (selected) {
									return [
										...new Set([...current, equipmentId]),
									];
								}
								return current.filter(
									(id) => id !== equipmentId,
								);
							});
						}}
					/>
				</div>
				<DialogFooter>
					<Button variant="outline" onClick={() => setOpen(false)}>
						Cancel
					</Button>
					<Button onClick={handleSubmit} disabled={isPending}>
						{isPending ? (
							<>
								<Spinner />
								Creating...
							</>
						) : (
							"Create Operator"
						)}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}

function AssignmentDialog({
	operator,
	equipments,
	onSubmit,
	isPending,
}: {
	operator: {
		id: number;
		username: string;
		assignments: Array<{ id: number; name: string; active: boolean }>;
	};
	equipments: Array<{ id: number; name: string; active: boolean }>;
	onSubmit: (equipmentIds: number[]) => Promise<unknown>;
	isPending: boolean;
}) {
	const [open, setOpen] = useState(false);
	const [selectedIds, setSelectedIds] = useState<number[]>([]);

	const activeEquipments = useMemo(
		() => equipments.filter((equipment) => equipment.active),
		[equipments],
	);

	const initialize = () => {
		const activeAssignedIds = operator.assignments
			.filter((assignment) => assignment.active)
			.map((assignment) => assignment.id);
		setSelectedIds(activeAssignedIds);
	};

	const handleSubmit = async () => {
		if (selectedIds.length === 0) {
			toast.error("Select at least one equipment");
			return;
		}
		try {
			await onSubmit(selectedIds);
			setOpen(false);
		} catch {
			// handled by mutation onError toast
		}
	};

	return (
		<Dialog
			open={open}
			onOpenChange={(value) => {
				setOpen(value);
				if (value) {
					initialize();
				}
			}}
		>
			<DialogTrigger asChild>
				<Button variant="outline" size="sm">
					Assignments
				</Button>
			</DialogTrigger>
			<DialogContent className="max-w-2xl">
				<DialogHeader>
					<DialogTitle>Update Assignments</DialogTitle>
					<DialogDescription>
						Set active equipment assignments for {operator.username}
						.
					</DialogDescription>
				</DialogHeader>
				<div className="space-y-4 py-4">
					<EquipmentSelector
						equipments={activeEquipments}
						selectedIds={selectedIds}
						onToggle={(equipmentId, selected) => {
							setSelectedIds((current) => {
								if (selected) {
									return [
										...new Set([...current, equipmentId]),
									];
								}
								return current.filter(
									(id) => id !== equipmentId,
								);
							});
						}}
					/>
				</div>
				<DialogFooter>
					<Button variant="outline" onClick={() => setOpen(false)}>
						Cancel
					</Button>
					<Button onClick={handleSubmit} disabled={isPending}>
						{isPending ? (
							<>
								<Spinner />
								Saving...
							</>
						) : (
							"Save Assignments"
						)}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}

function ResetPasswordDialog({
	onSubmit,
	isPending,
}: {
	onSubmit: (password: string) => Promise<unknown>;
	isPending: boolean;
}) {
	const [open, setOpen] = useState(false);
	const [password, setPassword] = useState("");

	const handleSubmit = async () => {
		if (password.length < 8) {
			toast.error("Password must be at least 8 characters");
			return;
		}
		try {
			await onSubmit(password);
			setPassword("");
			setOpen(false);
		} catch {
			// handled by mutation onError toast
		}
	};

	return (
		<Dialog
			open={open}
			onOpenChange={(value) => {
				setOpen(value);
				if (!value) {
					setPassword("");
				}
			}}
		>
			<DialogTrigger asChild>
				<Button variant="outline" size="sm">
					Reset Password
				</Button>
			</DialogTrigger>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Reset Operator Password</DialogTitle>
					<DialogDescription>
						Set a new password for this operator.
					</DialogDescription>
				</DialogHeader>
				<div className="space-y-2 py-4">
					<Label>New Password</Label>
					<Input
						type="password"
						value={password}
						onChange={(event) => setPassword(event.target.value)}
						placeholder="Minimum 8 characters"
					/>
				</div>
				<DialogFooter>
					<Button variant="outline" onClick={() => setOpen(false)}>
						Cancel
					</Button>
					<Button onClick={handleSubmit} disabled={isPending}>
						{isPending ? (
							<>
								<Spinner />
								Saving...
							</>
						) : (
							"Reset Password"
						)}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}

function EquipmentSelector({
	equipments,
	selectedIds,
	onToggle,
}: {
	equipments: Array<{ id: number; name: string; active: boolean }>;
	selectedIds: number[];
	onToggle: (equipmentId: number, selected: boolean) => void;
}) {
	const [search, setSearch] = useState("");
	const filtered = useMemo(() => {
		const query = search.trim().toLowerCase();
		if (!query) return equipments;
		return equipments.filter((equipment) =>
			equipment.name.toLowerCase().includes(query),
		);
	}, [equipments, search]);

	return (
		<div className="space-y-3">
			<div className="flex items-center justify-between">
				<Label>Assigned Equipments</Label>
				<span className="text-xs text-slate-500">
					{selectedIds.length} selected
				</span>
			</div>
			<Input
				value={search}
				onChange={(event) => setSearch(event.target.value)}
				placeholder="Search equipments"
			/>
			<div className="max-h-72 overflow-auto rounded-md border p-3 space-y-2">
				{filtered.length === 0 && (
					<p className="text-sm text-slate-500">
						No equipments found.
					</p>
				)}
				{filtered.map((equipment) => {
					const checked = selectedIds.includes(equipment.id);
					return (
						<div
							key={equipment.id}
							className="flex items-center gap-3 rounded-md px-2 py-1.5 hover:bg-slate-50"
						>
							<Checkbox
								checked={checked}
								onCheckedChange={(nextChecked) =>
									onToggle(equipment.id, Boolean(nextChecked))
								}
							/>
							<span className="text-sm text-slate-700">
								{equipment.name}
							</span>
						</div>
					);
				})}
			</div>
		</div>
	);
}
