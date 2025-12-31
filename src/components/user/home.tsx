import { OfficeIcon } from "@/components/svgs";
import {
	Card,
	CardHeader,
	CardTitle,
	CardDescription,
	CardContent,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import type { AuthPayload } from "@/lib/auth";
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
							Access SIF services and manage your requests.
						</p>
					</div>

					<Separator className="bg-slate-200" />

					{/* Dashboard items */}
					<div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
						<Card className="shadow-sm border-slate-200">
							<CardHeader className="flex flex-row items-center gap-4 space-y-0">
								<div className="h-10 w-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
									<OfficeIcon className="w-5 h-5" />
								</div>
								<div>
									<CardTitle className="text-lg">
										Services
									</CardTitle>
									<CardDescription>
										Explore available services
									</CardDescription>
								</div>
							</CardHeader>
							<CardContent className="p-4">
								<p className="text-sm text-slate-500">
									More features coming soon...
								</p>
							</CardContent>
						</Card>
					</div>
				</div>
			</main>
		</div>
	);
}
