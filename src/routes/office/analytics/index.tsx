import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import {
	AnalyticsCharts,
	AnalyticsFilterBar,
	type AnalyticsFilterState,
	EquipmentPerformanceTable,
	KpiCards,
	useFilteredAnalytics,
} from "@/components/office/analytics";
import { Header } from "@/components/office/header";
import { Separator } from "@/components/ui/separator";
import { requireAdmin } from "@/lib/auth";
import { getAnalyticsData } from "@/services/analytics";

export const Route = createFileRoute("/office/analytics/")({
	component: AnalyticsPage,
	loader: async () => {
		return await requireAdmin();
	},
});

const initialFilters: AnalyticsFilterState = {
	selectedEquipmentId: "all",
	selectedDemographic: "all",
	dateRangePreset: "all",
	customFrom: "",
	customTo: "",
};

function AnalyticsPage() {
	const user = Route.useLoaderData();
	const { data, isLoading } = useQuery({
		queryKey: ["analytics-data"],
		queryFn: () => getAnalyticsData(),
	});

	const [filters, setFilters] =
		useState<AnalyticsFilterState>(initialFilters);

	const {
		selectedEquipment,
		dateRangeLabel,
		equipmentStats,
		trendData,
		categoryBreakdown,
		stats,
		hasActiveFilters,
	} = useFilteredAnalytics(data, filters);

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

	return (
		<div className="min-h-screen flex flex-col bg-slate-50/50">
			<Header user={user} backTo="/office" />

			<main className="flex-1 p-4 md:p-6 lg:p-8">
				<div className="w-full space-y-6">
					<AnalyticsFilterBar
						data={data}
						filters={filters}
						onFiltersChange={(next) =>
							setFilters((prev) => ({ ...prev, ...next }))
						}
						onResetFilters={() => setFilters(initialFilters)}
						selectedEquipment={selectedEquipment}
						dateRangeLabel={dateRangeLabel}
						hasActiveFilters={hasActiveFilters}
					/>

					<Separator className="bg-slate-200" />

					<KpiCards
						stats={stats}
						selectedEquipment={selectedEquipment}
						totalEquipmentCount={data.equipments.length}
					/>

					<AnalyticsCharts
						selectedEquipment={selectedEquipment}
						trendData={trendData}
						categoryBreakdown={categoryBreakdown}
						equipmentStats={equipmentStats}
					/>

					{filters.selectedEquipmentId === "all" && (
						<EquipmentPerformanceTable
							equipmentStats={equipmentStats}
							onFocusEquipment={(eqId) =>
								setFilters((prev) => ({
									...prev,
									selectedEquipmentId: eqId,
								}))
							}
						/>
					)}
				</div>
			</main>
		</div>
	);
}
