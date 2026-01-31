import { WrenchIcon } from "@/components/svgs";
import { Calendar } from "lucide-react";
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
import { Action } from "../general/action";

const DASHBOARD_ITEMS = [
	{
		title: "Equipments",
		description: "Book available equipments",
		icon: WrenchIcon,
		iconColor: "text-indigo-600",
		iconBg: "bg-indigo-50",
		actions: [
			{
				to: "/book",
				label: "View available equipments",
			},
		],
	},
	{
		title: "Bookings",
		description: "Your equipment bookings",
		icon: Calendar,
		iconColor: "text-emerald-600",
		iconBg: "bg-emerald-50",
		actions: [
			{
				to: "/bookings",
				label: "View my bookings",
			},
		],
	},
];

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
						{DASHBOARD_ITEMS.map((item) => (
							<Card
								key={item.title}
								className="shadow-sm border-slate-200"
							>
								<CardHeader className="flex flex-row items-center gap-4 space-y-0">
									<div
										className={`h-10 w-10 rounded-full flex items-center justify-center ${item.iconBg} ${item.iconColor}`}
									>
										<item.icon className="w-5 h-5" />
									</div>
									<div>
										<CardTitle className="text-lg text-slate-900">
											{item.title}
										</CardTitle>
										<CardDescription>
											{item.description}
										</CardDescription>
									</div>
								</CardHeader>
								<CardContent className="p-4 grid gap-3">
									{item.actions.length > 0 ? (
										item.actions.map((action) => (
											<Action
												key={action.to}
												to={action.to}
												label={action.label}
											/>
										))
									) : (
										<p className="text-sm text-slate-500 italic">
											More features coming soon...
										</p>
									)}
								</CardContent>
							</Card>
						))}
					</div>
				</div>
			</main>
		</div>
	);
}
