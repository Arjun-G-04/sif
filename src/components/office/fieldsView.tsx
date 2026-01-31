import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Pencil, RotateCcw, Trash2, Paperclip } from "lucide-react";
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
import { Fragment } from "react";
import type { entityType as entityTypeDef, fieldStage } from "@/db/schema";

export type AllowedRelation = {
	entityType: (typeof entityTypeDef.enumValues)[number];
	label: string;
}[];

interface FieldsViewProps {
	fields: Field[];
	allowedRelations?: AllowedRelation;
	stage?: (typeof fieldStage.enumValues)[number];
}

export function FieldsView({
	fields,
	allowedRelations,
	stage,
}: FieldsViewProps) {
	const queryClient = useQueryClient();

	const filteredFields = stage
		? fields.filter((f) => f.stage === stage)
		: fields;

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

	// Helper to render a field row, potentially with indentation
	const renderFieldRow = (field: Field, depth = 0) => {
		return (
			<TableRow
				key={field.id}
				className={depth > 0 ? "bg-slate-50/50" : ""}
			>
				<TableCell className="font-medium text-gray-500">
					<div className="flex items-center">
						{depth > 0 && (
							<div
								className="w-4 border-l border-b border-gray-300 h-4 mr-2"
								style={{ marginLeft: `${(depth - 1) * 16}px` }}
							/>
						)}
						{field.order}
					</div>
				</TableCell>
				<TableCell className="font-semibold text-gray-900">
					{field.name}
				</TableCell>
				<TableCell>
					<Badge variant="secondary" className="capitalize">
						{field.type.replace("_", " ")}
					</Badge>
				</TableCell>
				<TableCell>
					{field.type === "single_select" &&
					field.options &&
					field.options.length > 0 ? (
						<div className="flex flex-wrap gap-1">
							{field.options.map((opt) => (
								<Badge
									key={opt.id}
									variant="outline"
									className="text-[10px] py-0 px-2 font-normal text-gray-600 bg-gray-50/50"
								>
									{opt.value}
								</Badge>
							))}
						</div>
					) : field.type === "relation" && field.relation ? (
						<div className="flex flex-col gap-1">
							<Badge
								variant="outline"
								className="w-fit text-[10px] py-0 px-2 font-normal text-blue-600 bg-blue-50/50 border-blue-200"
							>
								Related to: {field.relation.relatedEntityType}
							</Badge>
						</div>
					) : field.type === "group" && field.groupConfig ? (
						<Badge
							variant="outline"
							className="text-[10px] py-0 px-2 font-normal text-purple-600 bg-purple-50/50 border-purple-200"
						>
							Max Iterations: {field.groupConfig.max}
						</Badge>
					) : field.type === "heading" ? (
						<span className="text-xs text-gray-400 italic">
							N/A
						</span>
					) : field.type === "admin_file" && field.adminFileConfig ? (
						<div className="flex items-center gap-1 text-xs text-gray-600">
							<Paperclip className="h-3 w-3" />
							{field.adminFileConfig.originalName}
						</div>
					) : (
						<span className="text-xs text-gray-400 italic">
							N/A
						</span>
					)}
				</TableCell>
				<TableCell>
					{field.active ? (
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
					<FieldDialog
						entityType={field.entityType}
						field={field}
						stage={stage}
						allowedRelations={allowedRelations}
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
					{field.active ? (
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
										Existing collected data won't be
										affected but in future users won't be
										shown this field anymore.
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
												id: field.id,
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
									id: field.id,
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
		);
	};

	// Recursive rendering function
	const renderFields = (fieldList: Field[], depth = 0): React.ReactNode => {
		return fieldList.map((field) => (
			<Fragment key={field.id}>
				{renderFieldRow(field, depth)}
				{field.children &&
					field.children.length > 0 &&
					renderFields(field.children, depth + 1)}
			</Fragment>
		));
	};

	return (
		<div className="border rounded-lg bg-white overflow-hidden">
			<Table>
				<TableHeader>
					<TableRow className="bg-gray-50/50">
						<TableHead className="w-[80px]">Order</TableHead>
						<TableHead>Field Name</TableHead>
						<TableHead>Type</TableHead>
						<TableHead>Options / Config</TableHead>
						<TableHead>Active</TableHead>
						<TableHead className="w-[50px] text-center">
							Edit
						</TableHead>
						<TableHead className="w-[50px] text-center">
							Remove
						</TableHead>
					</TableRow>
				</TableHeader>
				<TableBody>{renderFields(filteredFields)}</TableBody>
			</Table>
		</div>
	);
}
