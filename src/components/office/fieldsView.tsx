import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Pencil, RotateCcw, Trash2 } from "lucide-react";
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
import type { Field } from "@/services/field";
import { toggleFieldActive } from "@/services/field";
import { FieldDialog } from "./fieldDialog";

interface FieldsViewProps {
	fields: Field[];
}

export function FieldsView({ fields }: FieldsViewProps) {
	const queryClient = useQueryClient();

	const toggleMutation = useMutation({
		mutationFn: ({ id, active }: { id: number; active: boolean }) =>
			toggleFieldActive({ data: { id, active } }),
		onSuccess: (_, variables) => {
			queryClient.invalidateQueries({ queryKey: ["fields"] });
			toast.success(
				`Field ${variables.active ? "restored" : "removed"} successfully`,
			);
		},
		onError: (error) => {
			toast.error(error.message || "Failed to update field status");
		},
	});

	if (fields.length === 0) {
		return (
			<div className="py-12 text-center border-2 border-dashed rounded-xl">
				<p className="text-gray-400 italic">
					No custom fields defined yet.
				</p>
			</div>
		);
	}

	return (
		<div className="border rounded-lg bg-white overflow-hidden">
			<Table>
				<TableHeader>
					<TableRow className="bg-gray-50/50">
						<TableHead className="w-[80px]">Order</TableHead>
						<TableHead>Field Name</TableHead>
						<TableHead>Type</TableHead>
						<TableHead>Options</TableHead>
						<TableHead>Active</TableHead>
						<TableHead className="w-[100px]">Edit</TableHead>
						<TableHead className="w-[100px]">Remove</TableHead>
					</TableRow>
				</TableHeader>
				<TableBody>
					{fields.map((f) => (
						<TableRow key={f.id}>
							<TableCell className="font-medium text-gray-500">
								{f.order}
							</TableCell>
							<TableCell className="font-semibold text-gray-900">
								{f.name}
							</TableCell>
							<TableCell>
								<Badge
									variant="secondary"
									className="capitalize"
								>
									{f.type.replace("_", " ")}
								</Badge>
							</TableCell>
							<TableCell>
								{f.type === "single_select" &&
								f.options &&
								f.options.length > 0 ? (
									<div className="flex flex-wrap gap-1">
										{f.options.map((opt) => (
											<Badge
												key={opt.id}
												variant="outline"
												className="text-[10px] py-0 px-2 font-normal text-gray-600 bg-gray-50/50"
											>
												{opt.value}
											</Badge>
										))}
									</div>
								) : (
									<span className="text-xs text-gray-400 italic">
										N/A
									</span>
								)}
							</TableCell>
							<TableCell>
								{f.active ? (
									<span className="inline-flex items-center rounded-md bg-green-50 px-2 py-1 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-600/20">
										Active
									</span>
								) : (
									<span className="inline-flex items-center rounded-md bg-red-50 px-2 py-1 text-xs font-medium text-red-700 ring-1 ring-inset ring-red-600/20">
										Inactive
									</span>
								)}
							</TableCell>
							<TableCell>
								<FieldDialog
									entityType={f.entityType}
									field={f}
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
							<TableCell>
								{f.active ? (
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
													Remove Field?
												</AlertDialogTitle>
												<AlertDialogDescription>
													Existing collected data
													won't be affected but in
													future users won't be shown
													this field anymore.
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
															id: f.id,
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
												id: f.id,
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
