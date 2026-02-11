import { useEffect, useMemo, useState } from "react";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import {
	ArrowDown,
	ArrowUp,
	ArrowUpDown,
	ChevronLeft,
	ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";

export interface Column<T> {
	header: React.ReactNode;
	accessorKey?: keyof T;
	cell?: (item: T) => React.ReactNode;
	className?: string;
	sortable?: boolean; // Defaults to true if accessorKey is present
}

interface DataTableProps<T> {
	data: T[];
	columns: Column<T>[];
	keyExtractor: (item: T) => string | number;
	onRowClick?: (item: T) => void;
	emptyState?: React.ReactNode;
	rowClassName?: string | ((item: T) => string);
	className?: string;
	pagination?: boolean;
	defaultPageSize?: number;
}

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
}: DataTableProps<T>) {
	const [sortConfig, setSortConfig] = useState<{
		key: keyof T;
		direction: "asc" | "desc";
	} | null>(null);
	const [currentPage, setCurrentPage] = useState(1);

	const sortedData = useMemo(() => {
		if (!sortConfig) return data;

		return [...data].sort((a, b) => {
			const aValue = a[sortConfig.key];
			const bValue = b[sortConfig.key];

			if (aValue === bValue) return 0;
			if (aValue === null || aValue === undefined) return 1;
			if (bValue === null || bValue === undefined) return -1;

			const comparison = aValue < bValue ? -1 : 1;
			return sortConfig.direction === "asc" ? comparison : -comparison;
		});
	}, [data, sortConfig]);

	const totalPages = Math.ceil(sortedData.length / defaultPageSize);

	useEffect(() => {
		if (currentPage > totalPages && totalPages > 0) {
			setCurrentPage(totalPages);
		}
	}, [totalPages, currentPage]);

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
									sortConfig?.key === column.accessorKey;

								return (
									<TableHead
										key={
											column.accessorKey
												? String(column.accessorKey)
												: index
										}
										className={cn(
											column.className,
											isSortable &&
												"cursor-pointer select-none hover:bg-slate-50 transition-colors",
										)}
										onClick={() =>
											isSortable &&
											handleSort(column.accessorKey!)
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
						{paginatedData.map((item) => (
							<TableRow
								key={keyExtractor(item)}
								className={cn(
									onRowClick &&
										"cursor-pointer hover:bg-slate-50",
									typeof rowClassName === "function"
										? rowClassName(item)
										: rowClassName,
								)}
								onClick={() => onRowClick?.(item)}
							>
								{columns.map((column, colIndex) => (
									<TableCell
										key={
											column.accessorKey
												? String(column.accessorKey)
												: colIndex
										}
									>
										{column.cell
											? column.cell(item)
											: column.accessorKey
												? (item[
														column.accessorKey
													] as React.ReactNode)
												: null}
									</TableCell>
								))}
							</TableRow>
						))}
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
								setCurrentPage((p) => Math.max(1, p - 1))
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
								// Simple pagination: show current, first, last, and some around current
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
											onClick={() => setCurrentPage(page)}
										>
											{page}
										</Button>
									);
								}
								if (page === 2 || page === totalPages - 1) {
									return <span key={page}>...</span>;
								}
								return null;
							})}
						</div>
						<Button
							variant="outline"
							size="icon-sm"
							onClick={() =>
								setCurrentPage((p) =>
									Math.min(totalPages, p + 1),
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
	);
}
