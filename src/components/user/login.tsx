import { useId, useState } from "react";
import {
	ArrowRightIcon,
	EyeIcon,
	EyeOffIcon,
	LockIcon,
	OfficeIcon,
	UserIcon,
} from "../svgs";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "../ui/card";
import { Field, FieldLabel } from "../ui/field";
import { Input } from "../ui/input";
import { Alert, AlertDescription } from "../ui/alert";
import { Button } from "../ui/button";
import { Spinner } from "../ui/spinner";
import { Separator } from "../ui/separator";
import { Action } from "../general/action";

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
			await new Promise((resolve) => setTimeout(resolve, 4000));
			window.location.reload();
		} catch (err) {
			setError((err as Error).message);
		} finally {
			setIsLoading(false);
		}
	};

	return (
		<Card className="w-full max-w-sm backdrop-blur-xl bg-white/90 border-slate-200 rounded-2xl shadow-xl overflow-hidden relative">
			<div className="absolute top-0 left-0 w-full h-1 bg-blue-600" />
			<CardHeader className="text-center pt-8">
				<div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-blue-600 shadow-lg mb-4 mx-auto">
					<OfficeIcon className="w-8 h-8 text-white fill-current" />
				</div>
				<CardTitle className="text-2xl font-extrabold text-slate-800 tracking-tight">
					Portal Login
				</CardTitle>
				<CardDescription className="text-slate-500 font-medium text-sm">
					Enter your credentials to continue
				</CardDescription>
			</CardHeader>

			<CardContent className="px-6 pb-8">
				<form onSubmit={handleSubmit} className="space-y-5">
					<Field>
						<FieldLabel htmlFor="username">Username</FieldLabel>
						<div className="relative">
							<div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
								<UserIcon />
							</div>
							<Input
								id={useId()}
								type="text"
								value={username}
								onChange={(e) => setUsername(e.target.value)}
								className="pl-10 rounded-xl border-slate-200 bg-slate-50/50 focus:bg-white transition-all focus:ring-blue-500/20"
								placeholder="Enter your username"
								required
							/>
						</div>
					</Field>

					<Field>
						<FieldLabel htmlFor="password">Password</FieldLabel>
						<div className="relative">
							<div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
								<LockIcon />
							</div>
							<Input
								id={useId()}
								type={showPassword ? "text" : "password"}
								value={password}
								onChange={(e) => setPassword(e.target.value)}
								className="pl-10 pr-10 rounded-xl border-slate-200 bg-slate-50/50 focus:bg-white transition-all focus:ring-blue-500/20"
								placeholder="Enter your password"
								required
							/>
							<button
								type="button"
								onClick={() => setShowPassword(!showPassword)}
								className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-blue-600 transition-colors"
							>
								{showPassword ? (
									<EyeOffIcon className="w-4 h-4" />
								) : (
									<EyeIcon className="w-4 h-4" />
								)}
							</button>
						</div>
					</Field>

					{error && (
						<Alert
							variant="destructive"
							className="rounded-xl border-blue-100 bg-blue-50 text-blue-600 py-2"
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
								<span>Authenticating...</span>
							</div>
						) : (
							<div className="flex items-center justify-center gap-2">
								<span>Sign In</span>
								<ArrowRightIcon className="w-4 h-4" />
							</div>
						)}
					</Button>
				</form>

				<div className="mt-8 space-y-4">
					<div className="relative">
						<div className="absolute inset-0 flex items-center">
							<Separator className="bg-slate-200" />
						</div>
						<div className="relative flex justify-center text-xs uppercase">
							<span className="bg-white/90 backdrop-blur-xl px-2 text-slate-500 font-semibold tracking-wider">
								New here?
							</span>
						</div>
					</div>

					<Action to="/registration" label="New user registration" />
				</div>
			</CardContent>
		</Card>
	);
}
