import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import type { SyncJobError } from "@/services/istem";
import { AlertCircle, Trash2 } from "lucide-react";

interface DiagnosticLogsCardProps {
	errors: SyncJobError[];
	onClear: () => void;
}

export function DiagnosticLogsCard({
	errors,
	onClear,
}: DiagnosticLogsCardProps) {
	if (errors.length === 0) return null;

	return (
		<Card className="border-red-200 bg-red-50/25">
			<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
				<div className="space-y-1">
					<CardTitle className="text-red-950 flex items-center gap-2">
						<AlertCircle className="w-5 h-5 text-red-600" />
						Diagnostics Log (Sync Errors)
					</CardTitle>
					<CardDescription className="text-red-700">
						Detailed errors returned from the I-STEM API. Use this
						log to troubleshoot field mappings.
					</CardDescription>
				</div>
				<Button
					variant="ghost"
					size="sm"
					className="text-red-700 hover:text-red-900 hover:bg-red-100 transition-colors"
					onClick={onClear}
				>
					<Trash2 className="w-4 h-4 mr-1.5" />
					Clear Log
				</Button>
			</CardHeader>
			<CardContent>
				<div className="max-h-72 overflow-y-auto border border-red-200 bg-white rounded-lg p-3 font-mono text-xs space-y-2">
					{errors.map((err, i) => (
						<div
							key={`${err.target}-${i}`}
							className="pb-2 border-b border-red-100 last:border-b-0 last:pb-0 flex items-start gap-2"
						>
							<span className="font-semibold text-slate-400 shrink-0 select-none">
								[{i + 1}]
							</span>
							<div className="flex-1 flex flex-wrap items-baseline gap-1.5 min-w-0">
								<Badge
									variant="outline"
									className="font-mono text-[10px] uppercase font-semibold px-1.5 py-0 bg-slate-100 text-slate-700 border-slate-300"
								>
									{err.category}
								</Badge>
								<span className="font-semibold text-slate-900 break-all">
									{err.target}:
								</span>
								<span className="text-red-700 break-words">
									{err.message}
								</span>
							</div>
						</div>
					))}
				</div>
			</CardContent>
		</Card>
	);
}
