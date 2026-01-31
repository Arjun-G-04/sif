import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, Upload } from "lucide-react";
import { useCallback, useEffect, useId, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
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
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import {
	type entityType as entityTypeDef,
	type fieldStage,
	fieldType,
} from "@/db/schema";
import {
	createField,
	type Field,
	getFields,
	getRelationFields,
	updateField,
	uploadAdminFile,
} from "@/services/field";
import type { AllowedRelation } from "./fieldsView";

const fieldTypeEnum = fieldType.enumValues;
type FieldType = (typeof fieldTypeEnum)[number];

interface FieldDialogProps {
	entityType: (typeof entityTypeDef.enumValues)[number];
	entityId?: number;
	field?: Field;
	stage?: (typeof fieldStage.enumValues)[number];
	trigger?: React.ReactNode;
	allowedRelations?: AllowedRelation;
}

export function FieldDialog({
	entityType,
	entityId,
	field,
	stage: initialStage = "initial",
	trigger,
	allowedRelations = [],
}: FieldDialogProps) {
	const isEdit = !!field;
	const [open, setOpen] = useState(false);
	const [name, setName] = useState(field?.name || "");
	const [type, setType] = useState<FieldType>(field?.type || "text");
	const [order, setOrder] = useState(field?.order || 0);
	const [stage, setStage] = useState(field?.stage || initialStage);
	const [options, setOptions] = useState<{ id: string; value: string }[]>(
		field?.type === "single_select" && field.options
			? field.options.map((o) => ({
					id: String(o.id),
					value: o.value,
				}))
			: [],
	);
	const [parentId, setParentId] = useState<string>(
		field?.parentId ? String(field.parentId) : "none",
	);
	const [groupMax, setGroupMax] = useState(
		field?.type === "group" && field.groupConfig
			? field.groupConfig.max
			: 1,
	);
	const [adminFileConfig, setAdminFileConfig] = useState<{
		filePath: string;
		originalName: string;
	} | null>(
		field?.type === "admin_file" && field.adminFileConfig
			? field.adminFileConfig
			: null,
	);
	const [isUploading, setIsUploading] = useState(false);
	const [relatedEntityType, setRelatedEntityType] = useState<string>(
		field?.type === "relation" ? field.relation.relatedEntityType : "",
	);
	const [relatedFieldId, setRelatedFieldId] = useState<string>(
		field?.type === "relation" ? String(field.relation.relatedFieldId) : "",
	);

	const [pendingFile, setPendingFile] = useState<File | null>(null);
	const nameId = useId();
	const orderId = useId();
	const queryClient = useQueryClient();

	const resetForm = useCallback(() => {
		setName("");
		setType("text");
		setOrder(0);
		setOptions([]);
		setParentId("none");
		setGroupMax(1);
		setAdminFileConfig(null);
		setPendingFile(null);
		setStage(initialStage);
		setRelatedEntityType("");
		setRelatedFieldId("");
	}, [initialStage]);

	useEffect(() => {
		if (open) {
			if (field) {
				setName(field.name);
				setType(field.type);
				setOrder(field.order);
				setStage(field.stage || "initial");
				setParentId(field.parentId ? String(field.parentId) : "none");
				if (field.type === "single_select" && field.options) {
					setOptions(
						field.options.map((o) => ({
							id: String(o.id),
							value: o.value,
						})),
					);
				} else {
					setOptions([]);
				}
				if (field.type === "relation") {
					setRelatedEntityType(field.relation.relatedEntityType);
					setRelatedFieldId(String(field.relation.relatedFieldId));
				}
				if (field.type === "group" && field.groupConfig) {
					setGroupMax(field.groupConfig.max);
				}
				if (field.type === "admin_file" && field.adminFileConfig) {
					setAdminFileConfig(field.adminFileConfig);
				}
			} else {
				resetForm();
			}
		}
	}, [open, field, resetForm]);

	// For field of "relation" type, we must fetch all available fields of the related entity type
	// so that the user can select which particular field this is related to.
	const { data: availableRelationFields } = useQuery({
		queryKey: ["relationFields", relatedEntityType],
		queryFn: () =>
			getRelationFields({
				data: {
					entityType:
						relatedEntityType as (typeof entityTypeDef.enumValues)[number],
				},
			}),
		enabled: !!relatedEntityType && type === "relation",
	});

	// Fetch all fields so that if there is one or more group type fields, we can show the option of setting the parent for this field.
	const { data: allFields } = useQuery({
		queryKey: ["fields", entityType, entityId ?? "global", initialStage],
		queryFn: () =>
			getFields({ data: { entityType, entityId, stage: initialStage } }),
		enabled: open,
	});

	const groupFields = allFields?.filter(
		(f) => f.type === "group" && f.id !== field?.id, // Prevent self-parenting
	);

	const createMutation = useMutation({
		mutationFn: createField,
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["fields", entityType] });
			toast.success("Field created successfully");
			setOpen(false);
			resetForm();
		},
		onError: (error) => {
			toast.error(error.message || "Failed to create field");
		},
	});

	const updateMutation = useMutation({
		mutationFn: updateField,
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["fields", entityType] });
			toast.success("Field updated successfully");
			setOpen(false);
		},
		onError: (error) => {
			toast.error(error.message || "Failed to update field");
		},
	});

	const uploadMutation = useMutation({
		mutationFn: uploadAdminFile,
	});

	function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
		const file = e.target.files?.[0];
		if (!file) return;
		setPendingFile(file);
	}

	function handleAddOption() {
		setOptions([...options, { id: crypto.randomUUID(), value: "" }]);
	}

	function handleOptionChange(index: number, value: string) {
		const newOptions = [...options];
		newOptions[index].value = value;
		setOptions(newOptions);
	}

	function handleRemoveOption(index: number) {
		setOptions(options.filter((_, i) => i !== index));
	}

	async function handleSubmit() {
		if (!name.trim()) {
			toast.error("Field name is required");
			return;
		}
		if (type === "relation") {
			if (!relatedEntityType) {
				toast.error("Please select a related entity type");
				return;
			}
			if (!relatedFieldId) {
				toast.error("Please select a related field");
				return;
			}
		}
		if (type === "admin_file") {
			if (!adminFileConfig && !pendingFile) {
				toast.error("Please upload a file");
				return;
			}
		}

		let finalAdminFileConfig = adminFileConfig;
		if (type === "admin_file") {
			setIsUploading(true);
			if (pendingFile) {
				const formData = new FormData();
				formData.append("file", pendingFile);
				try {
					finalAdminFileConfig = await uploadMutation.mutateAsync({
						data: formData,
					});
				} catch (err) {
					toast.error("Upload failed");
					console.error(err);
					setIsUploading(false);
					return;
				}
			}
			setIsUploading(false);

			if (!finalAdminFileConfig) {
				toast.error("Please upload a file");
				return;
			}
		}

		const fieldData = {
			name,
			type,
			order,
			stage,
			options:
				type === "single_select"
					? options.map((o) => o.value)
					: undefined,
			relation:
				type === "relation"
					? {
							relatedEntityType:
								relatedEntityType as (typeof entityTypeDef.enumValues)[number],
							relatedFieldId: Number(relatedFieldId),
						}
					: undefined,
			groupConfig: type === "group" ? { max: groupMax } : undefined,
			adminFileConfig:
				type === "admin_file"
					? finalAdminFileConfig || undefined
					: undefined,
		};

		if (isEdit) {
			if (!field) return;
			updateMutation.mutate({
				data: {
					id: field.id,
					...fieldData,
				},
			});
		} else {
			createMutation.mutate({
				data: {
					entityType,
					entityId,
					parentId:
						parentId !== "none" ? Number(parentId) : undefined,
					...fieldData,
				},
			});
		}
	}

	const isPending =
		createMutation.isPending || updateMutation.isPending || isUploading;

	return (
		<Dialog
			open={open}
			onOpenChange={(val) => {
				setOpen(val);
				if (!val && !isEdit) resetForm();
			}}
		>
			<DialogTrigger asChild>
				{trigger ? (
					trigger
				) : (
					<Button>
						<Plus className="h-4 w-4" />
						Add Field
					</Button>
				)}
			</DialogTrigger>
			<DialogContent className="sm:max-w-[425px] max-h-[90vh] overflow-y-auto">
				<DialogHeader>
					<DialogTitle>
						{isEdit ? "Edit Field" : "Add New Field"}
					</DialogTitle>
					<DialogDescription>
						{isEdit
							? "Modify existing field details."
							: `Create a new custom field for ${entityType}.`}
					</DialogDescription>
				</DialogHeader>
				<div className="space-y-4 py-4">
					<div className="space-y-2">
						<Label htmlFor={nameId}>
							Field Name / Heading Text
						</Label>
						<Input
							id={nameId}
							placeholder="e.g. Date of Birth"
							value={name}
							onChange={(e) => setName(e.target.value)}
						/>
					</div>
					<div className="space-y-2">
						<Label>Field Type</Label>
						<Select
							value={type}
							onValueChange={(val: FieldType) => setType(val)}
						>
							<SelectTrigger>
								<SelectValue placeholder="Select a field type" />
							</SelectTrigger>
							<SelectContent>
								{fieldTypeEnum
									.filter((t) =>
										t === "relation"
											? allowedRelations.length > 0
											: true,
									)
									.map((t) => (
										<SelectItem key={t} value={t}>
											<span className="capitalize">
												{t.replace("_", " ")}
											</span>
										</SelectItem>
									))}
							</SelectContent>
						</Select>
					</div>

					{!isEdit && groupFields && groupFields.length > 0 && (
						<div className="space-y-2">
							<Label>Parent Group (Optional)</Label>
							<Select
								value={parentId}
								onValueChange={setParentId}
							>
								<SelectTrigger>
									<SelectValue placeholder="None (Top Level)" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="none">
										None (Top Level)
									</SelectItem>
									{groupFields.map((g) => (
										<SelectItem
											key={g.id}
											value={String(g.id)}
										>
											{g.name}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
					)}
					<div className="space-y-2">
						<Label htmlFor={orderId}>Display Order</Label>
						<Input
							id={orderId}
							type="number"
							value={order}
							onChange={(e) => setOrder(Number(e.target.value))}
						/>
					</div>
					{type === "group" && (
						<div className="space-y-2">
							<Label>Max Iterations</Label>
							<Input
								type="number"
								min={1}
								value={groupMax}
								onChange={(e) =>
									setGroupMax(
										Math.max(1, Number(e.target.value)),
									)
								}
							/>
							<p className="text-xs text-muted-foreground">
								How many times can the user repeat this group of
								fields?
							</p>
						</div>
					)}
					{type === "admin_file" && (
						<div className="space-y-2">
							<Label>Select File</Label>
							<div className="flex items-center gap-2">
								<Input
									type="file"
									onChange={handleFileSelect}
									disabled={isPending}
								/>
							</div>
							{pendingFile ? (
								<div className="text-sm text-blue-600 flex items-center gap-1 mt-1">
									<Upload className="h-3 w-3" />
									Selected: {pendingFile.name}
								</div>
							) : adminFileConfig ? (
								<div className="text-sm text-green-600 flex items-center gap-1 mt-1">
									<Upload className="h-3 w-3" />
									Current: {adminFileConfig.originalName}
								</div>
							) : null}
						</div>
					)}
					{type === "single_select" && (
						<div className="space-y-2">
							<Label>Options</Label>
							{options.map((opt, index) => (
								<div key={opt.id} className="flex gap-2">
									<Input
										placeholder={`Option ${index + 1}`}
										value={opt.value}
										onChange={(e) =>
											handleOptionChange(
												index,
												e.target.value,
											)
										}
									/>
									<Button
										variant="ghost"
										size="icon"
										onClick={() =>
											handleRemoveOption(index)
										}
									>
										<Trash2 className="h-4 w-4 text-destructive" />
									</Button>
								</div>
							))}
							<Button
								variant="outline"
								size="sm"
								className="mt-2"
								onClick={handleAddOption}
							>
								<Plus className="mr-2 h-4 w-4" />
								Add Option
							</Button>
						</div>
					)}
					{type === "relation" && (
						<div className="space-y-4">
							<div className="space-y-2">
								<Label>Related Entity To Link</Label>
								{allowedRelations.length > 0 ? (
									<Select
										value={relatedEntityType}
										onValueChange={setRelatedEntityType}
									>
										<SelectTrigger>
											<SelectValue placeholder="Select Entity Type" />
										</SelectTrigger>
										<SelectContent>
											{allowedRelations.map((rel) => (
												<SelectItem
													key={rel.entityType}
													value={rel.entityType}
												>
													{rel.label}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								) : (
									<div className="text-sm text-amber-600 bg-amber-50 p-2 rounded">
										No allowed relations configured for this
										entity type.
									</div>
								)}
							</div>
							{relatedEntityType && (
								<div className="space-y-2">
									<Label>Related Field (to display)</Label>
									<Select
										value={relatedFieldId}
										onValueChange={setRelatedFieldId}
									>
										<SelectTrigger>
											<SelectValue placeholder="Select Field" />
										</SelectTrigger>
										<SelectContent>
											{availableRelationFields?.map(
												(f) => (
													<SelectItem
														key={f.id}
														value={String(f.id)}
													>
														{f.name} (
														{f.type.replace(
															"_",
															" ",
														)}
														)
													</SelectItem>
												),
											)}
										</SelectContent>
									</Select>
									<div className="text-xs text-muted-foreground">
										Select which field from the{" "}
										{relatedEntityType} you want to use as
										the reference.
									</div>
								</div>
							)}
						</div>
					)}
				</div>
				<DialogFooter>
					<Button onClick={handleSubmit} disabled={isPending}>
						{isPending ? (
							<>
								<Spinner />
								{isEdit ? "Saving..." : "Creating..."}
							</>
						) : isEdit ? (
							"Save Changes"
						) : (
							"Create Field"
						)}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
