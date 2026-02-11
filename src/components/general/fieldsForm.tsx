import { zodResolver } from "@hookform/resolvers/zod";
import {
	ArrowLeftIcon,
	ArrowRightIcon,
	CalendarIcon,
	FileIcon,
	ListIcon,
	ListChecks,
	TypeIcon,
	LockIcon,
	PlusIcon,
	TrashIcon,
	CheckCircle2,
	Edit2,
} from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";
import {
	useForm,
	useFieldArray,
	type UseFormRegister,
	type UseFormSetValue,
	type FieldError as RHFFieldError,
	type FieldErrors,
	type Control,
	type Path,
	useWatch,
} from "react-hook-form";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
	Field,
	FieldLabel,
	FieldContent,
	FieldError as UIFieldError,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { Checkbox } from "@/components/ui/checkbox";

import type { Field as FieldType } from "@/services/field";

interface FormProps {
	fields: FieldType[];
	onSubmit: (data: FormData) => void;
	onBack?: () => void;
	isLoading: boolean;
	submitText: string;
}

type FormValues = Record<string, unknown>; // Using unknown for dynamic keys

function ValueShowcase({ field, value }: { field: FieldType; value: unknown }) {
	if (
		field.type === "heading" ||
		field.type === "info_text" ||
		field.type === "admin_file"
	)
		return null;

	const formatValue = (f: FieldType, v: unknown): ReactNode => {
		if (v === undefined || v === null || v === "")
			return <span className="text-slate-400 italic">Not provided</span>;
		if (f.type === "multi_select" && Array.isArray(v))
			return v.length > 0 ? v.join(", ") : "None selected";
		if (f.type === "file") {
			if (v instanceof FileList && v.length > 0) return v[0].name;
			if (v instanceof File) return v.name;
			return "File uploaded";
		}
		return String(v);
	};

	if (field.type === "group" && Array.isArray(value)) {
		return (
			<div className="space-y-4 col-span-full">
				<div className="text-sm font-bold text-slate-800 uppercase tracking-tight">
					{field.name}
				</div>
				<div className="space-y-6 pl-4 border-l-2 border-blue-50">
					{value.map((item, idx) => (
						<div
							key={`${field.id}_item_${idx}`}
							className="space-y-3"
						>
							<div className="text-[10px] font-bold text-blue-600 uppercase tracking-wider">
								Item {idx + 1}
							</div>
							<div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3">
								{field.children?.map((child) => (
									<div key={child.id} className="space-y-1">
										<div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
											{child.name}
										</div>
										<div className="text-base font-semibold text-slate-900">
											{formatValue(child, item[child.id])}
										</div>
									</div>
								))}
							</div>
						</div>
					))}
				</div>
			</div>
		);
	}

	return (
		<div className="space-y-1">
			<div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
				{field.name}
			</div>
			<div className="text-base font-semibold text-slate-900">
				{formatValue(field, value)}
			</div>
		</div>
	);
}

function ConfirmationStep({
	fields,
	data,
	onConfirm,
	onEdit,
	isLoading,
	submitText,
}: {
	fields: FieldType[];
	data: FormValues;
	onConfirm: () => void;
	onEdit: () => void;
	isLoading: boolean;
	submitText: string;
}) {
	return (
		<div className="space-y-8">
			<div className="space-y-2 text-center sm:text-left">
				<h2 className="text-2xl font-bold text-slate-900 tracking-tight">
					Review your details
				</h2>
				<p className="text-sm text-slate-500">
					Please confirm the information below before submitting. You
					can NOT edit this information after submission.
				</p>
			</div>

			<div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
				<div className="p-6 sm:p-8 space-y-8">
					<div className="grid grid-cols-1 sm:grid-cols-2 gap-x-12 gap-y-8">
						{fields.map((field) => {
							if (field.type === "heading") {
								return (
									<div
										key={field.id}
										className="col-span-full pt-4 first:pt-0"
									>
										<h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2">
											{field.name}
										</h3>
									</div>
								);
							}
							if (field.type === "info_text") {
								return (
									<div
										key={field.id}
										className="col-span-full pt-2 first:pt-0"
									>
										<p className="text-sm text-slate-700">
											{field.name}
										</p>
									</div>
								);
							}
							return (
								<ValueShowcase
									key={field.id}
									field={field}
									value={data[field.id]}
								/>
							);
						})}
					</div>
				</div>
				<div className="bg-slate-50 border-t border-slate-200 p-4 sm:p-6 flex flex-col sm:flex-row justify-between gap-4">
					<Button
						type="button"
						variant="outline"
						onClick={onEdit}
						disabled={isLoading}
						className="w-full sm:w-auto h-11 px-6"
					>
						<Edit2 className="mr-2 w-4 h-4" /> Back to Edit
					</Button>
					<Button
						type="button"
						onClick={onConfirm}
						disabled={isLoading}
						className="w-full sm:w-auto h-11 bg-blue-600 hover:bg-blue-700 text-white min-w-[200px]"
					>
						{isLoading ? (
							<div className="flex items-center gap-2">
								<Spinner className="w-4 h-4" />
								Submitting...
							</div>
						) : (
							<div className="flex items-center gap-2">
								<CheckCircle2 className="w-4 h-4" />
								Confirm & {submitText}
							</div>
						)}
					</Button>
				</div>
			</div>
		</div>
	);
}

export function FieldsForm({
	fields,
	onSubmit,
	onBack,
	isLoading,
	submitText,
}: FormProps) {
	const [showConfirmation, setShowConfirmation] = useState(false);
	const [confirmedData, setConfirmedData] = useState<FormValues | null>(null);

	// Create dynamic schema
	const dynamicSchema = useMemo(() => {
		const buildSchemaForFields = (fieldsList: FieldType[]) => {
			const schemaObject: Record<string, z.ZodTypeAny> = {};

			for (const field of fieldsList) {
				if (
					field.type === "heading" ||
					field.type === "info_text" ||
					field.type === "admin_file"
				) {
					continue;
				}

				if (field.type === "group") {
					// Use z.array for grouped fields
					const itemSchema = buildSchemaForFields(
						field.children || [],
					);
					schemaObject[field.id.toString()] = z.array(
						z.object(itemSchema),
					);
					continue;
				}

				let fieldSchema: z.ZodTypeAny = z.string();
				if (
					field.type === "text" ||
					field.type === "single_select" ||
					field.type === "date" ||
					field.type === "relation"
				) {
					fieldSchema = z
						.string()
						.min(1, `${field.name} is required`);
				} else if (field.type === "multi_select") {
					fieldSchema = z
						.array(z.string())
						.min(1, `Select at least one option for ${field.name}`);
				} else if (field.type === "file") {
					fieldSchema = z.unknown().optional();
				}
				schemaObject[field.id.toString()] = fieldSchema;
			}
			return schemaObject;
		};

		const rootSchema = buildSchemaForFields(fields);
		return z.object(rootSchema);
	}, [fields]);

	const {
		register,
		handleSubmit,
		setValue,
		control,
		formState: { errors },
	} = useForm<FormValues>({
		resolver: zodResolver(dynamicSchema),
	});

	const handleFormSubmit = (data: FormValues) => {
		setConfirmedData(data);
		setShowConfirmation(true);
		window.scrollTo({ top: 0, behavior: "smooth" });
	};

	const onConfirm = () => {
		if (!confirmedData) return;

		const formData = new FormData();

		const appendToFormData = (
			obj: Record<string, unknown>,
			prefix = "",
		) => {
			for (const key in obj) {
				const value = obj[key];
				const fieldKey = prefix ? `${prefix}_${key}` : key;

				if (Array.isArray(value)) {
					// Check if array of primitives (strings/numbers) -> join them
					if (
						value.length > 0 &&
						(typeof value[0] === "string" ||
							typeof value[0] === "number")
					) {
						formData.append(fieldKey, value.join(", "));
					} else {
						value.forEach((item: unknown, index: number) => {
							if (typeof item === "object" && item !== null) {
								const itemObj = item as Record<string, unknown>;
								for (const childId in itemObj) {
									const val = itemObj[childId];
									if (val instanceof FileList) {
										if (val.length > 0) {
											formData.append(
												`${childId}_${index}`,
												val[0],
											);
										}
									} else if (
										val !== undefined &&
										val !== null
									) {
										formData.append(
											`${childId}_${index}`,
											String(val),
										);
									}
								}
							}
						});
					}
				} else if (value instanceof FileList) {
					if (value.length > 0) {
						formData.append(fieldKey, value[0]);
					}
				} else if (value !== undefined && value !== null) {
					formData.append(fieldKey, String(value));
				}
			}
		};

		appendToFormData(confirmedData);
		onSubmit(formData);
	};

	if (fields.length === 0) {
		return (
			<div className="text-center py-10 space-y-4">
				<p className="text-slate-500 italic">
					No additional information required.
				</p>
				<div className="flex flex-col sm:flex-row justify-between gap-4">
					{onBack && (
						<Button
							type="button"
							variant="outline"
							onClick={onBack}
							disabled={isLoading}
							className="w-full sm:w-auto"
						>
							<ArrowLeftIcon className="mr-2 w-4 h-4" /> Back
						</Button>
					)}
					<Button
						type="button"
						onClick={() => onSubmit(new FormData())}
						disabled={isLoading}
						className={`w-full ${onBack ? "sm:w-auto" : ""}`}
					>
						{submitText} <ArrowRightIcon className="ml-2 w-4 h-4" />
					</Button>
				</div>
			</div>
		);
	}

	if (showConfirmation && confirmedData) {
		return (
			<ConfirmationStep
				fields={fields}
				data={confirmedData}
				onConfirm={onConfirm}
				onEdit={() => setShowConfirmation(false)}
				isLoading={isLoading}
				submitText={submitText}
			/>
		);
	}

	return (
		<form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
			<div className="grid grid-cols-1 gap-6">
				{fields.map((field) => (
					<InternalFieldRenderer
						key={field.id}
						field={field}
						register={register}
						errors={errors}
						setValue={setValue}
						control={control}
					/>
				))}
			</div>

			<div className="flex flex-col sm:flex-row justify-between gap-4 pt-6">
				{onBack && (
					<Button
						type="button"
						variant="outline"
						onClick={onBack}
						disabled={isLoading}
						className="w-full sm:w-auto h-11"
					>
						<ArrowLeftIcon className="mr-2 w-4 h-4" /> Back
					</Button>
				)}
				<Button
					type="submit"
					disabled={isLoading}
					className={`w-full ${onBack ? "sm:w-auto" : ""} h-11 bg-blue-600 hover:bg-blue-700 text-white min-w-[200px]`}
				>
					<div className="flex items-center gap-2">
						{submitText}
						<ArrowRightIcon className="w-4 h-4" />
					</div>
				</Button>
			</div>
		</form>
	);
}

function InternalFieldRenderer({
	field,
	namePrefix = "",
	register,
	errors,
	setValue,
	control,
}: {
	field: FieldType;
	namePrefix?: string;
	register: UseFormRegister<FormValues>;
	errors: FieldErrors<FormValues>;
	setValue: UseFormSetValue<FormValues>;
	control: Control<FormValues>;
}) {
	const fieldName = namePrefix
		? (`${namePrefix}.${field.id}` as const)
		: (`${field.id}` as const);

	// Navigate errors object based on nested name
	const getError = (
		path: string,
		errs: FieldErrors<FormValues>,
	): RHFFieldError | undefined => {
		const parts = path.split(".");
		let current: unknown = errs;
		for (const part of parts) {
			if (!current || typeof current !== "object") return undefined;
			current = (current as Record<string, unknown>)[part];
		}
		return current as RHFFieldError | undefined;
	};
	const error = getError(fieldName, errors);
	const currentValues = useWatch({
		control,
		name: fieldName as Path<FormValues>,
	}) as string[] | undefined;

	if (field.type === "heading") {
		return (
			<div className="py-2">
				<h3 className="text-lg font-semibold text-slate-900 border-b border-slate-200 pb-1 mb-2">
					{field.name}
				</h3>
			</div>
		);
	}

	if (field.type === "info_text") {
		return <p className="text-base text-slate-700">{field.name}</p>;
	}

	if (field.type === "admin_file") {
		return (
			<div className="py-2 space-y-2">
				<FieldLabel className="text-slate-700">{field.name}</FieldLabel>
				{field.adminFileConfig ? (
					<div className="bg-slate-50 p-3 rounded-md border border-slate-200 text-sm flex items-center justify-between">
						<div className="flex items-center gap-2">
							<FileIcon className="w-4 h-4 text-slate-400" />
							<span className="font-medium text-slate-700">
								{field.adminFileConfig.originalName}
							</span>
						</div>
						<a
							href={`/api/file/?fieldId=${field.id}`}
							target="_blank"
							rel="noreferrer"
							className="text-blue-600 hover:text-blue-800 hover:underline text-xs font-semibold"
						>
							Download
						</a>
					</div>
				) : (
					<div className="text-yellow-600 text-sm italic">
						File configuration missing.
					</div>
				)}
			</div>
		);
	}

	if (field.type === "group") {
		return (
			<GroupFieldRenderer
				field={field}
				namePrefix={namePrefix}
				register={register}
				errors={errors}
				setValue={setValue}
				control={control}
			/>
		);
	}

	if (field.type === "relation" && field.relatedValue) {
		return (
			<Field>
				<FieldLabel htmlFor={fieldName}>
					<div className="flex items-center gap-2">
						<LockIcon className="w-4 h-4 text-slate-400" />
						{field.name}
					</div>
				</FieldLabel>
				<FieldContent>
					<Input
						value={field.relatedValue}
						disabled
						className="bg-slate-50 text-slate-500"
					/>
					<input
						type="hidden"
						{...register(fieldName as Path<FormValues>)}
						value={field.relatedValue || ""}
					/>
				</FieldContent>
			</Field>
		);
	}

	return (
		<Field>
			<FieldLabel htmlFor={fieldName}>
				<div className="flex items-center gap-2">
					{field.type === "date" && (
						<CalendarIcon className="w-4 h-4 text-slate-400" />
					)}
					{field.type === "single_select" && (
						<ListIcon className="w-4 h-4 text-slate-400" />
					)}
					{field.type === "file" && (
						<FileIcon className="w-4 h-4 text-slate-400" />
					)}
					{field.type === "multi_select" && (
						<ListChecks className="w-4 h-4 text-slate-400" />
					)}
					{field.type === "text" && (
						<TypeIcon className="w-4 h-4 text-slate-400" />
					)}
					{field.name}
				</div>
			</FieldLabel>
			<FieldContent>
				{field.type === "text" && (
					<Input
						id={fieldName}
						placeholder={field.name}
						{...register(fieldName as Path<FormValues>)}
						className={error ? "border-red-500" : ""}
					/>
				)}

				{field.type === "date" && (
					<Input
						id={fieldName}
						type="date"
						{...register(fieldName as Path<FormValues>)}
						className={error ? "border-red-500" : ""}
					/>
				)}

				{field.type === "file" && (
					<Input
						id={fieldName}
						type="file"
						{...register(fieldName as Path<FormValues>)}
						className={error ? "border-red-500" : ""}
					/>
				)}

				{field.type === "single_select" && (
					<Select
						onValueChange={(val) =>
							setValue(fieldName as Path<FormValues>, val)
						}
					>
						<SelectTrigger
							className={
								error ? "border-red-500 w-full" : "w-full"
							}
						>
							<SelectValue placeholder={`Select ${field.name}`} />
						</SelectTrigger>
						<SelectContent>
							{field.options?.map((opt) => (
								<SelectItem key={opt.id} value={opt.value}>
									{opt.value}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				)}

				{field.type === "multi_select" && (
					<div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 select-none">
						{field.options?.map((opt) => {
							const isChecked = (currentValues || []).includes(
								opt.value,
							);
							return (
								<label
									key={opt.id}
									htmlFor={`${fieldName}_${opt.id}`}
									className={`
										flex items-start gap-3 px-4 py-3 rounded-md border-2 transition-all cursor-pointer h-full
										${
											isChecked
												? "bg-blue-50 border-blue-600 text-blue-700 shadow-sm ring-1 ring-blue-600/20"
												: "bg-white border-slate-100 hover:border-slate-200 text-slate-600 hover:bg-slate-50/50"
										}
									`}
								>
									<Checkbox
										id={`${fieldName}_${opt.id}`}
										checked={isChecked}
										className="mt-0.5 shrink-0"
										onCheckedChange={(
											checked: boolean | "indeterminate",
										) => {
											const values = currentValues || [];
											let newValues: string[];
											if (checked === true) {
												newValues = [
													...values,
													opt.value,
												];
											} else {
												newValues = values.filter(
													(v) => v !== opt.value,
												);
											}
											setValue(
												fieldName as Path<FormValues>,
												newValues,
											);
										}}
									/>
									<span className="text-sm font-semibold leading-snug text-wrap">
										{opt.value}
									</span>
								</label>
							);
						})}
					</div>
				)}

				{field.type === "relation" && !field.relatedValue && (
					<div className="p-4 bg-yellow-50 text-yellow-800 rounded-md text-sm border border-yellow-200">
						Relation value missing for {field.name}. Please contact
						admin.
					</div>
				)}

				<UIFieldError>{error?.message}</UIFieldError>
			</FieldContent>
		</Field>
	);
}

function GroupFieldRenderer({
	field,
	namePrefix,
	register,
	errors,
	setValue,
	control,
}: {
	field: FieldType;
	namePrefix?: string;
	register: UseFormRegister<FormValues>;
	errors: FieldErrors<FormValues>;
	setValue: UseFormSetValue<FormValues>;
	control: Control<FormValues>;
}) {
	const fieldName = namePrefix
		? (`${namePrefix}.${field.id}` as const)
		: (`${field.id}` as const);
	const {
		fields: items,
		append,
		remove,
	} = useFieldArray({
		control,
		name: fieldName as never, // name expects Path<FormValues>, but since it's dynamic we use never to bypass if Path fails
	});

	// Initialize with one item if empty
	useMemo(() => {
		if (items.length === 0) {
			append({}, { shouldFocus: false });
		}
	}, [items.length, append]);

	const max = field.groupConfig?.max || 1;

	return (
		<div className="space-y-4 border border-slate-200 rounded-xl p-6 bg-slate-50/30">
			<div className="flex items-center justify-between">
				<div className="space-y-1">
					<h4 className="text-base font-semibold text-slate-900">
						{field.name}
					</h4>
					<p className="text-xs text-slate-500">
						Add up to {max} items
					</p>
				</div>
				<div className="px-2.5 py-1 bg-white border border-slate-200 rounded-full text-[10px] font-bold text-slate-600 shadow-sm">
					{items.length} / {max}
				</div>
			</div>

			<div className="space-y-8">
				{items.map((item, i) => (
					<div
						key={item.id}
						className="relative pl-6 border-l-2 border-blue-100 hover:border-blue-200 transition-colors"
					>
						<div className="absolute -left-[11px] top-0 w-5 h-5 rounded-full bg-blue-600 text-[10px] flex items-center justify-center text-white font-bold ring-4 ring-white">
							{i + 1}
						</div>
						<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
							{field.children?.map((child) => (
								<InternalFieldRenderer
									key={child.id}
									field={child}
									namePrefix={`${fieldName}.${i}`}
									register={register}
									errors={errors}
									setValue={setValue}
									control={control}
								/>
							))}
						</div>
					</div>
				))}
			</div>

			<div className="flex items-center gap-3 pt-4">
				{items.length < max && (
					<Button
						type="button"
						variant="outline"
						size="sm"
						onClick={() => append({})}
						className="bg-white hover:bg-blue-50 text-blue-600 border-blue-200 hover:border-blue-300 transition-all font-semibold"
					>
						<PlusIcon className="w-4 h-4 mr-1.5" />
						Add {field.name}
					</Button>
				)}
				{items.length > 1 && (
					<Button
						type="button"
						variant="ghost"
						size="sm"
						onClick={() => remove(items.length - 1)}
						className="text-red-500 hover:text-red-600 hover:bg-red-50 transition-all font-medium"
					>
						<TrashIcon className="w-4 h-4 mr-1.5" />
						Remove Last
					</Button>
				)}
			</div>
		</div>
	);
}
