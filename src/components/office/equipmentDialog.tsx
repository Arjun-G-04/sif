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
import { Spinner } from "@/components/ui/spinner";
import {
	createEquipment,
	type Equipment,
	updateEquipment,
} from "@/services/equipment";

interface EquipmentDialogProps {
	equipment?: Equipment;
	trigger?: React.ReactNode;
}

export function EquipmentDialog({ equipment, trigger }: EquipmentDialogProps) {
	const isEdit = !!equipment;
	const [open, setOpen] = useState(false);
	const [name, setName] = useState(equipment?.name || "");
	const [code, setCode] = useState(equipment?.code || "");

	const resetForm = useCallback(() => {
		setName("");
		setCode("");
	}, []);

	useEffect(() => {
		if (open) {
			if (equipment) {
				setName(equipment.name);
				setCode(equipment.code);
			} else {
				resetForm();
			}
		}
	}, [open, equipment, resetForm]);

	const nameId = useId();
	const codeId = useId();

	const queryClient = useQueryClient();

	const createMutation = useMutation({
		mutationFn: () =>
			createEquipment({
				data: {
					name,
					code,
				},
			}),
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
					name,
					code,
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
		if (!name.trim()) {
			toast.error("Equipment name is required");
			return;
		}
		if (!code.trim()) {
			toast.error("Equipment code is required");
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
			<DialogContent className="sm:max-w-[425px]">
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
				<div className="space-y-4 py-4">
					<div className="space-y-2">
						<Label htmlFor={nameId}>Equipment Name</Label>
						<Input
							id={nameId}
							value={name}
							onChange={(e) => setName(e.target.value)}
						/>
					</div>
					<div className="space-y-2">
						<Label htmlFor={codeId}>Equipment Code</Label>
						<Input
							id={codeId}
							value={code}
							onChange={(e) => setCode(e.target.value)}
						/>
					</div>
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
							"Create Equipment"
						)}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
