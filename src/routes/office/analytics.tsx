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
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { useState, useMemo } from "react";
import { format } from "date-fns";
import { Separator } from "@/components/ui/separator";

export const Route = createFileRoute("/office/analytics")({
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

	const [selectedFieldId, setSelectedFieldId] = useState<string>("none");
	const [selectedOption, setSelectedOption] = useState<string>("all");

	const filteredBookings = useMemo(() => {
		if (!data) return [];

		let filtered = data.bookings;

		if (selectedFieldId !== "none" && selectedOption !== "all") {
			const userIdsWithOption = data.userFieldResponses
				.filter(
					(r) =>
						String(r.fieldId) === selectedFieldId &&
						r.value === selectedOption,
				)
				.map((r) => r.userId);

			filtered = filtered.filter((b) =>
				userIdsWithOption.includes(b.userId),
			);
		}

		return filtered;
	}, [data, selectedFieldId, selectedOption]);

	const equipmentStats = useMemo(() => {
		if (!data) return [];

		return data.equipments
			.map((eq) => {
				const eqBookings = filteredBookings.filter(
					(b) => b.equipmentId === eq.id,
				);
				const totalRevenue = eqBookings.reduce(
					(sum, b) => sum + (b.price || 0),
					0,
				);
				return {
					name: eq.name,
					revenue: totalRevenue,
					count: eqBookings.length,
				};
			})
			.sort((a, b) => b.revenue - a.revenue);
	}, [data, filteredBookings]);

	const trendData = useMemo(() => {
		if (!filteredBookings.length) return [];

		// Group by month
		const months: Record<string, number> = {};

		filteredBookings.forEach((b) => {
			const date = b.createdAt ? new Date(b.createdAt) : new Date();
			const monthKey = format(date, "MMM yyyy");
			months[monthKey] = (months[monthKey] || 0) + (b.price || 0);
		});

		return Object.entries(months).map(([month, revenue]) => ({
			month,
			revenue,
		}));
	}, [filteredBookings]);

	const stats = useMemo(() => {
		const totalRevenue = filteredBookings.reduce(
			(sum, b) => sum + (b.price || 0),
			0,
		);
		const totalBookings = filteredBookings.length;
		const avgTicket =
			totalBookings > 0 ? Math.round(totalRevenue / totalBookings) : 0;

		return { totalRevenue, totalBookings, avgTicket };
	}, [filteredBookings]);

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

	const fieldOptions = data.fieldOptions.filter(
		(o) => String(o.fieldId) === selectedFieldId,
	);

	return (
		<div className="min-h-screen flex flex-col bg-slate-50/50">
			<Header user={user} backTo="/office" />

			<main className="flex-1 p-4 md:p-6 lg:p-8">
				<div className="w-full space-y-8">
					<div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
						<div className="space-y-1">
							<h2 className="text-3xl font-bold tracking-tight text-slate-900">
								Analytics
							</h2>
							<p className="text-slate-500">
								View trends and statistics equipment wise.
							</p>
						</div>

						<div className="flex items-center gap-3">
							<div className="flex flex-col gap-1">
								<span className="text-xs font-medium text-slate-500">
									Filter Field
								</span>
								<Select
									value={selectedFieldId}
									onValueChange={(val) => {
										setSelectedFieldId(val);
										setSelectedOption("all");
									}}
								>
									<SelectTrigger className="w-[200px] bg-white">
										<SelectValue placeholder="Select field" />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="none">
											None
										</SelectItem>
										{data.filterFields.map((f) => (
											<SelectItem
												key={f.id}
												value={String(f.id)}
											>
												{f.name}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>

							{selectedFieldId !== "none" && (
								<div className="flex flex-col gap-1">
									<span className="text-xs font-medium text-slate-500">
										Value
									</span>
									<Select
										value={selectedOption}
										onValueChange={setSelectedOption}
									>
										<SelectTrigger className="w-[200px] bg-white">
											<SelectValue placeholder="Select value" />
										</SelectTrigger>
										<SelectContent>
											<SelectItem value="all">
												All Values
											</SelectItem>
											{fieldOptions.map((o) => (
												<SelectItem
													key={`${selectedFieldId}-${o.value}`}
													value={o.value}
												>
													{o.value}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								</div>
							)}
						</div>
					</div>

					<Separator className="bg-slate-200" />

					{/* Key Stats */}
					<div className="grid gap-4 md:grid-cols-3">
						<Card className="shadow-sm">
							<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
								<CardTitle className="text-sm font-medium">
									Total Revenue
								</CardTitle>
							</CardHeader>
							<CardContent>
								<div className="text-2xl font-bold text-indigo-600">
									₹{stats.totalRevenue.toLocaleString()}
								</div>
								<p className="text-xs text-muted-foreground">
									Across {stats.totalBookings} bookings
								</p>
							</CardContent>
						</Card>
						<Card className="shadow-sm">
							<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
								<CardTitle className="text-sm font-medium">
									Avg. Booking Price
								</CardTitle>
							</CardHeader>
							<CardContent>
								<div className="text-2xl font-bold">
									₹{stats.avgTicket.toLocaleString()}
								</div>
								<p className="text-xs text-muted-foreground">
									Per equipment booking
								</p>
							</CardContent>
						</Card>
						<Card className="shadow-sm">
							<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
								<CardTitle className="text-sm font-medium">
									Active Equipments
								</CardTitle>
							</CardHeader>
							<CardContent>
								<div className="text-2xl font-bold">
									{data.equipments.length}
								</div>
								<p className="text-xs text-muted-foreground">
									Currently in catalog
								</p>
							</CardContent>
						</Card>
					</div>

					<div className="grid gap-6 md:grid-cols-2">
						{/* Revenue per Equipment */}
						<Card className="shadow-sm">
							<CardHeader>
								<CardTitle className="text-lg">
									Revenue per Equipment
								</CardTitle>
								<CardDescription>
									Total amount collected for each equipment
								</CardDescription>
							</CardHeader>
							<CardContent className="h-[350px]">
								<ResponsiveContainer width="100%" height="100%">
									<BarChart data={equipmentStats}>
										<CartesianGrid
											strokeDasharray="3 3"
											vertical={false}
										/>
										<XAxis dataKey="name" />
										<YAxis
											tickFormatter={(val) => `₹${val}`}
										/>
										<Tooltip
											formatter={(val: number) => [
												`₹${val.toLocaleString()}`,
												"Revenue",
											]}
											contentStyle={{
												borderRadius: "8px",
												border: "1px solid #e2e8f0",
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

						{/* Revenue Trend */}
						<Card className="shadow-sm">
							<CardHeader>
								<CardTitle className="text-lg">
									Revenue Trend
								</CardTitle>
								<CardDescription>
									Monthly revenue statistics
								</CardDescription>
							</CardHeader>
							<CardContent className="h-[350px]">
								{trendData.length > 0 ? (
									<ResponsiveContainer
										width="100%"
										height="100%"
									>
										<LineChart data={trendData}>
											<CartesianGrid
												strokeDasharray="3 3"
												vertical={false}
											/>
											<XAxis dataKey="month" />
											<YAxis
												tickFormatter={(val) =>
													`₹${val}`
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
												}}
											/>
											<Line
												type="monotone"
												dataKey="revenue"
												stroke="#4f46e5"
												strokeWidth={2}
												dot={{ r: 4 }}
												activeDot={{ r: 6 }}
											/>
										</LineChart>
									</ResponsiveContainer>
								) : (
									<div className="h-full flex items-center justify-center text-slate-400 italic">
										No data available for the selected
										filters
									</div>
								)}
							</CardContent>
						</Card>
					</div>
				</div>
			</main>
		</div>
	);
}
