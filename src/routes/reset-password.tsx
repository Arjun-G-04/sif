import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useId, useState } from "react";
import { resetPassword } from "@/lib/auth";
import { LockIcon } from "@/components/svgs";
import { CheckCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";

export const Route = createFileRoute("/reset-password")({
	component: ResetPasswordPage,
	validateSearch: (search) => {
		return {
			token: (search.token as string) || "",
		};
	},
});

function ResetPasswordPage() {
	const { token } = Route.useSearch();
	const navigate = useNavigate();
	const [password, setPassword] = useState("");
	const [confirmPassword, setConfirmPassword] = useState("");
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [isSuccess, setIsSuccess] = useState(false);
	const [countdown, setCountdown] = useState(3);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (password !== confirmPassword) {
			setError("Passwords do not match");
			return;
		}
		if (password.length < 8) {
			setError("Password must be at least 8 characters");
			return;
		}

		setIsLoading(true);
		setError(null);

		try {
			await resetPassword({ data: { token, password } });
			setIsSuccess(true);

			// Start countdown
			const timer = setInterval(() => {
				setCountdown((prev) => {
					if (prev <= 1) {
						clearInterval(timer);
						navigate({ to: "/" });
						return 0;
					}
					return prev - 1;
				});
			}, 1000);
		} catch (err) {
			setError((err as Error).message);
		} finally {
			setIsLoading(false);
		}
	};

	const id1 = useId();
	const id2 = useId();

	if (!token) {
		return (
			<div className="h-screen flex items-center justify-center p-4 bg-slate-50 font-sans">
				<Alert
					variant="destructive"
					className="max-w-md bg-white border-red-200"
				>
					<AlertDescription className="text-red-800 font-semibold text-center italic">
						Malformed reset link. Please try again.
					</AlertDescription>
				</Alert>
			</div>
		);
	}

	return (
		<div className="h-screen flex items-center justify-center p-4 md:p-8 bg-slate-50 font-sans">
			<Card className="w-full max-w-sm backdrop-blur-xl bg-white/90 border-slate-200 rounded-2xl shadow-xl overflow-hidden relative">
				<div className="absolute top-0 left-0 w-full h-1 bg-blue-600" />
				<CardHeader className="text-center pt-8">
					<div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-blue-600 shadow-lg mb-4 mx-auto">
						{isSuccess ? (
							<CheckCircle className="w-8 h-8 text-white" />
						) : (
							<LockIcon className="w-8 h-8 text-white fill-current" />
						)}
					</div>
					<CardTitle className="text-2xl font-extrabold text-slate-800 tracking-tight">
						{isSuccess ? "Password Reset" : "Reset Password"}
					</CardTitle>
					<CardDescription className="text-slate-500 font-medium text-sm">
						{isSuccess
							? "Your password has been updated successfully"
							: "Enter your new password below"}
					</CardDescription>
				</CardHeader>

				<CardContent className="px-6 pb-8">
					{isSuccess ? (
						<div className="space-y-6">
							<Alert className="rounded-xl border-green-100 bg-green-50 text-green-800 py-3">
								<AlertDescription className="font-medium text-sm text-center">
									Redirecting to login in {countdown}{" "}
									seconds...
								</AlertDescription>
							</Alert>
							<Link to="/">
								<Button className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg shadow-blue-500/10 transition-all">
									Login Now
								</Button>
							</Link>
						</div>
					) : (
						<form onSubmit={handleSubmit} className="space-y-5">
							<Field>
								<FieldLabel htmlFor="password">
									New Password
								</FieldLabel>
								<div className="relative">
									<div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
										<LockIcon className="w-4 h-4" />
									</div>
									<Input
										id={id1}
										type="password"
										value={password}
										onChange={(e) =>
											setPassword(e.target.value)
										}
										className="pl-10 rounded-xl border-slate-200 bg-slate-50/50 focus:bg-white transition-all"
										placeholder="Minimum 8 characters"
										required
									/>
								</div>
							</Field>

							<Field>
								<FieldLabel htmlFor="confirmPassword">
									Confirm Password
								</FieldLabel>
								<div className="relative">
									<div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
										<LockIcon className="w-4 h-4" />
									</div>
									<Input
										id={id2}
										type="password"
										value={confirmPassword}
										onChange={(e) =>
											setConfirmPassword(e.target.value)
										}
										className="pl-10 rounded-xl border-slate-200 bg-slate-50/50 focus:bg-white transition-all"
										placeholder="Repeat your password"
										required
									/>
								</div>
							</Field>

							{error && (
								<Alert
									variant="destructive"
									className="rounded-xl border-red-100 bg-red-50 text-red-600 py-2"
								>
									<AlertDescription className="font-medium text-xs">
										{error}
									</AlertDescription>
								</Alert>
							)}

							<Button
								type="submit"
								disabled={isLoading}
								className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg shadow-blue-500/10 transition-all transform active:scale-[0.98]"
							>
								{isLoading ? (
									<div className="flex items-center gap-2">
										<Spinner className="text-white h-4 w-4" />
										<span>Saving...</span>
									</div>
								) : (
									<div className="flex items-center justify-center gap-2">
										<span>Update Password</span>
									</div>
								)}
							</Button>
						</form>
					)}
				</CardContent>
			</Card>
		</div>
	);
}
