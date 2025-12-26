import type { Field } from "@/services/field";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

interface FieldsViewProps {
	fields: Field[];
}

export function FieldsView({ fields }: FieldsViewProps) {
	if (fields.length === 0) {
		return (
			<div className="py-12 text-center border-2 border-dashed rounded-xl">
				<p className="text-gray-400 italic">
					No custom fields defined yet.
				</p>
			</div>
		);
	}

	return (
		<div className="border rounded-lg bg-white overflow-hidden">
			<Table>
				<TableHeader>
					<TableRow className="bg-gray-50/50">
						<TableHead className="w-[80px]">Order</TableHead>
						<TableHead>Field Name</TableHead>
						<TableHead>Type</TableHead>
						<TableHead>Options</TableHead>
					</TableRow>
				</TableHeader>
				<TableBody>
					{fields.map((f) => (
						<TableRow key={f.id}>
							<TableCell className="font-medium text-gray-500">
								{f.order}
							</TableCell>
							<TableCell className="font-semibold text-gray-900">
								{f.name}
							</TableCell>
							<TableCell>
								<Badge
									variant="secondary"
									className="capitalize"
								>
									{f.type.replace("_", " ")}
								</Badge>
							</TableCell>
							<TableCell>
								{f.type === "single_select" &&
								f.options &&
								f.options.length > 0 ? (
									<div className="flex flex-wrap gap-1">
										{f.options.map((opt) => (
											<Badge
												key={opt.id}
												variant="outline"
												className="text-[10px] py-0 px-2 font-normal text-gray-600 bg-gray-50/50"
											>
												{opt.value}
											</Badge>
										))}
									</div>
								) : (
									<span className="text-xs text-gray-400 italic">
										N/A
									</span>
								)}
							</TableCell>
						</TableRow>
					))}
				</TableBody>
			</Table>
		</div>
	);
}
