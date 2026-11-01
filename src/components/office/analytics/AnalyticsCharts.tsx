import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import {
	Bar,
	BarChart,
	CartesianGrid,
	Line,
	LineChart,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
} from "recharts";
import type {
	AnalyticsData,
	CategoryBreakdownPoint,
	EquipmentStat,
	TrendPoint,
} from "./types";

interface AnalyticsChartsProps {
	selectedEquipment: AnalyticsData["equipments"][number] | null;
	trendData: TrendPoint[];
	categoryBreakdown: CategoryBreakdownPoint[];
	equipmentStats: EquipmentStat[];
}

export function AnalyticsCharts({
	selectedEquipment,
	trendData,
	categoryBreakdown,
	equipmentStats,
}: AnalyticsChartsProps) {
	return (
		<div className="grid gap-6 lg:grid-cols-2">
			{/* Chart 1: Revenue Trend */}
			<Card className="shadow-sm border-slate-200 bg-white">
				<CardHeader className="pb-3">
					<div>
						<CardTitle className="text-lg font-semibold text-slate-900">
							{selectedEquipment
								? `${selectedEquipment.code} — Monthly Revenue Trend`
								: "Total Monthly Revenue Trend"}
						</CardTitle>
						<CardDescription>
							{selectedEquipment
								? "Revenue generated month by month for this instrument"
								: "Aggregate monthly revenue across all instruments"}
						</CardDescription>
					</div>
				</CardHeader>
				<CardContent className="h-[340px]">
					{trendData.length > 0 ? (
						<ResponsiveContainer width="100%" height="100%">
							<LineChart
								data={trendData}
								margin={{
									top: 10,
									right: 20,
									left: 10,
									bottom: 20,
								}}
							>
								<CartesianGrid
									strokeDasharray="3 3"
									vertical={false}
									stroke="#f1f5f9"
								/>
								<XAxis
									dataKey="month"
									tick={{ fontSize: 12, fill: "#64748b" }}
									tickLine={false}
									axisLine={{ stroke: "#e2e8f0" }}
								/>
								<YAxis
									tick={{ fontSize: 12, fill: "#64748b" }}
									tickLine={false}
									axisLine={{ stroke: "#e2e8f0" }}
									tickFormatter={(val) =>
										`₹${Number(val).toLocaleString()}`
									}
								/>
								<Tooltip
									formatter={(val: number, name: string) => [
										name === "revenue"
											? `₹${val.toLocaleString()}`
											: `${val} bookings`,
										name === "revenue"
											? "Revenue"
											: "Bookings",
									]}
									labelStyle={{
										fontWeight: 600,
										color: "#0f172a",
									}}
									contentStyle={{
										borderRadius: "8px",
										border: "1px solid #e2e8f0",
										boxShadow:
											"0 4px 6px -1px rgb(0 0 0 / 0.1)",
									}}
								/>
								<Line
									type="monotone"
									dataKey="revenue"
									name="revenue"
									stroke="#4f46e5"
									strokeWidth={2.5}
									dot={{
										r: 4,
										fill: "#4f46e5",
										strokeWidth: 2,
										stroke: "#ffffff",
									}}
									activeDot={{ r: 6, fill: "#4f46e5" }}
								/>
							</LineChart>
						</ResponsiveContainer>
					) : (
						<div className="h-full flex items-center justify-center text-slate-400 italic text-sm">
							No booking trend data available for the selected
							filter.
						</div>
					)}
				</CardContent>
			</Card>

			{/* Chart 2: Category Breakdown OR Revenue per Equipment */}
			{selectedEquipment ? (
				<Card className="shadow-sm border-slate-200 bg-white">
					<CardHeader className="pb-3">
						<CardTitle className="text-lg font-semibold text-slate-900">
							{selectedEquipment.code} — Utilization by Category
						</CardTitle>
						<CardDescription>
							Revenue breakdown by applicant category for this
							equipment
						</CardDescription>
					</CardHeader>
					<CardContent className="h-[340px]">
						{categoryBreakdown.length > 0 ? (
							<ResponsiveContainer width="100%" height="100%">
								<BarChart
									data={categoryBreakdown}
									margin={{
										top: 10,
										right: 20,
										left: 10,
										bottom: 30,
									}}
								>
									<CartesianGrid
										strokeDasharray="3 3"
										vertical={false}
										stroke="#f1f5f9"
									/>
									<XAxis
										dataKey="category"
										tick={{ fontSize: 11, fill: "#64748b" }}
										interval={0}
										angle={-15}
										textAnchor="end"
										tickLine={false}
										axisLine={{ stroke: "#e2e8f0" }}
									/>
									<YAxis
										tick={{ fontSize: 12, fill: "#64748b" }}
										tickLine={false}
										axisLine={{ stroke: "#e2e8f0" }}
										tickFormatter={(val) =>
											`₹${Number(val).toLocaleString()}`
										}
									/>
									<Tooltip
										formatter={(val: number) => [
											`₹${val.toLocaleString()}`,
											"Revenue",
										]}
										contentStyle={{
											borderRadius: "8px",
											border: "1px solid #e2e8f0",
											boxShadow:
												"0 4px 6px -1px rgb(0 0 0 / 0.1)",
										}}
									/>
									<Bar
										dataKey="revenue"
										fill="#0ea5e9"
										radius={[4, 4, 0, 0]}
									/>
								</BarChart>
							</ResponsiveContainer>
						) : (
							<div className="h-full flex items-center justify-center text-slate-400 italic text-sm">
								No category breakdown data available for this
								equipment.
							</div>
						)}
					</CardContent>
				</Card>
			) : (
				<Card className="shadow-sm border-slate-200 bg-white">
					<CardHeader className="pb-3">
						<CardTitle className="text-lg font-semibold text-slate-900">
							Revenue per Equipment
						</CardTitle>
						<CardDescription>
							Comparison of total collections across all
							instruments
						</CardDescription>
					</CardHeader>
					<CardContent className="h-[340px]">
						<ResponsiveContainer width="100%" height="100%">
							<BarChart
								data={equipmentStats}
								margin={{
									top: 10,
									right: 20,
									left: 10,
									bottom: 30,
								}}
							>
								<CartesianGrid
									strokeDasharray="3 3"
									vertical={false}
									stroke="#f1f5f9"
								/>
								<XAxis
									dataKey="code"
									tick={{ fontSize: 11, fill: "#64748b" }}
									interval={0}
									angle={-20}
									textAnchor="end"
									tickLine={false}
									axisLine={{ stroke: "#e2e8f0" }}
								/>
								<YAxis
									tick={{ fontSize: 12, fill: "#64748b" }}
									tickLine={false}
									axisLine={{ stroke: "#e2e8f0" }}
									tickFormatter={(val) =>
										`₹${Number(val).toLocaleString()}`
									}
								/>
								<Tooltip
									formatter={(
										val: number,
										_name: string,
										entry?: { payload?: EquipmentStat },
									) => [
										`₹${val.toLocaleString()} (${entry?.payload?.count ?? 0} bookings)`,
										"Revenue",
									]}
									labelFormatter={(code: string) => {
										const item = equipmentStats.find(
											(e) => e.code === code,
										);
										return item
											? `${item.name} (${item.code})`
											: code;
									}}
									contentStyle={{
										borderRadius: "8px",
										border: "1px solid #e2e8f0",
										boxShadow:
											"0 4px 6px -1px rgb(0 0 0 / 0.1)",
									}}
								/>
								<Bar
									dataKey="revenue"
									fill="#4f46e5"
									radius={[4, 4, 0, 0]}
								/>
							</BarChart>
						</ResponsiveContainer>
					</CardContent>
				</Card>
			)}
		</div>
	);
}
