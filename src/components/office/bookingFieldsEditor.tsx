import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Save } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { updateBookingFields } from "@/services/booking";
import { FileViewer, isLongFieldValue } from "../general/fieldResponses";

interface BookingResponse {
	responseId: number;
	fieldId: number;
	fieldName: string;
	fieldType: string;
	value: string | null;
	adminValue: string | null;
	iteration: number;
	order: number;
	stage: string;
	parentId: number | null;
	parentOrder: number | null;
}

interface BookingFieldsEditorProps {
	bookingId: number;
	responses: BookingResponse[];
}

export function BookingFieldsEditor({
	bookingId,
	responses,
}: BookingFieldsEditorProps) {
	const [editedValues, setEditedValues] = useState<
		Record<number, string | null>
	>({});
	const queryClient = useQueryClient();

	useEffect(() => {
		const initial: Record<number, string | null> = {};
		for (const resp of responses) {
			initial[resp.responseId] = resp.adminValue;
		}
		setEditedValues(initial);
	}, [responses]);

	const updateMutation = useMutation({
		mutationFn: updateBookingFields,
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["booking", bookingId] });
			toast.success("Field values updated successfully");
		},
		onError: (error) => {
			toast.error(error.message || "Failed to update field values");
		},
	});

	const handleValueChange = (responseId: number, value: string | null) => {
		setEditedValues((prev) => ({
			...prev,
			[responseId]: value,
		}));
	};

	const handleSave = () => {
		const payload = Object.entries(editedValues).map(([id, val]) => ({
			responseId: Number(id),
			adminValue: val,
		}));
		updateMutation.mutate({
			data: {
				bookingId,
				responses: payload,
			},
		});
	};

	const hasChanges = responses.some(
		(resp) => editedValues[resp.responseId] !== resp.adminValue,
	);

	const sortedResponses = [...responses].sort((a, b) => {
		const aEffectiveParentOrder = a.parentOrder ?? a.order;
		const bEffectiveParentOrder = b.parentOrder ?? b.order;

		if (aEffectiveParentOrder !== bEffectiveParentOrder)
			return aEffectiveParentOrder - bEffectiveParentOrder;

		if (a.parentId !== b.parentId) {
			if (a.parentId === null) return -1;
			if (b.parentId === null) return 1;
		}

		if (a.iteration !== b.iteration) return a.iteration - b.iteration;
		return a.order - b.order;
	});

	const initialResponses = sortedResponses.filter(
		(r) => r.stage !== "payment",
	);
	const paymentResponses = sortedResponses.filter(
		(r) => r.stage === "payment",
	);

	if (responses.length === 0) {
		return (
			<p className="text-sm text-slate-500 italic">
				No field responses found.
			</p>
		);
	}

	return (
		<div className="space-y-6">
			<div className="flex justify-between items-center">
				<h3 className="text-lg font-semibold text-slate-900 px-1">
					Field Comparisons
				</h3>
				<Button
					size="sm"
					onClick={handleSave}
					disabled={!hasChanges || updateMutation.isPending}
					className="gap-2"
				>
					{updateMutation.isPending ? (
						<span className="flex items-center gap-2">
							<Spinner className="h-4 w-4" />
							Saving...
						</span>
					) : (
						<>
							<Save className="h-4 w-4" />
							Save Changes
						</>
					)}
				</Button>
			</div>

			<div className="space-y-8">
				{/* Initial Information Section */}
				<div className="space-y-4">
					<div className="flex items-center gap-2 px-1">
						<span className="h-2 w-2 rounded-full bg-slate-400" />
						<h4 className="text-sm font-semibold text-slate-700 uppercase tracking-wider">
							Initial Submission Fields
						</h4>
					</div>
					<div className="border rounded-lg bg-white overflow-hidden shadow-sm">
						<Table className="table-fixed w-full">
							<TableHeader>
								<TableRow className="bg-slate-50/70">
									<TableHead className="w-[28%] font-semibold text-slate-900">
										Field Name
									</TableHead>
									<TableHead className="w-[36%] font-semibold text-slate-900">
										User Value
									</TableHead>
									<TableHead className="w-[36%] font-semibold text-slate-900">
										Admin Value
									</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{initialResponses.map((resp) => (
									<ResponseRow
										key={resp.responseId}
										resp={resp}
										editedValue={
											editedValues[resp.responseId]
										}
										onValueChange={handleValueChange}
									/>
								))}
							</TableBody>
						</Table>
					</div>
				</div>

				{/* Payment Stage Fields Section */}
				{paymentResponses.length > 0 && (
					<div className="space-y-4">
						<div className="flex items-center gap-2 px-1">
							<span className="h-2 w-2 rounded-full bg-blue-500" />
							<h4 className="text-sm font-semibold text-blue-900 uppercase tracking-wider">
								Payment Stage Fields
							</h4>
						</div>
						<div className="border border-blue-100 rounded-lg bg-blue-50/10 overflow-hidden shadow-sm">
							<Table className="table-fixed w-full">
								<TableHeader>
									<TableRow className="bg-blue-50/50">
										<TableHead className="w-[28%] font-semibold text-blue-900 border-blue-100">
											Field Name
										</TableHead>
										<TableHead className="w-[36%] font-semibold text-blue-900 border-blue-100">
											User Value
										</TableHead>
										<TableHead className="w-[36%] font-semibold text-blue-900 border-blue-100">
											Admin Value
										</TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{paymentResponses.map((resp) => (
										<ResponseRow
											key={resp.responseId}
											resp={resp}
											editedValue={
												editedValues[resp.responseId]
											}
											onValueChange={handleValueChange}
											isPaymentStage
										/>
									))}
								</TableBody>
							</Table>
						</div>
					</div>
				)}
			</div>
		</div>
	);
}

function ResponseRow({
	resp,
	editedValue,
	onValueChange,
	isPaymentStage = false,
}: {
	resp: BookingResponse;
	editedValue: string | null | undefined;
	onValueChange: (id: number, val: string | null) => void;
	isPaymentStage?: boolean;
}) {
	const userVal = resp.value || "";
	const currentVal = editedValue ?? "";
	const isLong = isLongFieldValue(userVal) || isLongFieldValue(currentVal);

	return (
		<TableRow
			className={cn(
				"align-top",
				isPaymentStage
					? "hover:bg-blue-50/30 border-blue-50"
					: "hover:bg-slate-50/40",
			)}
		>
			<TableCell className="align-top py-3.5 px-4 font-medium text-slate-700 max-w-0 break-words whitespace-normal [overflow-wrap:anywhere]">
				<div className="space-y-1">
					<div className="font-semibold text-slate-800 leading-snug break-words [overflow-wrap:anywhere]">
						{resp.fieldName}
						{(resp.iteration > 0 || resp.parentId !== null) && (
							<span className="ml-1.5 text-xs font-normal text-slate-400">
								(#{resp.iteration + 1})
							</span>
						)}
					</div>
					<div className="text-[11px] text-slate-400 uppercase tracking-wider">
						{resp.fieldType}
					</div>
				</div>
			</TableCell>

			<TableCell className="align-top py-3.5 px-4 max-w-0 whitespace-normal break-words [overflow-wrap:anywhere]">
				{resp.fieldType === "file" ? (
					<FileViewer
						responseId={resp.responseId}
						name={resp.fieldName}
						hasFile={!!resp.value}
					/>
				) : !userVal ? (
					<span className="text-slate-400 italic text-sm">—</span>
				) : (
					<div
						className={cn(
							"rounded-md border border-slate-200/80 bg-slate-50 text-slate-800 break-words [overflow-wrap:anywhere] leading-relaxed",
							isLong
								? "text-sm min-h-[80px] max-h-48 p-2.5 overflow-y-auto whitespace-pre-wrap"
								: "text-sm min-h-9 py-2 px-3 whitespace-normal",
						)}
					>
						{userVal}
					</div>
				)}
			</TableCell>

			<TableCell className="align-top py-3.5 px-4 max-w-0 whitespace-normal break-words [overflow-wrap:anywhere]">
				{resp.fieldType === "file" ? (
					<span className="text-xs text-slate-400 italic">
						File responses cannot be overridden
					</span>
				) : isLong ? (
					<Textarea
						className="min-h-[80px] max-h-48 resize-y text-sm leading-relaxed border-slate-200 bg-white"
						value={currentVal}
						placeholder={userVal || "Enter override..."}
						onChange={(e) =>
							onValueChange(
								resp.responseId,
								e.target.value === "" ? null : e.target.value,
							)
						}
					/>
				) : (
					<Input
						className="h-9 text-sm border-slate-200 bg-white"
						value={currentVal}
						placeholder={userVal || "Enter override..."}
						onChange={(e) =>
							onValueChange(
								resp.responseId,
								e.target.value === "" ? null : e.target.value,
							)
						}
					/>
				)}
			</TableCell>
		</TableRow>
	);
}
