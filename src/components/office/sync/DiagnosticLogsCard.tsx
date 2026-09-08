import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { AlertCircle, Trash2 } from "lucide-react";

interface DiagnosticLogsCardProps {
	errors: string[];
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
					className="text-red-700 hover:text-red-900 hover:bg-red-100 transition-colors"
					onClick={onClear}
				>
					<Trash2 className="w-4 h-4 mr-1.5" />
					Clear Log
				</Button>
			</CardHeader>
			<CardContent>
				<div className="max-h-60 overflow-y-auto border border-red-200 bg-white rounded-lg p-3 font-mono text-xs text-red-800 space-y-1.5">
					{errors.map((err, i) => (
						<div
							// biome-ignore lint/suspicious/noArrayIndexKey: diagnostics log is readonly list
							key={i}
							className="pb-1.5 border-b border-red-50 last:border-b-0 last:pb-0"
						>
							<span className="font-semibold mr-1.5">
								[{i + 1}]
							</span>
							{err}
						</div>
					))}
				</div>
			</CardContent>
		</Card>
	);
}
