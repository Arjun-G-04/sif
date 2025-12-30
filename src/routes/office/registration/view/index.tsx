import { FieldResponsesDisplay } from "@/components/general/fieldResponses";
import { Header } from "@/components/office/header";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { requireAdmin } from "@/lib/auth";
import { getRegistrations } from "@/services/registration";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Eye } from "lucide-react";
import { useState } from "react";

type RegistrationData = Awaited<ReturnType<typeof getRegistrations>>[number];

export const registrationsQueryOptions = queryOptions({
	queryKey: ["registrations"],
	queryFn: () => getRegistrations(),
});

export const Route = createFileRoute("/office/registration/view/")({
	component: RegistrationViewPage,
	loader: async ({ context }) => {
		const user = await requireAdmin();
		await context.queryClient.ensureQueryData(registrationsQueryOptions);
		return user;
	},
});

function RegistrationViewPage() {
	const user = Route.useLoaderData();
	const registrations = useSuspenseQuery(registrationsQueryOptions);
	const [selectedRegistration, setSelectedRegistration] =
		useState<RegistrationData | null>(null);

	return (
		<div className="min-h-screen flex flex-col bg-slate-50/50">
			<Header user={user} backTo="/office" />
			<main className="flex-1 p-4 md:p-6 lg:p-8">
				<div className="w-full space-y-6">
					<div>
						<h2 className="text-2xl font-bold tracking-tight text-slate-900">
							User Registrations
						</h2>
						<p className="text-slate-500">
							View and manage submitted user registrations.
						</p>
					</div>

					<div className="bg-white rounded-lg border border-slate-200 overflow-hidden shadow-sm">
						<Table>
							<TableHeader>
								<TableRow className="bg-slate-50">
									<TableHead className="font-semibold">
										Email
									</TableHead>
									<TableHead className="font-semibold">
										Phone
									</TableHead>
									<TableHead className="text-right font-semibold">
										Actions
									</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{registrations.data.length === 0 ? (
									<TableRow>
										<TableCell
											colSpan={4}
											className="h-32 text-center text-slate-500"
										>
											No registrations found.
										</TableCell>
									</TableRow>
								) : (
									registrations.data.map((reg) => (
										<TableRow
											key={reg.id}
											className="cursor-pointer hover:bg-slate-50/80 transition-colors"
											onClick={() =>
												setSelectedRegistration(reg)
											}
										>
											<TableCell>{reg.email}</TableCell>
											<TableCell>{reg.phone}</TableCell>
											<TableCell className="text-right">
												<Button
													variant="ghost"
													size="sm"
													className="h-8 w-8 p-0"
												>
													<Eye className="h-4 w-4 text-slate-500" />
												</Button>
											</TableCell>
										</TableRow>
									))
								)}
							</TableBody>
						</Table>
					</div>
				</div>
			</main>

			<RegistrationDetailsDialog
				registration={selectedRegistration}
				onOpenChange={(open) => !open && setSelectedRegistration(null)}
			/>
		</div>
	);
}

function RegistrationDetailsDialog({
	registration,
	onOpenChange,
}: {
	registration: RegistrationData | null;
	onOpenChange: (open: boolean) => void;
}) {
	return (
		<Dialog open={!!registration} onOpenChange={onOpenChange}>
			<DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
				<DialogHeader>
					<DialogTitle className="text-xl">
						Registration Details
					</DialogTitle>
				</DialogHeader>
				{registration && (
					<div className="space-y-6 py-4">
						<div className="grid grid-cols-2 gap-4">
							<DetailItem
								label="Email"
								value={registration.email}
							/>
							<DetailItem
								label="Phone"
								value={registration.phone}
							/>
							<DetailItem
								label="Created At"
								value={
									registration.createdAt
										? new Date(
												registration.createdAt,
											).toLocaleString()
										: "-"
								}
							/>
						</div>

						<div className="space-y-4 pt-4 border-t border-slate-100">
							<h3 className="font-semibold text-slate-900">
								Field Responses
							</h3>
							<FieldResponsesDisplay
								responses={registration.responses}
								emptyMessage="No dynamic field responses."
							/>
						</div>
					</div>
				)}
			</DialogContent>
		</Dialog>
	);
}

function DetailItem({ label, value }: { label: string; value: string }) {
	return (
		<div className="space-y-1">
			<p className="text-sm font-medium text-slate-500">{label}</p>
			<p className="text-slate-900 font-medium">{value}</p>
		</div>
	);
}
