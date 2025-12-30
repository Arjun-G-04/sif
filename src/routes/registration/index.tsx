import {
	queryOptions,
	useMutation,
	useSuspenseQuery,
} from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { FieldsForm } from "@/components/general/fieldsForm";
import { EmailPhoneStep } from "@/components/registration/emailPhoneStep";
import { PasswordStep } from "@/components/registration/passwordStep";
import { SuccessStep } from "@/components/registration/successStep";
import { OfficeIcon } from "@/components/svgs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { getPublicRegistrationFields } from "@/services/field";
import { submitRegistration } from "@/services/registration";

export const publicFieldsQueryOptions = queryOptions({
	queryKey: ["fields", "public", "registration"],
	queryFn: () => getPublicRegistrationFields(),
});

export const Route = createFileRoute("/registration/")({
	component: RegistrationPage,
	loader: async ({ context }) => {
		await context.queryClient.ensureQueryData(publicFieldsQueryOptions);
	},
});

function RegistrationPage() {
	const fields = useSuspenseQuery(publicFieldsQueryOptions);
	const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
	const [password, setPassword] = useState<string | null>(null);
	const [contactData, setContactData] = useState<{
		email: string;
		phone: string;
	} | null>(null);
	const registrationMutation = useMutation({
		mutationFn: async (dynamicFormData: FormData) => {
			if (password) {
				dynamicFormData.append("password", password);
			}
			if (contactData) {
				dynamicFormData.append("email", contactData.email);
				dynamicFormData.append("phone", contactData.phone);
			}
			return submitRegistration({ data: dynamicFormData });
		},
		onSuccess: () => {
			setStep(4);
		},
		onError: (err) => {
			toast.error(`Registration failed: ${err.message}`);
		},
	});

	const onStep1Complete = (data: { email: string; phone: string }) => {
		setContactData(data);
		setStep(2);
	};

	const onStep2Complete = (data: { password: string }) => {
		setPassword(data.password);
		setStep(3);
	};

	if (step === 4) {
		return <SuccessStep />;
	}

	return (
		<div className="min-h-screen flex flex-col bg-linear-to-br from-slate-50 via-slate-100 to-white relative overflow-hidden">
			{/* Background Deco */}
			<div className="absolute inset-0 overflow-hidden pointer-events-none">
				<div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-100/30 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
				<div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-slate-200/40 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />
			</div>

			<header className="relative z-10 w-full px-6 py-10 flex flex-col items-center">
				<div className="flex items-center gap-3 mb-4">
					<div className="w-12 h-12 rounded-xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
						<OfficeIcon className="w-6 h-6 text-white" />
					</div>
					<h1 className="text-3xl font-bold text-slate-900 tracking-tight">
						SIF Registration
					</h1>
				</div>
				<div className="flex items-center gap-4 mb-2">
					<div
						className={`h-2 w-12 rounded-full transition-colors ${step >= 1 ? "bg-blue-600" : "bg-slate-200"}`}
					/>
					<div
						className={`h-2 w-12 rounded-full transition-colors ${step >= 2 ? "bg-blue-600" : "bg-slate-200"}`}
					/>
					<div
						className={`h-2 w-12 rounded-full transition-colors ${step >= 3 ? "bg-blue-600" : "bg-slate-200"}`}
					/>
				</div>
				<p className="text-slate-500 text-center max-w-md">
					{step === 1 && "Verify your email and phone number."}
					{step === 2 && "Create a secure password for your account."}
					{step === 3 &&
						"Almost there! Tell us a bit more about yourself."}
				</p>
			</header>

			<main className="relative z-10 flex-1 w-full px-4 pb-12">
				<Card className="w-full max-w-2xl mx-auto shadow-xl border-slate-200 bg-white/80 backdrop-blur-sm">
					<CardHeader className="space-y-1">
						<CardTitle className="text-2xl font-bold text-slate-900">
							{step === 1 && "Contact Verification"}
							{step === 2 && "Security Setup"}
							{step === 3 && "Additional Details"}
						</CardTitle>
						<CardDescription>
							{step === 1 &&
								"Verify your email and phone to secure your account"}
							{step === 2 &&
								"Ensure your account is protected with a strong password"}
							{step === 3 &&
								"Required fields to complete your registration"}
						</CardDescription>
					</CardHeader>
					<CardContent>
						{step === 1 && (
							<EmailPhoneStep onComplete={onStep1Complete} />
						)}

						{step === 2 && (
							<PasswordStep
								onBack={() => setStep(1)}
								onComplete={onStep2Complete}
							/>
						)}

						{step === 3 && (
							<div className="space-y-6">
								<FieldsForm
									fields={fields.data}
									onSubmit={registrationMutation.mutate}
									onBack={() => setStep(2)}
									isLoading={registrationMutation.isPending}
								/>
								{registrationMutation.error && (
									<Alert variant="destructive">
										<AlertDescription>
											{registrationMutation.error.message}
										</AlertDescription>
									</Alert>
								)}
							</div>
						)}
					</CardContent>
				</Card>
			</main>
		</div>
	);
}
