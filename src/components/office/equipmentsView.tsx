import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Pencil, RotateCcw, Settings2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable, type Column } from "@/components/general/DataTable";

import { type Equipment, toggleEquipmentActive } from "@/services/equipment";
import { EquipmentDialog } from "./equipmentDialog";

interface EquipmentsViewProps {
	equipments: Equipment[];
}

export function EquipmentsView({ equipments }: EquipmentsViewProps) {
	const queryClient = useQueryClient();

	const toggleMutation = useMutation({
		mutationFn: ({ id, active }: { id: number; active: boolean }) =>
			toggleEquipmentActive({ data: { id, active } }),
		onSuccess: (_, variables) => {
			queryClient.invalidateQueries({ queryKey: ["equipments"] });
			toast.success(
				`Equipment ${variables.active ? "restored" : "removed"} successfully`,
			);
		},
		onError: (error) => {
			toast.error(error.message || "Failed to update equipment status");
		},
	});

	const columns: Column<Equipment>[] = [
		{
			header: "Name",
			accessorKey: "name",
			cell: (eq) => (
				<span className="font-semibold text-gray-900">{eq.name}</span>
			),
		},
		{
			header: "Code",
			accessorKey: "code",
			cell: (eq) => (
				<Badge variant="secondary" className="font-mono">
					{eq.code}
				</Badge>
			),
		},
		{
			header: "Active",
			accessorKey: "active",
			cell: (eq) =>
				eq.active ? (
					<span className="inline-flex items-center rounded-md bg-green-50 px-2 py-1 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-600/20">
						Active
					</span>
				) : (
					<span className="inline-flex items-center rounded-md bg-red-50 px-2 py-1 text-xs font-medium text-red-700 ring-1 ring-inset ring-red-600/20">
						Inactive
					</span>
				),
		},
		{
			header: "Fields",
			className: "w-[100px] text-center",
			cell: (eq) => (
				<div className="text-center">
					<Button
						variant="ghost"
						size="sm"
						className="h-8 w-8 p-0"
						asChild
					>
						<Link
							to="/office/equipment/edit/$eqId"
							params={{ eqId: String(eq.id) }}
						>
							<Settings2 className="h-4 w-4 text-slate-500" />
						</Link>
					</Button>
				</div>
			),
		},
		{
			header: "Edit",
			className: "w-[100px] text-center",
			cell: (eq) => (
				<div className="text-center">
					<EquipmentDialog
						equipment={eq}
						trigger={
							<Button
								variant="ghost"
								size="sm"
								className="h-8 w-8 p-0"
							>
								<Pencil className="h-4 w-4 text-slate-500" />
							</Button>
						}
					/>
				</div>
			),
		},
		{
			header: "Remove",
			className: "w-[100px] text-center",
			cell: (eq) => (
				<div className="text-center">
					{eq.active ? (
						<AlertDialog>
							<AlertDialogTrigger asChild>
								<Button
									variant="ghost"
									size="sm"
									className="h-8 w-8 p-0 hover:text-red-600 hover:bg-red-50"
								>
									<Trash2 className="h-4 w-4" />
								</Button>
							</AlertDialogTrigger>
							<AlertDialogContent>
								<AlertDialogHeader>
									<AlertDialogTitle>
										Remove Equipment?
									</AlertDialogTitle>
									<AlertDialogDescription>
										Existing data linked to this equipment
										won't be affected but the equipment will
										be marked as inactive.
									</AlertDialogDescription>
								</AlertDialogHeader>
								<AlertDialogFooter>
									<AlertDialogCancel>
										Cancel
									</AlertDialogCancel>
									<AlertDialogAction
										className="bg-red-600 hover:bg-red-700"
										onClick={() =>
											toggleMutation.mutate({
												id: eq.id,
												active: false,
											})
										}
									>
										Remove
									</AlertDialogAction>
								</AlertDialogFooter>
							</AlertDialogContent>
						</AlertDialog>
					) : (
						<Button
							variant="ghost"
							size="sm"
							className="h-8 w-8 p-0 hover:text-green-600 hover:bg-green-50"
							onClick={() =>
								toggleMutation.mutate({
									id: eq.id,
									active: true,
								})
							}
						>
							<RotateCcw className="h-4 w-4" />
							<span className="sr-only">Restore</span>
						</Button>
					)}
				</div>
			),
		},
	];

	return (
		<DataTable
			data={equipments}
			columns={columns}
			keyExtractor={(item) => item.id}
		/>
	);
}
