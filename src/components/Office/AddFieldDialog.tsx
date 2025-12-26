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
import { type entityType as entityTypeDef, fieldType } from "@/db/schema";
import { createField } from "@/services/field";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2 } from "lucide-react";
import { useId, useState } from "react";
import { toast } from "sonner";
import { Spinner } from "@/components/ui/spinner";

const fieldTypeEnum = fieldType.enumValues;
type FieldType = (typeof fieldTypeEnum)[number];

export function AddFieldDialog({
	entityType,
}: {
	entityType: (typeof entityTypeDef.enumValues)[number];
}) {
	const [open, setOpen] = useState(false);
	const [name, setName] = useState("");
	const [type, setType] = useState<FieldType>("text");
	const [order, setOrder] = useState(0);
	const [options, setOptions] = useState<string[]>([]);

	const queryClient = useQueryClient();

	const mutation = useMutation({
		mutationFn: () =>
			createField({
				data: {
					name,
					type,
					order,
					entityType,
					options: type === "single_select" ? options : undefined,
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

	function resetForm() {
		setName("");
		setType("text");
		setOrder(0);
		setOptions([]);
	}

	function handleAddOption() {
		setOptions([...options, ""]);
	}

	function handleOptionChange(index: number, value: string) {
		const newOptions = [...options];
		newOptions[index] = value;
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
		mutation.mutate();
	}

	return (
		<Dialog
			open={open}
			onOpenChange={(val) => {
				setOpen(val);
				if (!val) resetForm();
			}}
		>
			<DialogTrigger asChild>
				<Button>
					<Plus className="mr-2 h-4 w-4" />
					Add Field
				</Button>
			</DialogTrigger>
			<DialogContent className="sm:max-w-[425px]">
				<DialogHeader>
					<DialogTitle>Add New Field</DialogTitle>
					<DialogDescription>
						Create a new custom field for {entityType} registration.
					</DialogDescription>
				</DialogHeader>
				<div className="space-y-4 py-4">
					<div className="space-y-2">
						<Label htmlFor="name">Field Name</Label>
						<Input
							id={useId()}
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
						<Label htmlFor="order">Display Order</Label>
						<Input
							id={useId()}
							type="number"
							value={order}
							onChange={(e) => setOrder(Number(e.target.value))}
						/>
					</div>

					{type === "single_select" && (
						<div className="space-y-2">
							<Label>Options</Label>
							{options.map((opt, index) => (
								<div
									key={
										index.toString() +
										Math.random().toString()
									}
									className="flex gap-2"
								>
									<Input
										placeholder={`Option ${index + 1}`}
										value={opt}
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
					<Button
						onClick={handleSubmit}
						disabled={mutation.isPending}
					>
						{mutation.isPending ? (
							<>
								<Spinner />
								Creating...
							</>
						) : (
							"Create Field"
						)}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
