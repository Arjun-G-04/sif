import {
	useMutation,
	useQueryClient,
	queryOptions,
	useSuspenseQuery,
} from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Header } from "@/components/office/header";
import { requireAdmin } from "@/lib/auth";
import {
	getConfiguration,
	updateConfiguration,
} from "@/services/configuration";
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

export const configurationQueryOptions = queryOptions({
	queryKey: ["configuration"],
	queryFn: () => getConfiguration(),
});

export const Route = createFileRoute("/office/configuration/")({
	component: ConfigurationPage,
	loader: async ({ context }) => {
		const user = await requireAdmin();
		await context.queryClient.ensureQueryData(configurationQueryOptions);
		return user;
	},
});

function ConfigurationPage() {
	const user = Route.useLoaderData();
	const configuration = useSuspenseQuery(configurationQueryOptions);
	const queryClient = useQueryClient();
	const [officeEmail, setOfficeEmail] = useState(
		configuration.data?.officeEmail || "",
	);
	const officeEmailId = useId();

	useEffect(() => {
		if (configuration.data?.officeEmail) {
			setOfficeEmail(configuration.data.officeEmail);
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
		updateMutation.mutate({ data: { officeEmail } });
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
				</div>
			</main>
		</div>
	);
}
