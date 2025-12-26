import type { AuthPayload } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
	Card,
	CardHeader,
	CardTitle,
	CardDescription,
	CardContent,
} from "@/components/ui/card";
import { UserIcon, ArrowRightIcon } from "@/components/svgs";
import { Link } from "@tanstack/react-router";
import { Header } from "./header";

export function Home({ user }: { user: AuthPayload }) {
	return (
		<div className="min-h-screen flex flex-col bg-slate-50/50">
			<Header user={user} />

			{/* Main Content */}
			<main className="flex-1 p-4 md:p-6 lg:p-8">
				<div className="w-full space-y-8">
					<div className="space-y-2">
						<h2 className="text-3xl font-bold tracking-tight text-slate-900">
							Welcome back, {user.username}!
						</h2>
						<p className="text-slate-500 text-lg">
							Manage your office operations from this dashboard.
						</p>
					</div>

					<Separator className="bg-slate-200" />

					{/* Dashboard items */}
					<div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
						<Card className="shadow-sm border-slate-200">
							<CardHeader className="flex flex-row items-center gap-4 space-y-0">
								<div className="h-10 w-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
									<UserIcon className="w-5 h-5" />
								</div>
								<div>
									<CardTitle className="text-lg">
										User Management
									</CardTitle>
									<CardDescription>
										Manage registrations and users
									</CardDescription>
								</div>
							</CardHeader>
							<CardContent className="p-4 grid gap-3">
								<Button
									asChild
									variant="ghost"
									className="w-full h-auto py-4 px-4 justify-between hover:bg-blue-50/50 hover:text-blue-700 group border border-slate-100 rounded-xl transition-all"
								>
									<Link to="/office/user/registration">
										<span className="font-medium text-slate-700 group-hover:text-blue-700">
											Modify registration details
										</span>
										<ArrowRightIcon className="w-4 h-4 text-slate-400 group-hover:translate-x-1 group-hover:text-blue-600 transition-all" />
									</Link>
								</Button>
							</CardContent>
						</Card>
					</div>
				</div>
			</main>
		</div>
	);
}
