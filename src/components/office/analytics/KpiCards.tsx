import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { AnalyticsData, KpiStats } from "./types";

interface KpiCardsProps {
	stats: KpiStats;
	selectedEquipment: AnalyticsData["equipments"][number] | null;
	totalEquipmentCount: number;
}

export function KpiCards({
	stats,
	selectedEquipment,
	totalEquipmentCount,
}: KpiCardsProps) {
	return (
		<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
			{/* Revenue Card */}
			<Card className="shadow-sm border-slate-200 bg-white">
				<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
					<CardTitle className="text-sm font-medium text-slate-600">
						{selectedEquipment
							? "Equipment Revenue"
							: "Total Revenue"}
					</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="text-2xl font-bold text-slate-900">
						₹{stats.totalRevenue.toLocaleString()}
					</div>
					<p className="text-xs text-muted-foreground mt-1">
						{selectedEquipment
							? `${stats.share}% of total facility revenue`
							: `Across ${stats.totalBookings} completed bookings`}
					</p>
				</CardContent>
			</Card>

			{/* Bookings Count Card */}
			<Card className="shadow-sm border-slate-200 bg-white">
				<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
					<CardTitle className="text-sm font-medium text-slate-600">
						{selectedEquipment
							? "Equipment Bookings"
							: "Total Bookings"}
					</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="text-2xl font-bold text-slate-900">
						{stats.totalBookings}
					</div>
					<p className="text-xs text-muted-foreground mt-1">
						Completed instrument sessions
					</p>
				</CardContent>
			</Card>

			{/* Average Ticket Card */}
			<Card className="shadow-sm border-slate-200 bg-white">
				<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
					<CardTitle className="text-sm font-medium text-slate-600">
						Avg. Booking Value
					</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="text-2xl font-bold text-slate-900">
						₹{stats.avgTicket.toLocaleString()}
					</div>
					<p className="text-xs text-muted-foreground mt-1">
						Average per session ticket
					</p>
				</CardContent>
			</Card>

			{/* Equipment Rate / Facility Scope Card */}
			<Card className="shadow-sm border-slate-200 bg-white">
				<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
					<CardTitle className="text-sm font-medium text-slate-600">
						{selectedEquipment
							? "Standard Rate"
							: "Active Equipments"}
					</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="text-2xl font-bold text-slate-900 truncate">
						{selectedEquipment
							? selectedEquipment.usageRate || "Standard"
							: totalEquipmentCount}
					</div>
					<p className="text-xs text-muted-foreground mt-1 truncate">
						{selectedEquipment
							? selectedEquipment.departmentLab ||
								"Characterization Center"
							: "Active instruments in facility"}
					</p>
				</CardContent>
			</Card>
		</div>
	);
}
