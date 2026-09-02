import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
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
import { ScrollArea } from "@/components/ui/scroll-area";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import {
	createEquipment,
	type Equipment,
	updateEquipment,
} from "@/services/equipment";

interface EquipmentDialogProps {
	equipment?: Equipment;
	trigger?: React.ReactNode;
}

function isValidUrl(val: string): boolean {
	if (!val.trim()) return true;
	try {
		const url = new URL(val.trim());
		return url.protocol === "http:" || url.protocol === "https:";
	} catch {
		return false;
	}
}

interface EquipmentFormData {
	name: string;
	code: string;
	make: string;
	model: string;
	departmentLab: string;
	usageRate: string;
	serialNumber: string;
	location: string;
	websiteUrl: string;
	description: string;
}

const emptyFormData: EquipmentFormData = {
	name: "",
	code: "",
	make: "",
	model: "",
	departmentLab: "",
	usageRate: "",
	serialNumber: "",
	location: "",
	websiteUrl: "",
	description: "",
};

export function EquipmentDialog({ equipment, trigger }: EquipmentDialogProps) {
	const isEdit = !!equipment;
	const [open, setOpen] = useState(false);
	const [formData, setFormData] = useState<EquipmentFormData>(emptyFormData);
	const baseId = useId();

	const updateField = (field: keyof EquipmentFormData, value: string) => {
		setFormData((prev) => ({ ...prev, [field]: value }));
	};

	const resetForm = useCallback(() => {
		setFormData(emptyFormData);
	}, []);

	useEffect(() => {
		if (open) {
			if (equipment) {
				setFormData({
					name: equipment.name || "",
					code: equipment.code || "",
					make: equipment.make || "",
					model: equipment.model || "",
					departmentLab: equipment.departmentLab || "",
					usageRate: equipment.usageRate || "",
					serialNumber: equipment.serialNumber || "",
					location: equipment.location || "",
					websiteUrl: equipment.websiteUrl || "",
					description: equipment.description || "",
				});
			} else {
				resetForm();
			}
		}
	}, [open, equipment, resetForm]);

	const queryClient = useQueryClient();

	const createMutation = useMutation({
		mutationFn: () => createEquipment({ data: formData }),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["equipments"] });
			toast.success("Equipment created successfully");
			setOpen(false);
			resetForm();
		},
		onError: (error) => {
			toast.error(error.message || "Failed to create equipment");
		},
	});

	const updateMutation = useMutation({
		mutationFn: () => {
			if (!equipment) throw new Error("Equipment is missing");
			return updateEquipment({
				data: {
					id: equipment.id,
					...formData,
				},
			});
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["equipments"] });
			toast.success("Equipment updated successfully");
			setOpen(false);
		},
		onError: (error) => {
			toast.error(error.message || "Failed to update equipment");
		},
	});

	function handleSubmit() {
		if (!formData.name.trim()) {
			toast.error("Equipment name is required");
			return;
		}
		if (!formData.code.trim()) {
			toast.error("Equipment code is required");
			return;
		}
		if (formData.websiteUrl.trim() && !isValidUrl(formData.websiteUrl)) {
			toast.error(
				"Please enter a valid website URL (starting with http:// or https://)",
			);
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
						<Plus className="h-4 w-4" />
						Add Equipment
					</Button>
				)}
			</DialogTrigger>
			<DialogContent className="sm:max-w-[650px] max-h-[90vh] flex flex-col">
				<DialogHeader>
					<DialogTitle>
						{isEdit ? "Edit Equipment" : "Add New Equipment"}
					</DialogTitle>
					<DialogDescription>
						{isEdit
							? "Modify existing equipment details."
							: "Create a new equipment entry."}
					</DialogDescription>
				</DialogHeader>
				<ScrollArea className="flex-1 max-h-[calc(90vh-180px)] pr-3">
					<div className="space-y-4 py-2">
						<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
							<div className="space-y-2">
								<Label htmlFor={`${baseId}-name`}>
									Equipment Name{" "}
									<span className="text-red-500">*</span>
								</Label>
								<Input
									id={`${baseId}-name`}
									value={formData.name}
									placeholder="e.g. Scanning Electron Microscope"
									onChange={(e) =>
										updateField("name", e.target.value)
									}
								/>
							</div>
							<div className="space-y-2">
								<Label htmlFor={`${baseId}-code`}>
									Equipment Code{" "}
									<span className="text-red-500">*</span>
								</Label>
								<Input
									id={`${baseId}-code`}
									value={formData.code}
									placeholder="e.g. SEM-01"
									onChange={(e) =>
										updateField("code", e.target.value)
									}
								/>
							</div>
						</div>

						<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
							<div className="space-y-2">
								<Label htmlFor={`${baseId}-make`}>Make</Label>
								<Input
									id={`${baseId}-make`}
									value={formData.make}
									placeholder="e.g. Carl Zeiss"
									onChange={(e) =>
										updateField("make", e.target.value)
									}
								/>
							</div>
							<div className="space-y-2">
								<Label htmlFor={`${baseId}-model`}>Model</Label>
								<Input
									id={`${baseId}-model`}
									value={formData.model}
									placeholder="e.g. EVO 18"
									onChange={(e) =>
										updateField("model", e.target.value)
									}
								/>
							</div>
						</div>

						<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
							<div className="space-y-2">
								<Label htmlFor={`${baseId}-departmentLab`}>
									Department / Lab
								</Label>
								<Input
									id={`${baseId}-departmentLab`}
									value={formData.departmentLab}
									placeholder="e.g. Central Instrumentation Facility"
									onChange={(e) =>
										updateField(
											"departmentLab",
											e.target.value,
										)
									}
								/>
							</div>
							<div className="space-y-2">
								<Label htmlFor={`${baseId}-location`}>
									Location
								</Label>
								<Input
									id={`${baseId}-location`}
									value={formData.location}
									placeholder="e.g. Room 102, Ground Floor"
									onChange={(e) =>
										updateField("location", e.target.value)
									}
								/>
							</div>
						</div>

						<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
							<div className="space-y-2">
								<Label htmlFor={`${baseId}-usageRate`}>
									Usage Rate
								</Label>
								<Input
									id={`${baseId}-usageRate`}
									value={formData.usageRate}
									placeholder="e.g. ₹500/hr or $20/sample"
									onChange={(e) =>
										updateField("usageRate", e.target.value)
									}
								/>
							</div>
							<div className="space-y-2">
								<Label htmlFor={`${baseId}-serialNumber`}>
									Serial Number
								</Label>
								<Input
									id={`${baseId}-serialNumber`}
									value={formData.serialNumber}
									placeholder="e.g. SN-8923412"
									onChange={(e) =>
										updateField(
											"serialNumber",
											e.target.value,
										)
									}
								/>
							</div>
						</div>

						<div className="space-y-2">
							<Label htmlFor={`${baseId}-websiteUrl`}>
								Website URL
							</Label>
							<Input
								id={`${baseId}-websiteUrl`}
								type="url"
								value={formData.websiteUrl}
								placeholder="https://example.com/equipment-details"
								onChange={(e) =>
									updateField("websiteUrl", e.target.value)
								}
							/>
						</div>

						<div className="space-y-2">
							<Label htmlFor={`${baseId}-description`}>
								Description
							</Label>
							<Textarea
								id={`${baseId}-description`}
								value={formData.description}
								placeholder="Detailed specifications, capabilities, and guidelines..."
								rows={3}
								onChange={(e) =>
									updateField("description", e.target.value)
								}
							/>
						</div>
					</div>
				</ScrollArea>
				<DialogFooter className="pt-2">
					<Button onClick={handleSubmit} disabled={isPending}>
						{isPending ? (
							<>
								<Spinner />
								{isEdit ? "Saving..." : "Creating..."}
							</>
						) : isEdit ? (
							"Save Changes"
						) : (
							"Create Equipment"
						)}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
