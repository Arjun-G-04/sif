import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
	ArrowDown,
	ArrowUp,
	ArrowUpDown,
	ChevronLeft,
	ChevronRight,
	Filter,
	X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";

type FilterType = "text" | "number" | "select" | "dateRange";

type DateRangeFilter = {
	from?: string;
	to?: string;
};

type ColumnFilterConfig = {
	type: FilterType;
	placeholder?: string;
	options?: Array<{ label: string; value: string }>;
};

type ColumnFilterValue = string | DateRangeFilter;

const SELECT_ALL_VALUE = "__all__";

export interface Column<T> {
	header: ReactNode;
	accessorKey?: keyof T;
	cell?: (item: T) => ReactNode;
	className?: string;
	sortable?: boolean;
	filter?: ColumnFilterConfig;
}

interface DataTableProps<T> {
	data: T[];
	columns: Column<T>[];
	keyExtractor: (item: T) => string | number;
	onRowClick?: (item: T) => void;
	emptyState?: ReactNode;
	rowClassName?: string | ((item: T) => string);
	className?: string;
	pagination?: boolean;
	defaultPageSize?: number;
	enableFiltering?: boolean;
}

const getColumnLabel = <T,>(column: Column<T>) => {
	if (typeof column.header === "string") return column.header;
	if (typeof column.header === "number") return String(column.header);
	if (column.accessorKey) return String(column.accessorKey);
	return "Filter";
};

const formatFilterDate = (value: string) => {
	if (!value) return value;
	const date = new Date(`${value}T00:00:00`);
	if (Number.isNaN(date.getTime())) return value;
	return date.toLocaleDateString("en-US", {
		year: "numeric",
		month: "short",
		day: "numeric",
	});
};

const isFilterValueEmpty = (
	value: ColumnFilterValue | undefined,
	type: FilterType,
) => {
	if (value === undefined || value === null) return true;
	if (type === "select") {
		return value === "" || value === SELECT_ALL_VALUE;
	}
	if (type === "text" || type === "number") {
		return String(value).trim() === "";
	}
	if (type === "dateRange") {
		const range = value as DateRangeFilter;
		return !range?.from && !range?.to;
	}
	return false;
};

export function DataTable<T>({
	data,
	columns,
	keyExtractor,
	onRowClick,
	emptyState,
	rowClassName,
	className,
	pagination = true,
	defaultPageSize = 10,
	enableFiltering = false,
}: DataTableProps<T>) {
	const [sortConfig, setSortConfig] = useState<{
		key: keyof T;
		direction: "asc" | "desc";
	} | null>(null);
	const [currentPage, setCurrentPage] = useState(1);
	const [filtersOpen, setFiltersOpen] = useState(false);
	const [columnFilters, setColumnFilters] = useState<
		Record<string, ColumnFilterValue>
	>({});

	const filterableColumns = useMemo(
		() =>
			columns.filter((column) =>
				Boolean(column.accessorKey && column.filter),
			),
		[columns],
	);

	const hasFiltering = enableFiltering && filterableColumns.length > 0;

	const selectOptionsByKey = useMemo(() => {
		const options: Record<
			string,
			Array<{ label: string; value: string }>
		> = {};
		if (!hasFiltering) return options;

		for (const column of filterableColumns) {
			if (!column.accessorKey || column.filter?.type !== "select")
				continue;
			const key = String(column.accessorKey);
			if (column.filter.options?.length) {
				options[key] = column.filter.options;
				continue;
			}
			const uniqueValues = Array.from(
				new Set(
					data
						.map((item) => {
							const value = item[column.accessorKey!];
							if (
								value === null ||
								value === undefined ||
								value === ""
							) {
								return null;
							}
							return String(value);
						})
						.filter((value): value is string => Boolean(value)),
				),
			).sort((a, b) => a.localeCompare(b));

			options[key] = uniqueValues.map((value) => ({
				label: value,
				value,
			}));
		}

		return options;
	}, [data, filterableColumns, hasFiltering]);

	const updateFilterValue = (
		key: string,
		value: ColumnFilterValue | undefined,
		type: FilterType,
	) => {
		setColumnFilters((current) => {
			const next = { ...current };
			if (isFilterValueEmpty(value, type)) {
				delete next[key];
			} else if (value !== undefined) {
				next[key] = value;
			}
			return next;
		});
	};

	const filteredData = useMemo(() => {
		if (!hasFiltering) return data;
		if (Object.keys(columnFilters).length === 0) return data;

		return data.filter((item) => {
			return filterableColumns.every((column) => {
				if (!column.accessorKey || !column.filter) return true;
				const key = String(column.accessorKey);
				const filterValue = columnFilters[key];
				if (filterValue === undefined) return true;

				const rawValue = item[column.accessorKey];

				switch (column.filter.type) {
					case "text": {
						const target =
							rawValue === null || rawValue === undefined
								? ""
								: String(rawValue);
						return target
							.toLowerCase()
							.includes(String(filterValue).toLowerCase());
					}
					case "number": {
						const target =
							rawValue === null || rawValue === undefined
								? ""
								: String(rawValue);
						return target.includes(String(filterValue));
					}
					case "select": {
						if (filterValue === SELECT_ALL_VALUE) return true;
						const target =
							rawValue === null || rawValue === undefined
								? ""
								: String(rawValue);
						return target === String(filterValue);
					}
					case "dateRange": {
						const range = filterValue as DateRangeFilter;
						if (!range?.from && !range?.to) return true;
						if (!rawValue) return false;
						const dateValue =
							rawValue instanceof Date
								? rawValue
								: new Date(rawValue as string);
						if (Number.isNaN(dateValue.getTime())) return false;
						if (range.from) {
							const fromDate = new Date(`${range.from}T00:00:00`);
							if (dateValue < fromDate) return false;
						}
						if (range.to) {
							const toDate = new Date(`${range.to}T23:59:59.999`);
							if (dateValue > toDate) return false;
						}
						return true;
					}
					default:
						return true;
				}
			});
		});
	}, [data, columnFilters, filterableColumns, hasFiltering]);

	const sortedData = useMemo(() => {
		if (!sortConfig) return filteredData;

		return [...filteredData].sort((a, b) => {
			const aValue = a[sortConfig.key];
			const bValue = b[sortConfig.key];

			if (aValue === bValue) return 0;
			if (aValue === null || aValue === undefined) return 1;
			if (bValue === null || bValue === undefined) return -1;

			const comparison = aValue < bValue ? -1 : 1;
			return sortConfig.direction === "asc" ? comparison : -comparison;
		});
	}, [filteredData, sortConfig]);

	const totalPages = pagination
		? Math.ceil(sortedData.length / defaultPageSize)
		: 1;

	useEffect(() => {
		if (currentPage > totalPages && totalPages > 0) {
			setCurrentPage(totalPages);
		}
	}, [totalPages, currentPage]);

	useEffect(() => {
		if (hasFiltering) {
			setCurrentPage(1);
		}
	}, [columnFilters, hasFiltering]);

	const paginatedData = useMemo(() => {
		if (!pagination) return sortedData;
		const startIndex = (currentPage - 1) * defaultPageSize;
		return sortedData.slice(startIndex, startIndex + defaultPageSize);
	}, [sortedData, pagination, currentPage, defaultPageSize]);

	const handleSort = (key: keyof T) => {
		setSortConfig((current) => {
			if (current?.key === key) {
				if (current.direction === "asc") {
					return { key, direction: "desc" };
				}
				return null;
			}
			return { key, direction: "asc" };
		});
	};

	const appliedFilters = useMemo(() => {
		if (!hasFiltering)
			return [] as Array<{
				key: string;
				label: string;
				valueLabel: string;
			}>;

		return filterableColumns.flatMap((column) => {
			if (!column.accessorKey || !column.filter) return [];
			const key = String(column.accessorKey);
			const value = columnFilters[key];
			if (isFilterValueEmpty(value, column.filter.type)) return [];

			let valueLabel = "";
			switch (column.filter.type) {
				case "select": {
					const options = selectOptionsByKey[key] ?? [];
					valueLabel =
						options.find((option) => option.value === value)
							?.label ?? String(value);
					break;
				}
				case "dateRange": {
					const range = value as DateRangeFilter;
					const fromLabel = range?.from
						? formatFilterDate(range.from)
						: "";
					const toLabel = range?.to ? formatFilterDate(range.to) : "";
					if (fromLabel && toLabel) {
						valueLabel = `${fromLabel} – ${toLabel}`;
					} else if (fromLabel) {
						valueLabel = `From ${fromLabel}`;
					} else if (toLabel) {
						valueLabel = `Until ${toLabel}`;
					}
					break;
				}
				default:
					valueLabel = String(value);
			}

			return [
				{
					key,
					label: getColumnLabel(column),
					valueLabel,
				},
			];
		});
	}, [columnFilters, filterableColumns, hasFiltering, selectOptionsByKey]);

	const hasActiveFilters = appliedFilters.length > 0;

	const clearAllFilters = () => {
		setColumnFilters({});
	};

	const clearFilter = (key: string) => {
		setColumnFilters((current) => {
			const next = { ...current };
			delete next[key];
			return next;
		});
	};

	const renderFilterControl = (column: Column<T>) => {
		if (!column.accessorKey || !column.filter) return null;
		const key = String(column.accessorKey);
		const config = column.filter;

		switch (config.type) {
			case "select": {
				const options = selectOptionsByKey[key] ?? [];
				const selectValue =
					(columnFilters[key] as string | undefined) ??
					SELECT_ALL_VALUE;
				return (
					<Select
						value={selectValue}
						onValueChange={(value) =>
							updateFilterValue(key, value, config.type)
						}
					>
						<SelectTrigger className="w-full">
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value={SELECT_ALL_VALUE}>
								{config.placeholder ?? "All"}
							</SelectItem>
							{options.map((option) => (
								<SelectItem
									key={option.value}
									value={option.value}
								>
									{option.label}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				);
			}
			case "dateRange": {
				const range =
					(columnFilters[key] as DateRangeFilter | undefined) ?? {};
				return (
					<div className="grid gap-2">
						<Input
							type="date"
							value={range.from ?? ""}
							aria-label="From date"
							onChange={(event) =>
								updateFilterValue(
									key,
									{
										...range,
										from: event.target.value || undefined,
									},
									config.type,
								)
							}
						/>
						<Input
							type="date"
							value={range.to ?? ""}
							aria-label="To date"
							onChange={(event) =>
								updateFilterValue(
									key,
									{
										...range,
										to: event.target.value || undefined,
									},
									config.type,
								)
							}
						/>
					</div>
				);
			}
			case "number":
			case "text": {
				const value = (columnFilters[key] as string | undefined) ?? "";
				return (
					<Input
						type="text"
						inputMode={
							config.type === "number" ? "numeric" : undefined
						}
						placeholder={
							config.placeholder ??
							`Filter ${getColumnLabel(column)}`
						}
						value={value}
						onChange={(event) =>
							updateFilterValue(
								key,
								event.target.value,
								config.type,
							)
						}
					/>
				);
			}
			default:
				return null;
		}
	};

	if (!data || data.length === 0) {
		if (emptyState) return <>{emptyState}</>;
		return (
			<div className="py-12 text-center border-2 border-dashed rounded-xl">
				<p className="text-gray-400 italic">No items found.</p>
			</div>
		);
	}

	return (
		<div className="space-y-4">
			{hasFiltering && (
				<div className="flex flex-wrap items-center gap-3">
					<Button
						variant="outline"
						size="sm"
						className="gap-2"
						onClick={() => setFiltersOpen((open) => !open)}
					>
						<Filter className="h-4 w-4" />
						{filtersOpen ? "Hide filters" : "Show filters"}
					</Button>

					{hasActiveFilters && (
						<>
							<div className="flex flex-wrap items-center gap-1.5">
								{appliedFilters.map((filter) => (
									<Badge
										key={`${filter.key}-${filter.valueLabel}`}
										variant="secondary"
										className="gap-1"
									>
										<span className="font-semibold text-xs">
											{filter.label}:
										</span>
										<span className="text-xs">
											{filter.valueLabel}
										</span>
										<button
											type="button"
											className="ml-0.5 rounded-full p-0.5 text-slate-500 hover:text-slate-700"
											aria-label={`Clear ${filter.label} filter`}
											onClick={() =>
												clearFilter(filter.key)
											}
										>
											<X className="h-3 w-3" />
										</button>
									</Badge>
								))}
							</div>
							<Button
								variant="ghost"
								size="sm"
								className="h-7 px-2 text-slate-600"
								onClick={clearAllFilters}
							>
								Clear all
							</Button>
						</>
					)}

					<p className="text-sm text-slate-500 ml-auto">
						{filteredData.length} results
					</p>
				</div>
			)}

			<div
				className={cn(
					hasFiltering ? "flex flex-col gap-4 md:flex-row" : "",
				)}
			>
				{hasFiltering && filtersOpen && (
					<aside className="w-full shrink-0 rounded-lg border bg-white p-4 shadow-sm md:sticky md:top-4 md:w-80">
						<h3 className="text-sm font-semibold text-slate-900">
							Filters
						</h3>
						<div className="mt-4 space-y-4">
							{filterableColumns.map((column) => (
								<div
									key={
										column.accessorKey
											? String(column.accessorKey)
											: getColumnLabel(column)
									}
									className="space-y-2"
								>
									<Label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
										{getColumnLabel(column)}
									</Label>
									{renderFilterControl(column)}
								</div>
							))}
						</div>
					</aside>
				)}

				<div className="min-w-0 flex-1 space-y-4">
					<div
						className={cn(
							"rounded-md border bg-white overflow-hidden",
							className,
						)}
					>
						<Table>
							<TableHeader>
								<TableRow className="bg-gray-50/50">
									{columns.map((column, index) => {
										const isSortable =
											column.sortable !== false &&
											column.accessorKey;
										const isSorted =
											sortConfig?.key ===
											column.accessorKey;

										return (
											<TableHead
												key={
													column.accessorKey
														? String(
																column.accessorKey,
															)
														: index
												}
												className={cn(
													column.className,
													isSortable &&
														"cursor-pointer select-none hover:bg-slate-50 transition-colors",
												)}
												onClick={() =>
													isSortable &&
													handleSort(
														column.accessorKey!,
													)
												}
											>
												<div className="flex items-center gap-1">
													{column.header}
													{isSortable && (
														<div className="w-4 h-4 flex items-center justify-center">
															{!isSorted && (
																<ArrowUpDown className="h-3 w-3 text-gray-400" />
															)}
															{isSorted &&
																(sortConfig?.direction ===
																"asc" ? (
																	<ArrowUp className="h-3 w-3" />
																) : (
																	<ArrowDown className="h-3 w-3" />
																))}
														</div>
													)}
												</div>
											</TableHead>
										);
									})}
								</TableRow>
							</TableHeader>
							<TableBody>
								{paginatedData.length === 0 ? (
									<TableRow>
										<TableCell colSpan={columns.length}>
											<div className="py-10 text-center text-sm text-slate-500">
												No results match your filters.
											</div>
										</TableCell>
									</TableRow>
								) : (
									paginatedData.map((item) => (
										<TableRow
											key={keyExtractor(item)}
											className={cn(
												onRowClick &&
													"cursor-pointer hover:bg-slate-50",
												typeof rowClassName ===
													"function"
													? rowClassName(item)
													: rowClassName,
											)}
											onClick={() => onRowClick?.(item)}
										>
											{columns.map((column, colIndex) => (
												<TableCell
													key={
														column.accessorKey
															? String(
																	column.accessorKey,
																)
															: colIndex
													}
												>
													{column.cell
														? column.cell(item)
														: column.accessorKey
															? (item[
																	column
																		.accessorKey
																] as ReactNode)
															: null}
												</TableCell>
											))}
										</TableRow>
									))
								)}
							</TableBody>
						</Table>
					</div>

					{pagination && totalPages > 1 && (
						<div className="flex items-center justify-between px-2">
							<p className="text-sm text-gray-500">
								Page {currentPage} of {totalPages}
							</p>
							<div className="flex items-center gap-2">
								<Button
									variant="outline"
									size="icon-sm"
									onClick={() =>
										setCurrentPage((page) =>
											Math.max(1, page - 1),
										)
									}
									disabled={currentPage === 1}
								>
									<ChevronLeft className="h-4 w-4" />
								</Button>
								<div className="flex items-center gap-1">
									{Array.from(
										{ length: totalPages },
										(_, i) => i + 1,
									).map((page) => {
										if (
											page === 1 ||
											page === totalPages ||
											Math.abs(page - currentPage) <= 1
										) {
											return (
												<Button
													key={page}
													variant={
														currentPage === page
															? "default"
															: "outline"
													}
													size="icon-sm"
													className="w-8"
													onClick={() =>
														setCurrentPage(page)
													}
												>
													{page}
												</Button>
											);
										}
										if (
											page === 2 ||
											page === totalPages - 1
										) {
											return <span key={page}>...</span>;
										}
										return null;
									})}
								</div>
								<Button
									variant="outline"
									size="icon-sm"
									onClick={() =>
										setCurrentPage((page) =>
											Math.min(totalPages, page + 1),
										)
									}
									disabled={currentPage === totalPages}
								>
									<ChevronRight className="h-4 w-4" />
								</Button>
							</div>
						</div>
					)}
				</div>
			</div>
		</div>
	);
}
