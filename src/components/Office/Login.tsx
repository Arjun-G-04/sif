import { officeSignIn } from "@/lib/auth";
import { useState } from "react";

import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Spinner } from "@/components/ui/spinner";
import {
	OfficeIcon,
	UserIcon,
	LockIcon,
	EyeIcon,
	EyeOffIcon,
	ArrowRightIcon,
} from "@/components/svgs";

export function Login() {
	const [username, setUsername] = useState("");
	const [password, setPassword] = useState("");
	const [showPassword, setShowPassword] = useState(false);
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setIsLoading(true);
		setError(null);

		try {
			await officeSignIn({
				data: {
					username,
					password,
				},
			});
			window.location.reload();
		} catch (err) {
			setError((err as Error).message);
		} finally {
			setIsLoading(false);
		}
	};

	return (
		<div className="min-h-screen flex items-center justify-center bg-linear-to-br from-slate-50 via-red-50 to-white relative overflow-hidden">
			{/* Animated background elements */}
			<div className="absolute inset-0 overflow-hidden">
				<div className="absolute -top-40 -right-40 w-80 h-80 bg-red-200 rounded-full mix-blend-multiply filter blur-3xl opacity-40 animate-pulse" />
				<div className="absolute -bottom-40 -left-40 w-80 h-80 bg-red-100 rounded-full mix-blend-multiply filter blur-3xl opacity-40 animate-pulse delay-1000" />
				<div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-red-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-pulse delay-500" />
			</div>

			{/* Login Card */}
			<div className="relative z-10 w-full max-w-md px-4">
				<Card className="backdrop-blur-xl bg-white/70 border-slate-200 rounded-3xl shadow-xl">
					<CardHeader className="text-center space-y-2">
						<div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-linear-to-br from-red-500 to-red-400 shadow-lg mb-4 mx-auto">
							<OfficeIcon className="w-8 h-8 text-white" />
						</div>
						<CardTitle className="text-3xl font-bold text-slate-800 tracking-tight">
							Office
						</CardTitle>
						<CardDescription className="text-slate-500 text-sm">
							Sign in to access the admin dashboard
						</CardDescription>
					</CardHeader>

					<CardContent>
						<form onSubmit={handleSubmit} className="space-y-6">
							{/* Username Field */}
							<Field>
								<FieldLabel htmlFor="username">
									Username
								</FieldLabel>
								<div className="relative">
									<div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
										<UserIcon className="text-slate-400" />
									</div>
									<Input
										id="username"
										type="text"
										value={username}
										onChange={(e) =>
											setUsername(e.target.value)
										}
										className="pl-10 focus-visible:border-red-400 focus-visible:ring-red-500/50"
										placeholder="Enter your username"
										required
									/>
								</div>
							</Field>

							{/* Password Field */}
							<Field>
								<FieldLabel htmlFor="password">
									Password
								</FieldLabel>
								<div className="relative">
									<div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
										<LockIcon className="text-slate-400" />
									</div>
									<Input
										id="password"
										type={
											showPassword ? "text" : "password"
										}
										value={password}
										onChange={(e) =>
											setPassword(e.target.value)
										}
										className="pl-10 pr-10 focus-visible:border-red-400 focus-visible:ring-red-500/50"
										placeholder="Enter your password"
										required
									/>
									<button
										type="button"
										onClick={() =>
											setShowPassword(!showPassword)
										}
										className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-700 transition-colors"
									>
										{showPassword ? (
											<EyeOffIcon />
										) : (
											<EyeIcon />
										)}
									</button>
								</div>
							</Field>

							{/* Error Message */}
							{error && (
								<Alert variant="destructive">
									<AlertDescription>{error}</AlertDescription>
								</Alert>
							)}

							{/* Forgot Password */}
							<div className="flex justify-end text-sm">
								<a
									href="#"
									className="text-red-600 hover:text-red-500 transition-colors"
								>
									Forgot password?
								</a>
							</div>

							{/* Submit Button */}
							<Button
								type="submit"
								disabled={isLoading}
								className="w-full py-3 px-4 bg-linear-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 text-white font-semibold rounded-xl shadow-lg shadow-red-500/30 hover:shadow-red-500/50"
							>
								{isLoading ? (
									<>
										<Spinner className="text-white" />
										Signing in...
									</>
								) : (
									<>
										Sign In
										<ArrowRightIcon />
									</>
								)}
							</Button>
						</form>
					</CardContent>
				</Card>
			</div>
		</div>
	);
}
