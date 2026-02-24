import { createFileRoute, Link } from "@tanstack/react-router";
import { useId, useState } from "react";
import { requestPasswordReset } from "@/lib/auth";
import { ArrowLeftIcon, ArrowRightIcon } from "@/components/svgs";
import { Mail } from "lucide-react";
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

export const Route = createFileRoute("/forgot")({
	component: ForgotPage,
});

function ForgotPage() {
	const [email, setEmail] = useState("");
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [isSubmitted, setIsSubmitted] = useState(false);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setIsLoading(true);
		setError(null);

		try {
			await requestPasswordReset({ data: { email } });
			setIsSubmitted(true);
		} catch (err) {
			setError((err as Error).message);
		} finally {
			setIsLoading(false);
		}
	};

	const id = useId();

	return (
		<div className="h-screen flex items-center justify-center p-4 md:p-8 bg-slate-50 font-sans">
			<Card className="w-full max-w-sm backdrop-blur-xl bg-white/90 border-slate-200 rounded-2xl shadow-xl overflow-hidden relative">
				<div className="absolute top-0 left-0 w-full h-1 bg-blue-600" />
				<CardHeader className="text-center pt-8">
					<div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-blue-600 shadow-lg mb-4 mx-auto">
						<Mail className="w-8 h-8 text-white" />
					</div>
					<CardTitle className="text-2xl font-extrabold text-slate-800 tracking-tight">
						{isSubmitted ? "Email Sent" : "Forgot Password?"}
					</CardTitle>
					<CardDescription className="text-slate-500 font-medium text-sm">
						{isSubmitted
							? "Check your inbox for a reset link"
							: "Enter your email to reset your password"}
					</CardDescription>
				</CardHeader>

				<CardContent className="px-6 pb-8">
					{isSubmitted ? (
						<div className="space-y-6">
							<Alert className="rounded-xl border-blue-100 bg-blue-50 text-blue-800 py-3">
								<AlertDescription className="font-medium text-sm">
									If an account exists for {email}, you will
									receive a password reset link shortly.
								</AlertDescription>
							</Alert>
							<Link to="/">
								<Button className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg shadow-blue-500/10 transition-all flex items-center justify-center gap-2">
									<ArrowLeftIcon className="w-4 h-4" />
									<span>Back to Login</span>
								</Button>
							</Link>
						</div>
					) : (
						<form onSubmit={handleSubmit} className="space-y-5">
							<Field>
								<FieldLabel htmlFor="email">Email</FieldLabel>
								<div className="relative">
									<div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
										<Mail className="w-4 h-4" />
									</div>
									<Input
										id={id}
										type="email"
										value={email}
										onChange={(e) =>
											setEmail(e.target.value)
										}
										className="pl-10 rounded-xl border-slate-200 bg-slate-50/50 focus:bg-white transition-all focus:ring-blue-500/20"
										placeholder="Enter your registered email"
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
										<span>Processing...</span>
									</div>
								) : (
									<div className="flex items-center justify-center gap-2">
										<span>Send Reset Link</span>
										<ArrowRightIcon className="w-4 h-4" />
									</div>
								)}
							</Button>

							<div className="text-center">
								<Link
									to="/"
									className="text-xs font-semibold text-slate-500 hover:text-blue-600 transition-colors inline-flex items-center gap-1"
								>
									<ArrowLeftIcon className="w-3 h-3" />
									Back to Login
								</Link>
							</div>
						</form>
					)}
				</CardContent>
			</Card>
		</div>
	);
}
