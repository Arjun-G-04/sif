import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import {
	BarChart,
	Bar,
	XAxis,
	YAxis,
	CartesianGrid,
	Tooltip,
	ResponsiveContainer,
	LineChart,
	Line,
} from "recharts";
import { Header } from "@/components/office/header";
import { requireAdmin } from "@/lib/auth";
import { getAnalyticsData } from "@/services/analytics";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import {
	Select,
	SelectContent,
	SelectGroup,
	SelectItem,
	SelectLabel,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { useState, useMemo } from "react";
import {
	format,
	subDays,
	startOfYear,
	startOfDay,
	endOfDay,
	parseISO,
} from "date-fns";
import {
	Calendar,
	Layers,
	RotateCcw,
	Wrench,
	ArrowRight,
	Users,
} from "lucide-react";

export const Route = createFileRoute("/office/analytics/")({
	component: AnalyticsPage,
	loader: async () => {
		return await requireAdmin();
	},
});

function AnalyticsPage() {
	const user = Route.useLoaderData();
	const { data, isLoading } = useQuery({
		queryKey: ["analytics-data"],
		queryFn: () => getAnalyticsData(),
	});

	const [selectedEquipmentId, setSelectedEquipmentId] =
		useState<string>("all");
	const [selectedDemographic, setSelectedDemographic] =
		useState<string>("all");
	const [dateRangePreset, setDateRangePreset] = useState<string>("all");
	const [customFrom, setCustomFrom] = useState<string>("");
	const [customTo, setCustomTo] = useState<string>("");

	// Find the currently selected equipment object, if any
	const selectedEquipment = useMemo(() => {
		if (!data || selectedEquipmentId === "all") return null;
		return (
			data.equipments.find((e) => String(e.id) === selectedEquipmentId) ??
			null
		);
	}, [data, selectedEquipmentId]);

	// Human-readable date range description
	const dateRangeLabel = useMemo(() => {
		if (dateRangePreset === "30d") return "Last 30 Days";
		if (dateRangePreset === "90d") return "Last 3 Months";
		if (dateRangePreset === "180d") return "Last 6 Months";
		if (dateRangePreset === "ytd") return "This Year (YTD)";
		if (dateRangePreset === "custom") {
			if (customFrom && customTo) return `${customFrom} to ${customTo}`;
			if (customFrom) return `From ${customFrom}`;
			if (customTo) return `Until ${customTo}`;
			return "Custom Range";
		}
		return null;
	}, [dateRangePreset, customFrom, customTo]);

	// Filter bookings based on selected equipment, demographic, and date range
	const filteredBookings = useMemo(() => {
		if (!data) return [];

		let filtered = data.bookings;

		// 1. Filter by equipment
		if (selectedEquipmentId !== "all") {
			const eqId = Number(selectedEquipmentId);
			filtered = filtered.filter((b) => b.equipmentId === eqId);
		}

		// 2. Filter by user demographic value (encoded as "fieldId:value")
		if (selectedDemographic !== "all") {
			const colonIdx = selectedDemographic.indexOf(":");
			if (colonIdx !== -1) {
				const targetFieldId = selectedDemographic.slice(0, colonIdx);
				const targetValue = selectedDemographic.slice(colonIdx + 1);

				const userIdsWithOption = data.userFieldResponses
					.filter(
						(r) =>
							String(r.fieldId) === targetFieldId &&
							r.value === targetValue,
					)
					.map((r) => r.userId);

				filtered = filtered.filter((b) =>
					userIdsWithOption.includes(b.userId),
				);
			}
		}

		// 3. Filter by date range
		if (dateRangePreset !== "all") {
			const now = new Date();
			let fromDate: Date | null = null;
			let toDate: Date | null = null;

			if (dateRangePreset === "30d") {
				fromDate = subDays(now, 30);
			} else if (dateRangePreset === "90d") {
				fromDate = subDays(now, 90);
			} else if (dateRangePreset === "180d") {
				fromDate = subDays(now, 180);
			} else if (dateRangePreset === "ytd") {
				fromDate = startOfYear(now);
			} else if (dateRangePreset === "custom") {
				if (customFrom) {
					fromDate = startOfDay(parseISO(customFrom));
				}
				if (customTo) {
					toDate = endOfDay(parseISO(customTo));
				}
			}

			filtered = filtered.filter((b) => {
				if (!b.createdAt) return false;
				const bookingDate = new Date(b.createdAt);
				if (fromDate && bookingDate < fromDate) return false;
				if (toDate && bookingDate > toDate) return false;
				return true;
			});
		}

		return filtered;
	}, [
		data,
		selectedEquipmentId,
		selectedDemographic,
		dateRangePreset,
		customFrom,
		customTo,
	]);

	// Facility-wide total revenue (used for % share calculation)
	const totalFacilityRevenue = useMemo(() => {
		if (!data) return 0;
		return data.bookings.reduce((sum, b) => sum + (b.price || 0), 0);
	}, [data]);

	// Equipment breakdown across all active equipment (with demographic and date range filter applied)
	const equipmentStats = useMemo(() => {
		if (!data) return [];

		let baseBookings = data.bookings;

		// Demographic filter
		if (selectedDemographic !== "all") {
			const colonIdx = selectedDemographic.indexOf(":");
			if (colonIdx !== -1) {
				const targetFieldId = selectedDemographic.slice(0, colonIdx);
				const targetValue = selectedDemographic.slice(colonIdx + 1);

				const userIdsWithOption = data.userFieldResponses
					.filter(
						(r) =>
							String(r.fieldId) === targetFieldId &&
							r.value === targetValue,
					)
					.map((r) => r.userId);

				baseBookings = baseBookings.filter((b) =>
					userIdsWithOption.includes(b.userId),
				);
			}
		}

		// Date range filter
		if (dateRangePreset !== "all") {
			const now = new Date();
			let fromDate: Date | null = null;
			let toDate: Date | null = null;

			if (dateRangePreset === "30d") {
				fromDate = subDays(now, 30);
			} else if (dateRangePreset === "90d") {
				fromDate = subDays(now, 90);
			} else if (dateRangePreset === "180d") {
				fromDate = subDays(now, 180);
			} else if (dateRangePreset === "ytd") {
				fromDate = startOfYear(now);
			} else if (dateRangePreset === "custom") {
				if (customFrom) {
					fromDate = startOfDay(parseISO(customFrom));
				}
				if (customTo) {
					toDate = endOfDay(parseISO(customTo));
				}
			}

			baseBookings = baseBookings.filter((b) => {
				if (!b.createdAt) return false;
				const bookingDate = new Date(b.createdAt);
				if (fromDate && bookingDate < fromDate) return false;
				if (toDate && bookingDate > toDate) return false;
				return true;
			});
		}

		return data.equipments
			.map((eq) => {
				const eqBookings = baseBookings.filter(
					(b) => b.equipmentId === eq.id,
				);
				const totalRevenue = eqBookings.reduce(
					(sum, b) => sum + (b.price || 0),
					0,
				);
				return {
					id: eq.id,
					name: eq.name,
					code: eq.code || `EQ-${eq.id}`,
					revenue: totalRevenue,
					count: eqBookings.length,
					avgTicket:
						eqBookings.length > 0
							? Math.round(totalRevenue / eqBookings.length)
							: 0,
					departmentLab: eq.departmentLab,
				};
			})
			.sort((a, b) => b.revenue - a.revenue);
	}, [data, selectedDemographic, dateRangePreset, customFrom, customTo]);

	// Monthly chronological trend data
	const trendData = useMemo(() => {
		if (!filteredBookings.length) return [];

		const monthMap = new Map<
			string,
			{
				sortKey: string;
				month: string;
				revenue: number;
				bookings: number;
			}
		>();

		filteredBookings.forEach((b) => {
			const date = b.createdAt ? new Date(b.createdAt) : new Date();
			const sortKey = format(date, "yyyy-MM");
			const label = format(date, "MMM yyyy");

			let cur = monthMap.get(sortKey);
			if (!cur) {
				cur = {
					sortKey,
					month: label,
					revenue: 0,
					bookings: 0,
				};
				monthMap.set(sortKey, cur);
			}
			cur.revenue += b.price || 0;
			cur.bookings += 1;
		});

		return Array.from(monthMap.values())
			.sort((a, b) => a.sortKey.localeCompare(b.sortKey))
			.map((m) => ({
				month: m.month,
				revenue: m.revenue,
				bookings: m.bookings,
			}));
	}, [filteredBookings]);

	// Category breakdown for the selected equipment
	const categoryBreakdown = useMemo(() => {
		if (!data || selectedEquipmentId === "all") return [];

		const catField =
			data.filterFields.find((f) => /category/i.test(f.name)) ||
			data.filterFields[0];
		if (!catField) return [];

		const userCategoryMap = new Map<number, string>();
		data.userFieldResponses
			.filter((r) => r.fieldId === catField.id)
			.forEach((r) => {
				if (r.value) userCategoryMap.set(r.userId, r.value);
			});

		const map: Record<
			string,
			{ category: string; revenue: number; bookings: number }
		> = {};

		filteredBookings.forEach((b) => {
			const cat = userCategoryMap.get(b.userId) || "Other / Unspecified";
			if (!map[cat]) {
				map[cat] = { category: cat, revenue: 0, bookings: 0 };
			}
			map[cat].revenue += b.price || 0;
			map[cat].bookings += 1;
		});

		return Object.values(map).sort((a, b) => b.revenue - a.revenue);
	}, [data, selectedEquipmentId, filteredBookings]);

	// Aggregated key stats
	const stats = useMemo(() => {
		const totalRevenue = filteredBookings.reduce(
			(sum, b) => sum + (b.price || 0),
			0,
		);
		const totalBookings = filteredBookings.length;
		const avgTicket =
			totalBookings > 0 ? Math.round(totalRevenue / totalBookings) : 0;
		const share =
			totalFacilityRevenue > 0
				? ((totalRevenue / totalFacilityRevenue) * 100).toFixed(1)
				: "0";

		return { totalRevenue, totalBookings, avgTicket, share };
	}, [filteredBookings, totalFacilityRevenue]);

	if (isLoading || !data) {
		return (
			<div className="min-h-screen flex flex-col bg-slate-50/50">
				<Header user={user} backTo="/office" />
				<div className="flex-1 flex items-center justify-center">
					<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900" />
				</div>
			</div>
		);
	}

	const hasActiveFilters =
		selectedEquipmentId !== "all" ||
		selectedDemographic !== "all" ||
		dateRangePreset !== "all" ||
		Boolean(customFrom) ||
		Boolean(customTo);

	return (
		<div className="min-h-screen flex flex-col bg-slate-50/50">
			<Header user={user} backTo="/office" />

			<main className="flex-1 p-4 md:p-6 lg:p-8">
				<div className="w-full space-y-6">
					{/* Header and Controls */}
					<div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
						<div className="space-y-1">
							<div className="flex items-center gap-2">
								<h2 className="text-3xl font-bold tracking-tight text-slate-900">
									Analytics & Insights
								</h2>
								{selectedEquipment ? (
									<Badge
										variant="secondary"
										className="bg-indigo-50 text-indigo-700 border-indigo-200"
									>
										{selectedEquipment.code}
									</Badge>
								) : (
									<Badge
										variant="outline"
										className="bg-emerald-50 text-emerald-700 border-emerald-200"
									>
										Facility Total
									</Badge>
								)}
							</div>
							<p className="text-slate-500 text-sm">
								{selectedEquipment
									? `Viewing utilization and trends for ${selectedEquipment.name}`
									: "Overview of revenue, instrument utilization, and trends across all equipment."}
								{dateRangeLabel && (
									<span className="font-medium text-slate-700">
										{" "}
										• {dateRangeLabel}
									</span>
								)}
							</p>
						</div>

						{/* Filter Controls Bar */}
						<div className="flex flex-wrap items-center gap-3">
							{/* Equipment Dropdown */}
							<div className="flex flex-col gap-1">
								<span className="text-xs font-semibold text-slate-600 flex items-center gap-1">
									<Wrench className="w-3.5 h-3.5 text-indigo-600" />
									Equipment
								</span>
								<Select
									value={selectedEquipmentId}
									onValueChange={setSelectedEquipmentId}
								>
									<SelectTrigger className="w-[240px] md:w-[280px] bg-white font-medium">
										<SelectValue placeholder="All Equipments (Total)" />
									</SelectTrigger>
									<SelectContent className="max-h-[320px]">
										<SelectItem
											value="all"
											className="font-medium text-indigo-700"
										>
											<div className="flex items-center gap-2">
												<Layers className="h-4 w-4 text-indigo-600 shrink-0" />
												<span>
													All Equipments (Total)
												</span>
											</div>
										</SelectItem>
										<Separator className="my-1" />
										{data.equipments.map((eq) => (
											<SelectItem
												key={eq.id}
												value={String(eq.id)}
											>
												<div className="flex items-center gap-2 truncate">
													<Badge
														variant="outline"
														className="text-[10px] px-1 py-0 h-4 border-slate-300 font-mono shrink-0"
													>
														{eq.code}
													</Badge>
													<span className="truncate">
														{eq.name}
													</span>
												</div>
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>

							{/* Demographic Dropdown with Values directly */}
							<div className="flex flex-col gap-1">
								<span className="text-xs font-semibold text-slate-600 flex items-center gap-1">
									<Users className="w-3.5 h-3.5 text-slate-500" />
									Demographic
								</span>
								<Select
									value={selectedDemographic}
									onValueChange={setSelectedDemographic}
								>
									<SelectTrigger className="w-[180px] md:w-[220px] bg-white font-medium">
										<SelectValue placeholder="All Demographics" />
									</SelectTrigger>
									<SelectContent className="max-h-[320px]">
										<SelectItem
											value="all"
											className="font-medium text-slate-800"
										>
											<div className="flex items-center gap-2">
												<Users className="h-4 w-4 text-slate-500 shrink-0" />
												<span>All Demographics</span>
											</div>
										</SelectItem>
										<Separator className="my-1" />
										{data.filterFields.map((field) => {
											const options =
												data.fieldOptions.filter(
													(opt) =>
														opt.fieldId ===
														field.id,
												);
											if (options.length === 0)
												return null;
											return (
												<SelectGroup key={field.id}>
													<SelectLabel className="text-xs font-semibold text-slate-500 uppercase tracking-wider px-2 py-1.5">
														{field.name}
													</SelectLabel>
													{options.map((opt) => (
														<SelectItem
															key={`${field.id}:${opt.value}`}
															value={`${field.id}:${opt.value}`}
														>
															{opt.value}
														</SelectItem>
													))}
												</SelectGroup>
											);
										})}
									</SelectContent>
								</Select>
							</div>

							{/* Date Range Dropdown */}
							<div className="flex flex-col gap-1">
								<span className="text-xs font-semibold text-slate-600 flex items-center gap-1">
									<Calendar className="w-3.5 h-3.5 text-indigo-600" />
									Date Range
								</span>
								<Select
									value={dateRangePreset}
									onValueChange={(val) => {
										setDateRangePreset(val);
										if (val !== "custom") {
											setCustomFrom("");
											setCustomTo("");
										}
									}}
								>
									<SelectTrigger className="w-[170px] md:w-[190px] bg-white font-medium">
										<SelectValue placeholder="All Time" />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="all">
											<div className="flex items-center gap-2">
												<Calendar className="h-4 w-4 text-slate-500 shrink-0" />
												<span>All Time</span>
											</div>
										</SelectItem>
										<Separator className="my-1" />
										<SelectItem value="30d">
											Last 30 Days
										</SelectItem>
										<SelectItem value="90d">
											Last 3 Months
										</SelectItem>
										<SelectItem value="180d">
											Last 6 Months
										</SelectItem>
										<SelectItem value="ytd">
											This Year (YTD)
										</SelectItem>
										<Separator className="my-1" />
										<SelectItem value="custom">
											Custom Range...
										</SelectItem>
									</SelectContent>
								</Select>
							</div>

							{/* Custom Date Inputs if Custom is selected */}
							{dateRangePreset === "custom" && (
								<div className="flex items-center gap-2">
									<div className="flex flex-col gap-1">
										<span className="text-xs font-semibold text-slate-600">
											From
										</span>
										<Input
											type="date"
											value={customFrom}
											onChange={(e) =>
												setCustomFrom(e.target.value)
											}
											className="w-[135px] bg-white h-9 text-xs"
										/>
									</div>
									<div className="flex flex-col gap-1">
										<span className="text-xs font-semibold text-slate-600">
											To
										</span>
										<Input
											type="date"
											value={customTo}
											onChange={(e) =>
												setCustomTo(e.target.value)
											}
											className="w-[135px] bg-white h-9 text-xs"
										/>
									</div>
								</div>
							)}

							{/* Reset Button */}
							{hasActiveFilters && (
								<div className="flex flex-col justify-end">
									<Button
										variant="ghost"
										size="sm"
										onClick={() => {
											setSelectedEquipmentId("all");
											setSelectedDemographic("all");
											setDateRangePreset("all");
											setCustomFrom("");
											setCustomTo("");
										}}
										className="h-9 px-2 text-slate-500 hover:text-slate-800"
										title="Reset all filters"
									>
										<RotateCcw className="w-4 h-4 mr-1" />
										Reset
									</Button>
								</div>
							)}
						</div>
					</div>

					{/* Equipment Focus Banner if an equipment is selected */}
					{selectedEquipment && (
						<div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-indigo-50/70 border border-indigo-100 rounded-xl gap-3">
							<div className="space-y-1">
								<div className="flex items-center gap-2">
									<span className="font-semibold text-indigo-950 text-base">
										{selectedEquipment.name}
									</span>
									<Badge className="bg-indigo-600 hover:bg-indigo-600 font-mono text-xs">
										{selectedEquipment.code}
									</Badge>
								</div>
								<div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-indigo-700">
									{selectedEquipment.departmentLab && (
										<span>
											<strong className="text-indigo-900">
												Lab:
											</strong>{" "}
											{selectedEquipment.departmentLab}
										</span>
									)}
									{selectedEquipment.usageRate && (
										<span>
											<strong className="text-indigo-900">
												Rate:
											</strong>{" "}
											{selectedEquipment.usageRate}
										</span>
									)}
								</div>
							</div>
							<Button
								variant="outline"
								size="sm"
								onClick={() => setSelectedEquipmentId("all")}
								className="self-start sm:self-auto bg-white border-indigo-200 text-indigo-700 hover:bg-indigo-100 shrink-0 text-xs"
							>
								View All Equipments (Total)
							</Button>
						</div>
					)}

					<Separator className="bg-slate-200" />

					{/* Key Stats Cards */}
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

						{/* Average Price Card */}
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

						{/* Equipment / Facility Scope Card */}
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
										? selectedEquipment.usageRate ||
											"Standard"
										: data.equipments.length}
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

					{/* Graphs Section */}
					<div className="grid gap-6 lg:grid-cols-2">
						{/* Chart 1: Revenue Trend (Total or Equipment-Specific) */}
						<Card className="shadow-sm border-slate-200 bg-white">
							<CardHeader className="pb-3">
								<div className="flex items-center justify-between">
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
								</div>
							</CardHeader>
							<CardContent className="h-[340px]">
								{trendData.length > 0 ? (
									<ResponsiveContainer
										width="100%"
										height="100%"
									>
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
												tick={{
													fontSize: 12,
													fill: "#64748b",
												}}
												tickLine={false}
												axisLine={{ stroke: "#e2e8f0" }}
											/>
											<YAxis
												tick={{
													fontSize: 12,
													fill: "#64748b",
												}}
												tickLine={false}
												axisLine={{ stroke: "#e2e8f0" }}
												tickFormatter={(val) =>
													`₹${Number(val).toLocaleString()}`
												}
											/>
											<Tooltip
												formatter={(
													val: number,
													name: string,
												) => [
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
												activeDot={{
													r: 6,
													fill: "#4f46e5",
												}}
											/>
										</LineChart>
									</ResponsiveContainer>
								) : (
									<div className="h-full flex items-center justify-center text-slate-400 italic text-sm">
										No booking trend data available for the
										selected filter.
									</div>
								)}
							</CardContent>
						</Card>

						{/* Chart 2: Either "Revenue per Equipment" (when Total) OR "Category Breakdown" (when Equipment selected) */}
						{selectedEquipment ? (
							<Card className="shadow-sm border-slate-200 bg-white">
								<CardHeader className="pb-3">
									<CardTitle className="text-lg font-semibold text-slate-900">
										{selectedEquipment.code} — Utilization
										by Category
									</CardTitle>
									<CardDescription>
										Revenue breakdown by applicant category
										for this equipment
									</CardDescription>
								</CardHeader>
								<CardContent className="h-[340px]">
									{categoryBreakdown.length > 0 ? (
										<ResponsiveContainer
											width="100%"
											height="100%"
										>
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
													tick={{
														fontSize: 11,
														fill: "#64748b",
													}}
													interval={0}
													angle={-15}
													textAnchor="end"
													tickLine={false}
													axisLine={{
														stroke: "#e2e8f0",
													}}
												/>
												<YAxis
													tick={{
														fontSize: 12,
														fill: "#64748b",
													}}
													tickLine={false}
													axisLine={{
														stroke: "#e2e8f0",
													}}
													tickFormatter={(val) =>
														`₹${Number(val).toLocaleString()}`
													}
												/>
												<Tooltip
													formatter={(
														val: number,
														_name: string,
													) => [
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
											No category breakdown data available
											for this equipment.
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
										Comparison of total collections across
										all instruments
									</CardDescription>
								</CardHeader>
								<CardContent className="h-[340px]">
									<ResponsiveContainer
										width="100%"
										height="100%"
									>
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
												tick={{
													fontSize: 11,
													fill: "#64748b",
												}}
												interval={0}
												angle={-20}
												textAnchor="end"
												tickLine={false}
												axisLine={{ stroke: "#e2e8f0" }}
											/>
											<YAxis
												tick={{
													fontSize: 12,
													fill: "#64748b",
												}}
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
													entry?: {
														payload?: (typeof equipmentStats)[number];
													},
												) => [
													`₹${val.toLocaleString()} (${entry?.payload?.count ?? 0} bookings)`,
													"Revenue",
												]}
												labelFormatter={(
													code: string,
												) => {
													const item =
														equipmentStats.find(
															(e) =>
																e.code === code,
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

					{/* Equipment Comparison Table when All Equipments is selected */}
					{selectedEquipmentId === "all" && (
						<Card className="shadow-sm border-slate-200 bg-white">
							<CardHeader>
								<CardTitle className="text-lg font-semibold text-slate-900">
									Equipment Performance Breakdown
								</CardTitle>
								<CardDescription>
									Detailed summary of bookings, total revenue,
									and average revenue per session for each
									instrument.
								</CardDescription>
							</CardHeader>
							<CardContent>
								<div className="overflow-x-auto">
									<table className="w-full text-sm text-left">
										<thead className="text-xs uppercase bg-slate-50 text-slate-600 border-b border-slate-200">
											<tr>
												<th className="py-3 px-4">
													Equipment
												</th>
												<th className="py-3 px-4">
													Code
												</th>
												<th className="py-3 px-4">
													Lab / Department
												</th>
												<th className="py-3 px-4 text-right">
													Bookings
												</th>
												<th className="py-3 px-4 text-right">
													Total Revenue
												</th>
												<th className="py-3 px-4 text-right">
													Avg. Ticket
												</th>
												<th className="py-3 px-4 text-center">
													Action
												</th>
											</tr>
										</thead>
										<tbody className="divide-y divide-slate-100">
											{equipmentStats.map((eq) => (
												<tr
													key={eq.id}
													className="hover:bg-slate-50/70 transition-colors"
												>
													<td className="py-3 px-4 font-medium text-slate-900">
														{eq.name}
													</td>
													<td className="py-3 px-4">
														<Badge
															variant="outline"
															className="font-mono text-xs border-slate-300"
														>
															{eq.code}
														</Badge>
													</td>
													<td className="py-3 px-4 text-slate-500">
														{eq.departmentLab ||
															"—"}
													</td>
													<td className="py-3 px-4 text-right font-medium text-slate-700">
														{eq.count}
													</td>
													<td className="py-3 px-4 text-right font-bold text-indigo-600">
														₹
														{eq.revenue.toLocaleString()}
													</td>
													<td className="py-3 px-4 text-right text-slate-600">
														₹
														{eq.avgTicket.toLocaleString()}
													</td>
													<td className="py-3 px-4 text-center">
														<Button
															variant="ghost"
															size="sm"
															onClick={() =>
																setSelectedEquipmentId(
																	String(
																		eq.id,
																	),
																)
															}
															className="h-8 px-2 text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 font-medium text-xs gap-1"
														>
															<span>Focus</span>
															<ArrowRight className="w-3.5 h-3.5" />
														</Button>
													</td>
												</tr>
											))}
										</tbody>
									</table>
								</div>
							</CardContent>
						</Card>
					)}
				</div>
			</main>
		</div>
	);
}
