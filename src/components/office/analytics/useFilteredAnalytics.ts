import { useMemo } from "react";
import {
	endOfDay,
	format,
	parseISO,
	startOfDay,
	startOfYear,
	subDays,
} from "date-fns";
import type {
	AnalyticsData,
	AnalyticsFilterState,
	CategoryBreakdownPoint,
	EquipmentStat,
	KpiStats,
	TrendPoint,
} from "./types";

export function useFilteredAnalytics(
	data: AnalyticsData | undefined,
	filters: AnalyticsFilterState,
) {
	const {
		selectedEquipmentId,
		selectedDemographic,
		dateRangePreset,
		customFrom,
		customTo,
	} = filters;

	const selectedEquipment = useMemo(() => {
		if (!data || selectedEquipmentId === "all") return null;
		return (
			data.equipments.find((e) => String(e.id) === selectedEquipmentId) ??
			null
		);
	}, [data, selectedEquipmentId]);

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

	// Filter bookings by demographic and date range
	const baseFilteredBookings = useMemo(() => {
		if (!data) return [];
		let filtered = data.bookings;

		// 1. Demographic filter
		if (selectedDemographic !== "all") {
			const colonIdx = selectedDemographic.indexOf(":");
			if (colonIdx !== -1) {
				const targetFieldId = selectedDemographic.slice(0, colonIdx);
				const targetValue = selectedDemographic.slice(colonIdx + 1);

				const userIdsWithOption = new Set(
					data.userFieldResponses
						.filter(
							(r) =>
								String(r.fieldId) === targetFieldId &&
								r.value === targetValue,
						)
						.map((r) => r.userId),
				);

				filtered = filtered.filter((b) =>
					userIdsWithOption.has(b.userId),
				);
			}
		}

		// 2. Date range filter
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
	}, [data, selectedDemographic, dateRangePreset, customFrom, customTo]);

	// Bookings filtered down to selected equipment
	const filteredBookings = useMemo(() => {
		if (selectedEquipmentId === "all") return baseFilteredBookings;
		const eqId = Number(selectedEquipmentId);
		return baseFilteredBookings.filter((b) => b.equipmentId === eqId);
	}, [baseFilteredBookings, selectedEquipmentId]);

	// Total facility revenue for % share
	const totalFacilityRevenue = useMemo(() => {
		if (!data) return 0;
		return data.bookings.reduce((sum, b) => sum + (b.price || 0), 0);
	}, [data]);

	// Equipment breakdown across all active equipment
	const equipmentStats = useMemo((): EquipmentStat[] => {
		if (!data) return [];
		return data.equipments
			.map((eq) => {
				const eqBookings = baseFilteredBookings.filter(
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
	}, [data, baseFilteredBookings]);

	// Chronological monthly trend data
	const trendData = useMemo((): TrendPoint[] => {
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

		for (const b of filteredBookings) {
			const date = b.createdAt ? new Date(b.createdAt) : new Date();
			const sortKey = format(date, "yyyy-MM");
			const label = format(date, "MMM yyyy");

			let cur = monthMap.get(sortKey);
			if (!cur) {
				cur = { sortKey, month: label, revenue: 0, bookings: 0 };
				monthMap.set(sortKey, cur);
			}
			cur.revenue += b.price || 0;
			cur.bookings += 1;
		}

		return Array.from(monthMap.values())
			.sort((a, b) => a.sortKey.localeCompare(b.sortKey))
			.map((m) => ({
				month: m.month,
				revenue: m.revenue,
				bookings: m.bookings,
			}));
	}, [filteredBookings]);

	// Category breakdown for selected equipment
	const categoryBreakdown = useMemo((): CategoryBreakdownPoint[] => {
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

		for (const b of filteredBookings) {
			const cat = userCategoryMap.get(b.userId) || "Other / Unspecified";
			if (!map[cat]) {
				map[cat] = { category: cat, revenue: 0, bookings: 0 };
			}
			map[cat].revenue += b.price || 0;
			map[cat].bookings += 1;
		}

		return Object.values(map).sort((a, b) => b.revenue - a.revenue);
	}, [data, selectedEquipmentId, filteredBookings]);

	// Key KPI stats
	const stats = useMemo((): KpiStats => {
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

	const hasActiveFilters =
		selectedEquipmentId !== "all" ||
		selectedDemographic !== "all" ||
		dateRangePreset !== "all" ||
		Boolean(customFrom) ||
		Boolean(customTo);

	return {
		selectedEquipment,
		dateRangeLabel,
		filteredBookings,
		equipmentStats,
		trendData,
		categoryBreakdown,
		stats,
		hasActiveFilters,
	};
}
