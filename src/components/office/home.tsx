import type { AuthPayload } from "@/lib/auth";
import { Calendar, Settings, UserCog, Wrench } from "lucide-react";
import type { ComponentType } from "react";
import { UserIcon } from "@/components/svgs";
import { Action } from "../general/action";
import { Header } from "./header";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

type DashboardItem = {
	title: string;
	description: string;
	icon: ComponentType<{ className?: string }>;
	iconColor: string;
	iconBg: string;
	actions: Array<{ to: string; label: string }>;
};

const ADMIN_DASHBOARD_ITEMS: DashboardItem[] = [
	{
		title: "Registrations",
		description: "Manage registrations",
		icon: UserIcon,
		iconColor: "text-blue-600",
		iconBg: "bg-blue-50",
		actions: [
			{ to: "/office/registration/view", label: "View registrations" },
			{
				to: "/office/registration/edit",
				label: "Modify registration details",
			},
		],
	},
	{
		title: "Equipments",
		description: "Manage equipments",
		icon: Wrench,
		iconColor: "text-orange-600",
		iconBg: "bg-orange-50",
		actions: [
			{
				to: "/office/equipment/edit",
				label: "Modify list of equipments",
			},
		],
	},
	{
		title: "Bookings",
		description: "Manage bookings",
		icon: Calendar,
		iconColor: "text-green-600",
		iconBg: "bg-green-50",
		actions: [
			{
				to: "/office/booking/view",
				label: "View bookings",
			},
		],
	},
	{
		title: "Operators",
		description: "Manage operator accounts and assignments",
		icon: UserCog,
		iconColor: "text-violet-600",
		iconBg: "bg-violet-50",
		actions: [
			{
				to: "/office/operators",
				label: "Manage operators",
			},
		],
	},
	{
		title: "Analytics",
		description: "View equipment and booking statistics",
		icon: Calendar,
		iconColor: "text-indigo-600",
		iconBg: "bg-indigo-50",
		actions: [
			{
				to: "/office/analytics",
				label: "View detailed analytics",
			},
		],
	},
	{
		title: "Configuration",
		description: "Manage system configuration",
		icon: Settings,
		iconColor: "text-slate-600",
		iconBg: "bg-slate-100",
		actions: [
			{
				to: "/office/configuration",
				label: "Update system configuration",
			},
		],
	},
];

const OPERATOR_DASHBOARD_ITEMS: DashboardItem[] = [
	{
		title: "Bookings",
		description: "View and manage assigned equipment bookings",
		icon: Calendar,
		iconColor: "text-green-600",
		iconBg: "bg-green-50",
		actions: [
			{
				to: "/office/booking/view",
				label: "View bookings",
			},
		],
	},
];

export function Home({ user }: { user: AuthPayload }) {
	const dashboardItems =
		user.role === "admin"
			? ADMIN_DASHBOARD_ITEMS
			: OPERATOR_DASHBOARD_ITEMS;

	return (
		<div className="min-h-screen flex flex-col bg-slate-50/50">
			<Header user={user} />

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

					<div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
						{dashboardItems.map((item) => (
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
										<CardTitle className="text-lg">
											{item.title}
										</CardTitle>
										<CardDescription>
											{item.description}
										</CardDescription>
									</div>
								</CardHeader>
								<CardContent className="p-4 grid gap-3">
									{item.actions.map((action) => (
										<Action
											key={action.to}
											to={action.to}
											label={action.label}
										/>
									))}
								</CardContent>
							</Card>
						))}
					</div>
				</div>
			</main>
		</div>
	);
}
