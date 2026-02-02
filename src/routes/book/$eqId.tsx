import {
	queryOptions,
	useSuspenseQuery,
	useMutation,
} from "@tanstack/react-query";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import { getEquipmentNameById, getEquipmentFields } from "@/services/equipment";
import { requireUser } from "@/lib/auth";
import { Header } from "@/components/user/header";
import { Button } from "@/components/ui/button";
import { CheckIcon } from "@/components/svgs";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { FieldsForm } from "@/components/general/fieldsForm";
import { toast } from "sonner";
import { submitBooking } from "@/services/booking";

const equipmentQueryOptions = (equipmentId: number) =>
	queryOptions({
		queryKey: ["equipment", equipmentId],
		queryFn: () => getEquipmentNameById({ data: { id: equipmentId } }),
	});

const equipmentFieldsQueryOptions = (equipmentId: number) =>
	queryOptions({
		queryKey: ["equipment", "fields", equipmentId],
		queryFn: () => getEquipmentFields({ data: { equipmentId } }),
	});

export const Route = createFileRoute("/book/$eqId")({
	component: EquipmentBookingPage,
	loader: async ({ params, context }) => {
		const user = await requireUser();
		const equipmentId = Number.parseInt(params.eqId, 10);

		await Promise.all([
			context.queryClient.ensureQueryData(
				equipmentQueryOptions(equipmentId),
			),
			context.queryClient.ensureQueryData(
				equipmentFieldsQueryOptions(equipmentId),
			),
		]);

		return { user, equipmentId };
	},
});

function EquipmentBookingPage() {
	const { user, equipmentId } = Route.useLoaderData();
	const equipmentName = useSuspenseQuery(equipmentQueryOptions(equipmentId));
	const fields = useSuspenseQuery(equipmentFieldsQueryOptions(equipmentId));
	const router = useRouter();

	const bookingMutation = useMutation({
		mutationFn: (formData: FormData) => {
			formData.append("equipmentId", equipmentId.toString());
			return submitBooking({ data: formData });
		},
		onError: (err) => {
			toast.error(
				err instanceof Error ? err.message : "Failed to submit booking",
			);
		},
	});

	if (bookingMutation.isSuccess) {
		return (
			<div className="min-h-screen flex flex-col bg-slate-50/50">
				<Header user={user} backTo="/book" />
				<main className="flex-1 p-4 md:p-6 lg:p-8 flex items-center justify-center">
					<div className="max-w-md w-full text-center space-y-4">
						<div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center text-green-600">
							<CheckIcon className="w-8 h-8" />
						</div>
						<h2 className="text-2xl font-bold text-slate-900">
							Booking Submitted
						</h2>
						<p className="text-slate-500">
							Your request for {equipmentName.data} has been
							successfully submitted. You'll receive an email once
							the operator confirms your request.
						</p>
						<Button
							className="mt-4"
							onClick={() => router.navigate({ to: "/book" })}
						>
							Back to Equipments
						</Button>
					</div>
				</main>
			</div>
		);
	}

	return (
		<div className="min-h-screen flex flex-col bg-slate-50/50">
			<Header user={user} backTo="/book" />

			<main className="flex-1 p-4 md:p-6 lg:p-8">
				<div className="w-full space-y-8">
					<div className="space-y-2">
						<h2 className="text-3xl font-bold tracking-tight text-slate-900">
							{equipmentName.data}
						</h2>
						<p className="text-slate-500 text-lg">
							Please fill in the details below to book{" "}
							{equipmentName.data}.
						</p>
					</div>

					<Separator className="bg-slate-200" />

					<Card className="border-slate-200 shadow-sm">
						<CardContent>
							<FieldsForm
								fields={fields.data}
								onSubmit={bookingMutation.mutate}
								isLoading={bookingMutation.isPending}
								submitText="Submit Booking"
							/>
						</CardContent>
					</Card>
				</div>
			</main>
		</div>
	);
}
