import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
	Select,
	SelectContent,
	SelectGroup,
	SelectItem,
	SelectLabel,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Calendar, Layers, RotateCcw, Users, Wrench } from "lucide-react";
import type { AnalyticsData, AnalyticsFilterState } from "./types";

interface AnalyticsFilterBarProps {
	data: AnalyticsData;
	filters: AnalyticsFilterState;
	onFiltersChange: (next: Partial<AnalyticsFilterState>) => void;
	onResetFilters: () => void;
	selectedEquipment: AnalyticsData["equipments"][number] | null;
	dateRangeLabel: string | null;
	hasActiveFilters: boolean;
}

export function AnalyticsFilterBar({
	data,
	filters,
	onFiltersChange,
	onResetFilters,
	selectedEquipment,
	dateRangeLabel,
	hasActiveFilters,
}: AnalyticsFilterBarProps) {
	const {
		selectedEquipmentId,
		selectedDemographic,
		dateRangePreset,
		customFrom,
		customTo,
	} = filters;

	return (
		<div className="space-y-6">
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
							onValueChange={(val) =>
								onFiltersChange({ selectedEquipmentId: val })
							}
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
										<span>All Equipments (Total)</span>
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

					{/* Demographic Dropdown */}
					<div className="flex flex-col gap-1">
						<span className="text-xs font-semibold text-slate-600 flex items-center gap-1">
							<Users className="w-3.5 h-3.5 text-slate-500" />
							Demographic
						</span>
						<Select
							value={selectedDemographic}
							onValueChange={(val) =>
								onFiltersChange({ selectedDemographic: val })
							}
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
									const options = data.fieldOptions.filter(
										(opt) => opt.fieldId === field.id,
									);
									if (options.length === 0) return null;
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
								if (val !== "custom") {
									onFiltersChange({
										dateRangePreset: val,
										customFrom: "",
										customTo: "",
									});
								} else {
									onFiltersChange({ dateRangePreset: val });
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
										onFiltersChange({
											customFrom: e.target.value,
										})
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
										onFiltersChange({
											customTo: e.target.value,
										})
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
								onClick={onResetFilters}
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
						onClick={() =>
							onFiltersChange({ selectedEquipmentId: "all" })
						}
						className="self-start sm:self-auto bg-white border-indigo-200 text-indigo-700 hover:bg-indigo-100 shrink-0 text-xs"
					>
						View All Equipments (Total)
					</Button>
				</div>
			)}
		</div>
	);
}
