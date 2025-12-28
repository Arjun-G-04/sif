import { AddFieldDialog } from "@/components/office/addFieldDialog";
import { FieldsView } from "@/components/office/fieldsView";
import { Header } from "@/components/office/header";
import { requireAdmin } from "@/lib/auth";
import { getFields } from "@/services/field";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";

export const fieldsQueryOptions = queryOptions({
	queryKey: ["fields", "registration"],
	queryFn: () => getFields({ data: { entityType: "registration" } }),
});

export const Route = createFileRoute("/office/registration/edit/")({
	component: RegistrationPage,
	loader: async ({ context }) => {
		const user = await requireAdmin();
		await context.queryClient.ensureQueryData(fieldsQueryOptions);
		return user;
	},
});

function RegistrationPage() {
	const user = Route.useLoaderData();
	const fields = useSuspenseQuery(fieldsQueryOptions);

	return (
		<div className="min-h-screen flex flex-col bg-slate-50/50">
			<Header user={user} backTo="/office" />
			<main className="flex-1 p-4 md:p-6 lg:p-8">
				<div className="w-full space-y-6">
					<div className="flex justify-between items-center">
						<div>
							<h2 className="text-2xl font-bold tracking-tight text-slate-900">
								User Registration Fields
							</h2>
							<p className="text-slate-500">
								Manage fields for user registration.
							</p>
						</div>
						<AddFieldDialog entityType="registration" />
					</div>
					<FieldsView fields={fields.data} />
				</div>
			</main>
		</div>
	);
}
