import { type AuthPayload, officeSignOut } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { LogoutIcon, ArrowLeftIcon } from "@/components/svgs";
import { Link } from "@tanstack/react-router";

export function Header({
	user,
	backTo,
}: {
	user: AuthPayload;
	backTo?: string;
}) {
	const handleLogout = async () => {
		await officeSignOut();
		window.location.reload();
	};

	return (
		<header className="sticky top-0 z-50 w-full border-b bg-white/80 backdrop-blur-md px-4 md:px-6">
			<div className="flex h-16 items-center justify-between">
				<div className="flex items-center gap-4">
					{backTo && (
						<Button
							asChild
							variant="ghost"
							size="icon"
							className="h-9 w-9 rounded-full hover:bg-slate-100 text-slate-500 hover:text-slate-900 transition-colors"
						>
							<Link to={backTo}>
								<ArrowLeftIcon className="w-5 h-5" />
							</Link>
						</Button>
					)}
					<Link
						to="/office"
						className="flex items-center gap-2 group"
					>
						<div className="h-8 w-10 rounded-lg bg-red-600 flex items-center justify-center text-white font-bold text-sm shadow-sm group-hover:shadow-md transition-all">
							SIF
						</div>
						<h1 className="text-xl font-semibold tracking-tight text-slate-900">
							Office Dashboard
						</h1>
					</Link>
				</div>
				<div className="flex items-center gap-4">
					<div className="hidden md:flex flex-col items-end text-sm">
						<span className="font-medium text-slate-900">
							{user.username}
						</span>
						<span className="text-slate-500 text-xs">
							Administrator
						</span>
					</div>
					<Button
						variant="outline"
						size="sm"
						onClick={handleLogout}
						className="gap-2 rounded-lg border-slate-200 hover:bg-red-50 hover:text-red-600 hover:border-red-100 transition-all font-medium"
					>
						<LogoutIcon className="w-4 h-4" />
						<span>Sign Out</span>
					</Button>
				</div>
			</div>
		</header>
	);
}
