import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { getAvailableEquipments } from "@/services/equipment";
import {
	Card,
	CardContent,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
	Building2,
	Coins,
	Cpu,
	ExternalLink,
	Factory,
	Globe,
	MapPin,
	Tag,
} from "lucide-react";
import { Header } from "@/components/user/header";
import { requireUser } from "@/lib/auth";
import { Action } from "@/components/general/action";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

export const availableEquipmentsQueryOptions = queryOptions({
	queryKey: ["availableEquipments"],
	queryFn: () => getAvailableEquipments(),
});

export const Route = createFileRoute("/book/")({
	component: BookPage,
	loader: async ({ context }) => {
		const user = await requireUser();
		await context.queryClient.ensureQueryData(
			availableEquipmentsQueryOptions,
		);
		return { user };
	},
});

interface EquipmentMetaItemProps {
	icon: React.ComponentType<{ className?: string }>;
	label: string;
	value: string;
	className?: string;
	isMono?: boolean;
}

function EquipmentMetaItem({
	icon: Icon,
	label,
	value,
	className,
	isMono,
}: EquipmentMetaItemProps) {
	return (
		<div className={cn("flex flex-col space-y-0.5", className)}>
			<span className="text-xs font-medium text-slate-500 flex items-center gap-1.5 whitespace-nowrap">
				<Icon className="w-3.5 h-3.5 text-slate-400 shrink-0" />
				{label}
			</span>
			<span
				className={cn(
					"text-sm font-semibold text-slate-900 truncate",
					isMono && "font-mono",
				)}
				title={value}
			>
				{value}
			</span>
		</div>
	);
}

function formatExternalUrl(rawUrl: string): string {
	if (/^https?:\/\//i.test(rawUrl)) {
		return rawUrl;
	}
	return `https://${rawUrl}`;
}

function BookPage() {
	const { user } = Route.useLoaderData();
	const equipmentsQuery = useSuspenseQuery(availableEquipmentsQueryOptions);
	const equipments = equipmentsQuery.data;

	return (
		<div className="min-h-screen flex flex-col bg-slate-50/50">
			<Header user={user} backTo="/" />

			<main className="flex-1 p-4 md:p-6 lg:p-8">
				<div className="w-full space-y-8">
					<div className="space-y-2">
						<h2 className="text-3xl font-bold tracking-tight text-slate-900">
							Book Equipment
						</h2>
						<p className="text-slate-500 text-lg">
							Select an equipment to proceed with booking.
						</p>
					</div>

					<Separator className="bg-slate-200" />

					<div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
						{equipments.map((equipment) => (
							<Card
								key={equipment.id}
								className="shadow-sm border-slate-200 flex flex-col justify-between hover:border-slate-300 transition-colors"
							>
								<div>
									<CardHeader className="space-y-2 pb-3">
										<div className="flex items-start justify-between gap-4">
											<CardTitle className="text-2xl font-bold text-slate-900 leading-tight">
												{equipment.name}
											</CardTitle>
											<Badge
												variant="secondary"
												className="font-mono text-xs shrink-0 px-2.5 py-1"
											>
												{equipment.code}
											</Badge>
										</div>
										{equipment.description && (
											<p className="text-sm text-slate-600 leading-relaxed pt-0.5">
												{equipment.description}
											</p>
										)}
									</CardHeader>

									<CardContent className="pt-0 pb-0">
										<div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-3.5 pt-3 pb-3 border-y border-slate-100">
											{equipment.make && (
												<EquipmentMetaItem
													icon={Factory}
													label="Make"
													value={equipment.make}
												/>
											)}

											{equipment.model && (
												<EquipmentMetaItem
													icon={Cpu}
													label="Model"
													value={equipment.model}
												/>
											)}

											{equipment.departmentLab && (
												<EquipmentMetaItem
													icon={Building2}
													label="Dept / Lab"
													value={
														equipment.departmentLab
													}
												/>
											)}

											{equipment.location && (
												<div className="flex flex-col space-y-0.5 sm:col-span-2">
													<span className="text-xs font-medium text-slate-500 flex items-center gap-1.5 whitespace-nowrap">
														<MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
														Location
													</span>
													<span className="text-sm font-semibold text-slate-900 break-words">
														{equipment.location}
													</span>
												</div>
											)}

											{equipment.usageRate && (
												<EquipmentMetaItem
													icon={Coins}
													label="Usage Rate"
													value={equipment.usageRate}
												/>
											)}

											{equipment.serialNumber && (
												<EquipmentMetaItem
													icon={Tag}
													label="Serial Number"
													value={
														equipment.serialNumber
													}
													isMono
												/>
											)}

											{equipment.websiteUrl && (
												<div className="flex flex-col space-y-0.5">
													<span className="text-xs font-medium text-slate-500 flex items-center gap-1.5 whitespace-nowrap">
														<Globe className="w-3.5 h-3.5 text-slate-400 shrink-0" />
														Website
													</span>
													<a
														href={formatExternalUrl(
															equipment.websiteUrl,
														)}
														target="_blank"
														rel="noopener noreferrer"
														className="inline-flex items-center gap-1 text-sm font-semibold text-indigo-600 hover:text-indigo-800 hover:underline truncate max-w-full"
													>
														<span className="truncate">
															{equipment.websiteUrl.replace(
																/^https?:\/\//,
																"",
															)}
														</span>
														<ExternalLink className="w-3.5 h-3.5 shrink-0" />
													</a>
												</div>
											)}
										</div>
									</CardContent>
								</div>

								<CardFooter>
									<Action
										to="/book/$eqId"
										params={{
											eqId: equipment.id.toString(),
										}}
										label="Book Now"
									/>
								</CardFooter>
							</Card>
						))}
					</div>

					{equipments.length === 0 && (
						<div className="text-center py-12 text-slate-500">
							No active equipments available at the moment.
						</div>
					)}
				</div>
			</main>
		</div>
	);
}
