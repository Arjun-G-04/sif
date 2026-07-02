import {
	useMutation,
	useQueryClient,
	queryOptions,
	useSuspenseQuery,
} from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { FieldDialog } from "@/components/office/fieldDialog";
import { FieldsView } from "@/components/office/fieldsView";
import { Header } from "@/components/office/header";
import { requireAdmin } from "@/lib/auth";
import {
	getConfiguration,
	updateConfiguration,
} from "@/services/configuration";
import { getFields } from "@/services/field";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "sonner";
import { useState, useEffect, useId } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const configurationQueryOptions = queryOptions({
	queryKey: ["configuration"],
	queryFn: () => getConfiguration(),
});

const defaultEquipmentFieldsQueryOptions = queryOptions({
	queryKey: ["fields", "equipment", "defaults"],
	queryFn: () => getFields({ data: { entityType: "equipment" } }),
});

export const registrationFieldsQueryOptions = queryOptions({
	queryKey: ["fields", "registration"],
	queryFn: () => getFields({ data: { entityType: "registration" } }),
});

export const Route = createFileRoute("/office/configuration/")({
	component: ConfigurationPage,
	loader: async ({ context }) => {
		const user = await requireAdmin();
		await Promise.all([
			context.queryClient.ensureQueryData(configurationQueryOptions),
			context.queryClient.ensureQueryData(
				defaultEquipmentFieldsQueryOptions,
			),
			context.queryClient.ensureQueryData(registrationFieldsQueryOptions),
		]);
		return user;
	},
});

function ConfigurationPage() {
	const user = Route.useLoaderData();
	const configuration = useSuspenseQuery(configurationQueryOptions);
	const defaultEquipmentFields = useSuspenseQuery(
		defaultEquipmentFieldsQueryOptions,
	);
	const registrationFields = useSuspenseQuery(registrationFieldsQueryOptions);
	const queryClient = useQueryClient();
	const [officeEmail, setOfficeEmail] = useState(
		configuration.data?.officeEmail || "",
	);
	const [registrationCategoryFieldId, setRegistrationCategoryFieldId] =
		useState<string>(
			configuration.data?.registrationCategoryFieldId?.toString() ||
				"none",
		);
	const [registrationNameFieldId, setRegistrationNameFieldId] =
		useState<string>(
			configuration.data?.registrationNameFieldId?.toString() || "none",
		);
	const officeEmailId = useId();
	const categoryFieldSelectId = useId();
	const nameFieldSelectId = useId();

	useEffect(() => {
		if (configuration.data?.officeEmail) {
			setOfficeEmail(configuration.data.officeEmail);
		}
		if (configuration.data?.registrationCategoryFieldId) {
			setRegistrationCategoryFieldId(
				configuration.data.registrationCategoryFieldId.toString(),
			);
		} else {
			setRegistrationCategoryFieldId("none");
		}
		if (configuration.data?.registrationNameFieldId) {
			setRegistrationNameFieldId(
				configuration.data.registrationNameFieldId.toString(),
			);
		} else {
			setRegistrationNameFieldId("none");
		}
	}, [configuration.data]);

	const updateMutation = useMutation({
		mutationFn: updateConfiguration,
		onSuccess: () => {
			queryClient.invalidateQueries(configurationQueryOptions);
			toast.success("Configuration updated successfully");
		},
		onError: (error) => {
			toast.error(
				error instanceof Error
					? error.message
					: "Failed to update configuration",
			);
		},
	});

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		updateMutation.mutate({
			data: {
				officeEmail,
			},
		});
	};

	const handleRegistrationSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		const fieldId =
			registrationCategoryFieldId === "none"
				? null
				: Number(registrationCategoryFieldId);
		const nameFieldId =
			registrationNameFieldId === "none"
				? null
				: Number(registrationNameFieldId);
		updateMutation.mutate({
			data: {
				registrationCategoryFieldId: fieldId,
				registrationNameFieldId: nameFieldId,
			},
		});
	};

	return (
		<div className="min-h-screen flex flex-col bg-slate-50/50">
			<Header user={user} backTo="/office" />
			<main className="flex-1 p-4 md:p-6 lg:p-8">
				<div className="w-full space-y-6">
					<div>
						<h2 className="text-2xl font-bold tracking-tight text-slate-900">
							System Configuration
						</h2>
						<p className="text-slate-500">
							Manage global settings and configuration values for
							the application.
						</p>
					</div>

					<Card>
						<CardHeader>
							<CardTitle>Email Settings</CardTitle>
							<CardDescription>
								Configure the primary email for application
								related notifications.
							</CardDescription>
						</CardHeader>
						<CardContent>
							<form onSubmit={handleSubmit} className="space-y-4">
								<div className="space-y-2">
									<Label htmlFor={officeEmailId}>
										Office Email Address
									</Label>
									<Input
										id={officeEmailId}
										type="email"
										value={officeEmail}
										onChange={(e) =>
											setOfficeEmail(e.target.value)
										}
										placeholder="e.g. office@example.com"
										required
									/>
								</div>
								<div className="flex justify-end pt-2">
									<Button
										type="submit"
										disabled={
											updateMutation.isPending ||
											officeEmail ===
												configuration.data?.officeEmail
										}
									>
										{updateMutation.isPending && (
											<Spinner className="mr-2" />
										)}
										{updateMutation.isPending
											? "Updating..."
											: "Save Changes"}
									</Button>
								</div>
							</form>
						</CardContent>
					</Card>

					<Card>
						<CardHeader>
							<CardTitle>Registration Settings</CardTitle>
							<CardDescription>
								Configure category field mappings for user
								registrations.
							</CardDescription>
						</CardHeader>
						<CardContent>
							<form
								onSubmit={handleRegistrationSubmit}
								className="space-y-4"
							>
								<div className="space-y-2">
									<Label htmlFor={categoryFieldSelectId}>
										Registration Category Field (Must be
										single-select)
									</Label>
									<Select
										value={registrationCategoryFieldId}
										onValueChange={
											setRegistrationCategoryFieldId
										}
									>
										<SelectTrigger
											id={categoryFieldSelectId}
											className="w-full"
										>
											<SelectValue placeholder="Select registration category field" />
										</SelectTrigger>
										<SelectContent>
											<SelectItem value="none">
												None (Disabled)
											</SelectItem>
											{registrationFields.data
												?.filter(
													(f) =>
														f.type ===
															"single_select" &&
														f.active,
												)
												.map((field) => (
													<SelectItem
														key={field.id}
														value={field.id.toString()}
													>
														{field.name}
													</SelectItem>
												))}
										</SelectContent>
									</Select>
								</div>
								<div className="space-y-2">
									<Label htmlFor={nameFieldSelectId}>
										Registration Name Field (Must be text)
									</Label>
									<Select
										value={registrationNameFieldId}
										onValueChange={
											setRegistrationNameFieldId
										}
									>
										<SelectTrigger
											id={nameFieldSelectId}
											className="w-full"
										>
											<SelectValue placeholder="Select registration name field" />
										</SelectTrigger>
										<SelectContent>
											<SelectItem value="none">
												None (Disabled)
											</SelectItem>
											{registrationFields.data
												?.filter(
													(f) =>
														f.type === "text" &&
														f.active,
												)
												.map((field) => (
													<SelectItem
														key={field.id}
														value={field.id.toString()}
													>
														{field.name}
													</SelectItem>
												))}
										</SelectContent>
									</Select>
								</div>
								<div className="flex justify-end pt-2">
									<Button
										type="submit"
										disabled={
											updateMutation.isPending ||
											(registrationCategoryFieldId ===
												(configuration.data?.registrationCategoryFieldId?.toString() ||
													"none") &&
												registrationNameFieldId ===
													(configuration.data?.registrationNameFieldId?.toString() ||
														"none"))
										}
									>
										{updateMutation.isPending && (
											<Spinner className="mr-2" />
										)}
										{updateMutation.isPending
											? "Updating..."
											: "Save Settings"}
									</Button>
								</div>
							</form>
						</CardContent>
					</Card>

					<Card>
						<CardHeader>
							<CardTitle>Equipment Default Fields</CardTitle>
							<CardDescription>
								Manage fields available as shared defaults for
								equipment bookings.
							</CardDescription>
						</CardHeader>
						<CardContent className="space-y-6">
							<Tabs
								defaultValue="initial"
								className="w-full space-y-6"
							>
								<TabsList className="w-full bg-white border">
									<TabsTrigger
										value="initial"
										className="data-[state=active]:bg-slate-100"
									>
										Initial Booking Fields
									</TabsTrigger>
									<TabsTrigger
										value="payment"
										className="data-[state=active]:bg-slate-100"
									>
										Payment Stage Fields
									</TabsTrigger>
								</TabsList>

								<TabsContent
									value="initial"
									className="space-y-6 outline-none"
								>
									<div className="flex justify-end">
										<FieldDialog
											entityType="equipment"
											stage="initial"
											allowedRelations={[
												{
													entityType: "registration",
													label: "Registration",
												},
											]}
										/>
									</div>
									<FieldsView
										fields={defaultEquipmentFields.data}
										stage="initial"
										allowedRelations={[
											{
												entityType: "registration",
												label: "Registration",
											},
										]}
									/>
								</TabsContent>

								<TabsContent
									value="payment"
									className="space-y-6 outline-none"
								>
									<div className="flex justify-end">
										<FieldDialog
											entityType="equipment"
											stage="payment"
											allowedRelations={[
												{
													entityType: "registration",
													label: "Registration",
												},
											]}
										/>
									</div>
									<FieldsView
										fields={defaultEquipmentFields.data}
										stage="payment"
										allowedRelations={[
											{
												entityType: "registration",
												label: "Registration",
											},
										]}
									/>
								</TabsContent>
							</Tabs>
						</CardContent>
					</Card>
				</div>
			</main>
		</div>
	);
}
