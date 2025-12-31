import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2 } from "lucide-react";
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
import { type entityType as entityTypeDef, fieldType } from "@/db/schema";
import { createField, type Field, updateField } from "@/services/field";

const fieldTypeEnum = fieldType.enumValues;
type FieldType = (typeof fieldTypeEnum)[number];

interface FieldDialogProps {
	entityType: (typeof entityTypeDef.enumValues)[number];
	field?: Field;
	trigger?: React.ReactNode;
}

export function FieldDialog({ entityType, field, trigger }: FieldDialogProps) {
	const isEdit = !!field;
	const [open, setOpen] = useState(false);
	const [name, setName] = useState(field?.name || "");
	const [type, setType] = useState<FieldType>(field?.type || "text");
	const [order, setOrder] = useState(field?.order || 0);
	const [options, setOptions] = useState<{ id: string; value: string }[]>(
		field?.type === "single_select" && field.options
			? field.options.map((o) => ({
					id: String(o.id),
					value: o.value,
				}))
			: [],
	);

	const resetForm = useCallback(() => {
		setName("");
		setType("text");
		setOrder(0);
		setOptions([]);
	}, []);

	useEffect(() => {
		if (open) {
			if (field) {
				setName(field.name);
				setType(field.type);
				setOrder(field.order);
				setOptions(
					field.type === "single_select" && field.options
						? field.options.map((o) => ({
								id: String(o.id),
								value: o.value,
							}))
						: [],
				);
			} else {
				resetForm();
			}
		}
	}, [open, field, resetForm]);

	const nameId = useId();
	const orderId = useId();

	const queryClient = useQueryClient();

	const createMutation = useMutation({
		mutationFn: () =>
			createField({
				data: {
					name,
					type,
					order,
					entityType,
					options:
						type === "single_select"
							? options.map((o) => o.value)
							: undefined,
				},
			}),
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
		mutationFn: () => {
			if (!field) throw new Error("Field is missing");
			return updateField({
				data: {
					id: field.id,
					name,
					type,
					order,
					options:
						type === "single_select"
							? options.map((o) => o.value)
							: undefined,
				},
			});
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["fields", entityType] });
			toast.success("Field updated successfully");
			setOpen(false);
		},
		onError: (error) => {
			toast.error(error.message || "Failed to update field");
		},
	});

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

	function handleSubmit() {
		if (!name.trim()) {
			toast.error("Field name is required");
			return;
		}
		if (isEdit) {
			updateMutation.mutate();
		} else {
			createMutation.mutate();
		}
	}

	const isPending = createMutation.isPending || updateMutation.isPending;

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
						<Plus className="mr-2 h-4 w-4" />
						Add Field
					</Button>
				)}
			</DialogTrigger>
			<DialogContent className="sm:max-w-[425px]">
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
						<Label htmlFor={nameId}>Field Name</Label>
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
								{fieldTypeEnum.map((t) => (
									<SelectItem key={t} value={t}>
										<span className="capitalize">
											{t.replace("_", " ")}
										</span>
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>
					<div className="space-y-2">
						<Label htmlFor={orderId}>Display Order</Label>
						<Input
							id={orderId}
							type="number"
							value={order}
							onChange={(e) => setOrder(Number(e.target.value))}
						/>
					</div>

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
