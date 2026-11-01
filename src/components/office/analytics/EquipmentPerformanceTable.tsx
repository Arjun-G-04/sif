import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { ArrowRight } from "lucide-react";
import type { EquipmentStat } from "./types";

interface EquipmentPerformanceTableProps {
	equipmentStats: EquipmentStat[];
	onFocusEquipment: (equipmentId: string) => void;
}

export function EquipmentPerformanceTable({
	equipmentStats,
	onFocusEquipment,
}: EquipmentPerformanceTableProps) {
	return (
		<Card className="shadow-sm border-slate-200 bg-white">
			<CardHeader>
				<CardTitle className="text-lg font-semibold text-slate-900">
					Equipment Performance Breakdown
				</CardTitle>
				<CardDescription>
					Detailed summary of bookings, total revenue, and average
					revenue per session for each instrument.
				</CardDescription>
			</CardHeader>
			<CardContent>
				<div className="overflow-x-auto">
					<table className="w-full text-sm text-left">
						<thead className="text-xs uppercase bg-slate-50 text-slate-600 border-b border-slate-200">
							<tr>
								<th className="py-3 px-4">Equipment</th>
								<th className="py-3 px-4">Code</th>
								<th className="py-3 px-4">Lab / Department</th>
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
										{eq.departmentLab || "—"}
									</td>
									<td className="py-3 px-4 text-right font-medium text-slate-700">
										{eq.count}
									</td>
									<td className="py-3 px-4 text-right font-bold text-indigo-600">
										₹{eq.revenue.toLocaleString()}
									</td>
									<td className="py-3 px-4 text-right text-slate-600">
										₹{eq.avgTicket.toLocaleString()}
									</td>
									<td className="py-3 px-4 text-center">
										<Button
											variant="ghost"
											size="sm"
											onClick={() =>
												onFocusEquipment(String(eq.id))
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
	);
}
