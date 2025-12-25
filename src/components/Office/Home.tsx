import { AuthPayload, officeSignOut } from "@/lib/auth";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckIcon, LogoutIcon } from "@/components/svgs";

export function Home({ user }: { user: AuthPayload }) {
	const handleLogout = async () => {
		await officeSignOut();
		window.location.reload();
	};

	return (
		<div className="min-h-screen flex items-center justify-center bg-linear-to-br from-slate-50 via-red-50 to-white relative overflow-hidden">
			{/* Animated background elements */}
			<div className="absolute inset-0 overflow-hidden">
				<div className="absolute -top-40 -right-40 w-80 h-80 bg-red-200 rounded-full mix-blend-multiply filter blur-3xl opacity-40 animate-pulse" />
				<div className="absolute -bottom-40 -left-40 w-80 h-80 bg-red-100 rounded-full mix-blend-multiply filter blur-3xl opacity-40 animate-pulse delay-1000" />
				<div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-red-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-pulse delay-500" />
			</div>

			{/* Content */}
			<div className="relative z-10 w-full max-w-2xl px-4">
				<Card className="backdrop-blur-xl bg-white/70 border-slate-200 rounded-3xl shadow-xl">
					<CardHeader className="text-center space-y-4">
						<div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-linear-to-br from-green-500 to-green-400 shadow-lg mb-4 mx-auto">
							<CheckIcon className="w-8 h-8 text-white" />
						</div>
						<CardTitle className="text-3xl font-bold text-slate-800 tracking-tight">
							Welcome, {user.username}!
						</CardTitle>
					</CardHeader>

					<CardContent>
						{/* Logout Button */}
						<Button
							type="button"
							variant="outline"
							onClick={handleLogout}
							className="w-full py-3 px-4 rounded-xl"
						>
							<LogoutIcon />
							Sign Out
						</Button>
					</CardContent>
				</Card>
			</div>
		</div>
	);
}
