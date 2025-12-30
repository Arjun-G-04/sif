import { zodResolver } from "@hookform/resolvers/zod";
import {
	ArrowLeftIcon,
	ArrowRightIcon,
	CalendarIcon,
	FileIcon,
	ListIcon,
	TypeIcon,
} from "lucide-react";
import { useMemo } from "react";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
	Field,
	FieldLabel,
	FieldContent,
	FieldError,
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
import type { Field as FieldType } from "@/services/field";

interface FormProps {
	fields: FieldType[];
	onSubmit: (data: FormData) => void;
	onBack: () => void;
	isLoading: boolean;
}

type FormValues = Record<string, string | FileList>;

export function FieldsForm({ fields, onSubmit, onBack, isLoading }: FormProps) {
	// Create dynamic schema
	const dynamicSchema = useMemo(() => {
		const schemaObject: Record<string, z.ZodTypeAny> = {};

		for (const field of fields) {
			let fieldSchema: z.ZodTypeAny = z.string();
			if (
				field.type === "text" ||
				field.type === "single_select" ||
				field.type === "date"
			) {
				fieldSchema = z.string().min(1, `${field.name} is required`);
			} else if (field.type === "file") {
				fieldSchema = z.any().optional();
			}
			schemaObject[field.id] = fieldSchema;
		}

		return z.object(schemaObject);
	}, [fields]);

	const {
		register,
		handleSubmit,
		setValue,
		formState: { errors },
	} = useForm<FormValues>({
		// biome-ignore lint/suspicious/noExplicitAny: zod/react-hook-form version mismatch
		resolver: zodResolver(dynamicSchema as any),
	});

	const handleFormSubmit = (data: FormValues) => {
		const formData = new FormData();
		for (const field of fields) {
			const fieldId = field.id.toString();
			const value = data[fieldId];
			if (field.type === "file") {
				const fileList = value as FileList;
				if (fileList && fileList.length > 0) {
					formData.append(fieldId, fileList[0]);
				}
			} else {
				formData.append(fieldId, value as string);
			}
		}
		onSubmit(formData);
	};

	if (fields.length === 0) {
		return (
			<div className="text-center py-10 space-y-4">
				<p className="text-slate-500 italic">
					No additional information required.
				</p>
				<div className="flex flex-col sm:flex-row justify-between gap-4">
					<Button
						type="button"
						variant="outline"
						onClick={onBack}
						disabled={isLoading}
						className="w-full sm:w-auto"
					>
						<ArrowLeftIcon className="mr-2 w-4 h-4" /> Back
					</Button>
					<Button
						type="button"
						onClick={() => onSubmit(new FormData())}
						disabled={isLoading}
						className="w-full sm:w-auto"
					>
						Complete Registration{" "}
						<ArrowRightIcon className="ml-2 w-4 h-4" />
					</Button>
				</div>
			</div>
		);
	}

	return (
		<form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
			<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
				{fields.map((field) => {
					const fieldId = field.id.toString();
					const error = errors[fieldId];

					return (
						<Field key={field.id}>
							<FieldLabel htmlFor={fieldId}>
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
									{field.type === "text" && (
										<TypeIcon className="w-4 h-4 text-slate-400" />
									)}
									{field.name}
								</div>
							</FieldLabel>
							<FieldContent>
								{field.type === "text" && (
									<Input
										id={fieldId}
										placeholder={field.name}
										{...register(fieldId)}
										className={
											error ? "border-red-500" : ""
										}
									/>
								)}

								{field.type === "date" && (
									<Input
										id={fieldId}
										type="date"
										{...register(fieldId)}
										className={
											error ? "border-red-500" : ""
										}
									/>
								)}

								{field.type === "file" && (
									<Input
										id={fieldId}
										type="file"
										{...register(fieldId)}
										className={
											error ? "border-red-500" : ""
										}
									/>
								)}

								{field.type === "single_select" && (
									<Select
										onValueChange={(val) =>
											setValue(fieldId, val)
										}
									>
										<SelectTrigger
											className={
												error
													? "border-red-500 w-full"
													: "w-full"
											}
										>
											<SelectValue
												placeholder={`Select ${field.name}`}
											/>
										</SelectTrigger>
										<SelectContent>
											{field.options?.map((opt) => (
												<SelectItem
													key={opt.id}
													value={opt.value}
												>
													{opt.value}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								)}
								<FieldError>
									{error?.message as string}
								</FieldError>
							</FieldContent>
						</Field>
					);
				})}
			</div>

			<div className="flex flex-col sm:flex-row justify-between gap-4 pt-6">
				<Button
					type="button"
					variant="outline"
					onClick={onBack}
					disabled={isLoading}
					className="w-full sm:w-auto h-11"
				>
					<ArrowLeftIcon className="mr-2 w-4 h-4" /> Back
				</Button>
				<Button
					type="submit"
					disabled={isLoading}
					className="w-full sm:w-auto h-11 bg-blue-600 hover:bg-blue-500 text-white min-w-[200px]"
				>
					{isLoading ? (
						<div className="flex items-center gap-2">
							<Spinner className="w-4 h-4" />
							Submitting...
						</div>
					) : (
						"Complete Registration"
					)}
				</Button>
			</div>
		</form>
	);
}
