import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { useId } from "react";

interface AuthCredentialsCardProps {
	isAuthenticated: boolean;
	tokenExpiresAt?: string | null;
	username: string;
	setUsername: (val: string) => void;
	password: string;
	setPassword: (val: string) => void;
	onSubmit: (e: React.FormEvent) => void;
	isPending: boolean;
}

export function AuthCredentialsCard({
	isAuthenticated,
	tokenExpiresAt,
	username,
	setUsername,
	password,
	setPassword,
	onSubmit,
	isPending,
}: AuthCredentialsCardProps) {
	const usernameId = useId();
	const passwordId = useId();

	return (
		<Card className="border-slate-200">
			<CardHeader>
				<CardTitle>I-STEM API Authentication</CardTitle>
				<CardDescription>
					Authenticate against the I-STEM Staging API to retrieve an
					access token.
				</CardDescription>
			</CardHeader>
			<CardContent>
				{isAuthenticated ? (
					<div className="bg-teal-50 border border-teal-200 p-4 rounded-lg">
						<div className="space-y-1">
							<div className="flex items-center gap-2">
								<span className="h-2.5 w-2.5 rounded-full bg-teal-500 animate-pulse" />
								<span className="font-semibold text-teal-950">
									Successfully Authenticated
								</span>
							</div>
							<p className="text-teal-800 text-sm">
								Token expires on:{" "}
								{tokenExpiresAt
									? new Date(tokenExpiresAt).toLocaleString(
											"en-IN",
											{
												dateStyle: "medium",
												timeStyle: "medium",
											},
										)
									: "Unknown"}
							</p>
						</div>
					</div>
				) : (
					<form onSubmit={onSubmit} className="space-y-4 max-w-md">
						<div className="space-y-2">
							<Label htmlFor={usernameId}>I-STEM Username</Label>
							<Input
								id={usernameId}
								type="text"
								placeholder="e.g. IR01189"
								value={username}
								onChange={(e) => setUsername(e.target.value)}
								required
							/>
						</div>
						<div className="space-y-2">
							<Label htmlFor={passwordId}>I-STEM Password</Label>
							<Input
								id={passwordId}
								type="password"
								value={password}
								onChange={(e) => setPassword(e.target.value)}
								required
							/>
						</div>
						<Button type="submit" disabled={isPending}>
							{isPending && <Spinner />}
							{isPending ? "Connecting..." : "Authenticate"}
						</Button>
					</form>
				)}
			</CardContent>
		</Card>
	);
}
