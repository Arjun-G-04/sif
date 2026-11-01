import type { getAnalyticsData } from "@/services/analytics";

export type AnalyticsData = Awaited<ReturnType<typeof getAnalyticsData>>;

export interface AnalyticsFilterState {
	selectedEquipmentId: string;
	selectedDemographic: string;
	dateRangePreset: string;
	customFrom: string;
	customTo: string;
}

export interface EquipmentStat {
	id: number;
	name: string;
	code: string;
	revenue: number;
	count: number;
	avgTicket: number;
	departmentLab: string;
}

export interface TrendPoint {
	month: string;
	revenue: number;
	bookings: number;
}

export interface CategoryBreakdownPoint {
	category: string;
	revenue: number;
	bookings: number;
}

export interface KpiStats {
	totalRevenue: number;
	totalBookings: number;
	avgTicket: number;
	share: string;
}
