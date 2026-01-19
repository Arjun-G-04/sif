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
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
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

	if (equipments.length === 0) {
		return (
			<div className="py-12 text-center border-2 border-dashed rounded-xl">
				<p className="text-gray-400 italic">
					No equipments defined yet.
				</p>
			</div>
		);
	}

	return (
		<div className="border rounded-lg bg-white overflow-hidden">
			<Table>
				<TableHeader>
					<TableRow className="bg-gray-50/50">
						<TableHead>Name</TableHead>
						<TableHead>Code</TableHead>
						<TableHead>Active</TableHead>
						<TableHead className="w-[100px] text-center">
							Fields
						</TableHead>
						<TableHead className="w-[100px] text-center">
							Edit
						</TableHead>
						<TableHead className="w-[100px] text-center">
							Remove
						</TableHead>
					</TableRow>
				</TableHeader>
				<TableBody>
					{equipments.map((eq) => (
						<TableRow key={eq.id}>
							<TableCell className="font-semibold text-gray-900">
								{eq.name}
							</TableCell>
							<TableCell>
								<Badge
									variant="secondary"
									className="font-mono"
								>
									{eq.code}
								</Badge>
							</TableCell>
							<TableCell>
								{eq.active ? (
									<span className="inline-flex items-center rounded-md bg-green-50 px-2 py-1 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-600/20">
										Active
									</span>
								) : (
									<span className="inline-flex items-center rounded-md bg-red-50 px-2 py-1 text-xs font-medium text-red-700 ring-1 ring-inset ring-red-600/20">
										Inactive
									</span>
								)}
							</TableCell>
							<TableCell className="text-center">
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
							</TableCell>
							<TableCell className="text-center">
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
							</TableCell>
							<TableCell className="text-center">
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
													Existing data linked to this
													equipment won't be affected
													but the equipment will be
													marked as inactive.
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
							</TableCell>
						</TableRow>
					))}
				</TableBody>
			</Table>
		</div>
	);
}
