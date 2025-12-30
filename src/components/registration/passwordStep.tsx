import { zodResolver } from "@hookform/resolvers/zod";
import { ChevronLeft } from "lucide-react";
import { useId } from "react";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { ArrowRightIcon, LockIcon } from "@/components/svgs";
import { Button } from "@/components/ui/button";
import {
	Field,
	FieldContent,
	FieldError,
	FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";

const passwordSchema = z
	.object({
		password: z.string().min(6, "Password must be at least 6 characters"),
		confirmPassword: z.string().min(1, "Please confirm your password"),
	})
	.refine((data) => data.password === data.confirmPassword, {
		message: "Passwords don't match",
		path: ["confirmPassword"],
	});

type PasswordData = z.infer<typeof passwordSchema>;

interface PasswordStepProps {
	onComplete: (data: { password: string }) => void;
	onBack: () => void;
}

export function PasswordStep({ onComplete, onBack }: PasswordStepProps) {
	// Generate unique IDs
	const passwordId = useId();
	const confirmPasswordId = useId();

	const {
		register,
		handleSubmit,
		formState: { errors },
	} = useForm<PasswordData>({
		// biome-ignore lint/suspicious/noExplicitAny: zod/react-hook-form version mismatch
		resolver: zodResolver(passwordSchema as any),
	});

	const onSubmit = (data: PasswordData) => {
		onComplete({ password: data.password });
	};

	return (
		<form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
			<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
				<Field>
					<FieldLabel htmlFor="password">
						<div className="flex items-center gap-2">
							<LockIcon className="w-4 h-4 text-slate-400" />
							Password
						</div>
					</FieldLabel>
					<FieldContent>
						<Input
							id={passwordId}
							type="password"
							placeholder="Enter a password"
							{...register("password")}
							className={errors.password ? "border-red-500" : ""}
						/>
						<FieldError>{errors.password?.message}</FieldError>
					</FieldContent>
				</Field>

				<Field>
					<FieldLabel htmlFor="confirmPassword">
						<div className="flex items-center gap-2">
							<LockIcon className="w-4 h-4 text-slate-400" />
							Confirm Password
						</div>
					</FieldLabel>
					<FieldContent>
						<Input
							id={confirmPasswordId}
							type="password"
							placeholder="Confirm your password"
							{...register("confirmPassword")}
							className={
								errors.confirmPassword ? "border-red-500" : ""
							}
						/>
						<FieldError>
							{errors.confirmPassword?.message}
						</FieldError>
					</FieldContent>
				</Field>
			</div>

			<div className="flex flex-col sm:flex-row justify-between gap-4 pt-6">
				<Button
					type="button"
					variant="ghost"
					onClick={onBack}
					className="w-full sm:w-auto h-11 text-slate-600"
				>
					<ChevronLeft className="mr-2 w-4 h-4" />
					Back
				</Button>
				<Button
					type="submit"
					className="w-full sm:w-auto h-11 bg-blue-600 hover:bg-blue-500 text-white min-w-[200px]"
				>
					Next Step <ArrowRightIcon className="ml-2 w-4 h-4" />
				</Button>
			</div>
		</form>
	);
}
