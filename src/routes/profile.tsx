import {
	queryOptions,
	useMutation,
	useQueryClient,
	useSuspenseQuery,
} from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import {
	AlertCircle,
	CheckCircle2,
	Edit3,
	FileText,
	Info,
	Lock,
	ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";
import { FieldResponsesDisplay } from "@/components/general/fieldResponses";
import { FieldsForm } from "@/components/general/fieldsForm";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Header } from "@/components/user/header";
import { requireUser } from "@/lib/auth";
import { getUserProfile, updateUserProfile } from "@/services/profile";

export const profileQueryOptions = queryOptions({
	queryKey: ["user", "profile"],
	queryFn: () => getUserProfile(),
});

export const Route = createFileRoute("/profile")({
	component: ProfilePage,
	loader: async ({ context }) => {
		const user = await requireUser();
		await context.queryClient.ensureQueryData(profileQueryOptions);
		return user;
	},
});

function ProfilePage() {
	const user = Route.useLoaderData();
	const queryClient = useQueryClient();
	const profileQuery = useSuspenseQuery(profileQueryOptions);
	const profileData = profileQuery.data;

	const updateMutation = useMutation({
		mutationFn: async (formData: FormData) => {
			return await updateUserProfile({ data: formData });
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["user", "profile"] });
			toast.success("Profile details saved successfully.");
		},
		onError: (err: Error) => {
			toast.error(err.message || "Failed to update profile details.");
		},
	});

	const hasRegistration = profileData.user.hasRegistration;
	const missingCount = profileData.missingFields.length;
	const hasSubmittedResponses = profileData.submittedResponses.length > 0;

	return (
		<div className="min-h-screen flex flex-col bg-slate-50/50">
			<Header user={user} backTo="/" />

			<main className="flex-1 p-4 md:p-6 lg:p-8">
				<div className="w-full space-y-6">
					{/* Header section */}
					<div className="space-y-1.5">
						<h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900">
							My Profile
						</h1>
						<p className="text-slate-500 text-sm md:text-base">
							Review and complete your account and registration
							details
						</p>
					</div>

					<Separator className="bg-slate-200" />

					{/* Status Alert Banner */}
					{!hasRegistration ? (
						<Alert className="border-slate-200 bg-slate-50 text-slate-700 py-3">
							<Info className="h-4 w-4 text-slate-500" />
							<AlertTitle className="font-semibold text-slate-800 text-sm">
								No Registration Record
							</AlertTitle>
							<AlertDescription className="text-slate-600 text-xs">
								This account is not linked to a dynamic
								registration record.
							</AlertDescription>
						</Alert>
					) : missingCount === 0 ? (
						<Alert className="border-emerald-200 bg-emerald-50 text-emerald-900 py-3">
							<CheckCircle2 className="h-4 w-4 text-emerald-600" />
							<AlertTitle className="font-semibold text-emerald-900 text-sm">
								Profile Complete
							</AlertTitle>
							<AlertDescription className="text-emerald-800 text-xs">
								All registration fields have been submitted and
								locked.
							</AlertDescription>
						</Alert>
					) : (
						<Alert className="border-amber-200 bg-amber-50 text-amber-900 py-3">
							<AlertCircle className="h-4 w-4 text-amber-600" />
							<AlertTitle className="font-semibold text-amber-900 text-sm">
								Missing Information Detected
							</AlertTitle>
							<AlertDescription className="text-amber-800 text-xs">
								You have {missingCount} unfilled registration
								field(s). Please complete them below. Once
								submitted and confirmed, these values will be
								locked.
							</AlertDescription>
						</Alert>
					)}

					{/* Account Overview Card */}
					<Card className="shadow-xs border-slate-200 py-4 gap-2">
						<CardHeader className="pb-0">
							<div className="flex items-center justify-between">
								<div className="space-y-0.5">
									<CardTitle className="text-base font-semibold text-slate-900 flex items-center gap-2">
										<ShieldCheck className="w-4 h-4 text-blue-600" />
										Account Information
									</CardTitle>
									<p className="text-xs text-slate-500">
										Your verified account credentials and
										status
									</p>
								</div>
								<Badge
									variant="outline"
									className="text-[11px] text-slate-500 gap-1 bg-slate-50 border-slate-200"
								>
									<Lock className="w-3 h-3 text-slate-400" />
									Locked
								</Badge>
							</div>
						</CardHeader>
						<CardContent className="pt-0">
							<div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
								<div className="space-y-1">
									<span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
										Email / Username
									</span>
									<p className="text-sm font-medium text-slate-900 break-all">
										{profileData.user.email}
									</p>
								</div>

								<div className="space-y-1">
									<span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
										Phone Number
									</span>
									<p className="text-sm font-medium text-slate-900">
										{profileData.user.phone || "—"}
									</p>
								</div>

								<div className="space-y-1">
									<span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
										Account Status
									</span>
									<div>
										<Badge
											variant="secondary"
											className="bg-emerald-100 text-emerald-800 border-emerald-200 text-xs font-semibold"
										>
											Active
										</Badge>
									</div>
								</div>
							</div>
						</CardContent>
					</Card>

					{/* Submitted (Locked) Details Card */}
					{hasRegistration && (
						<Card className="shadow-xs border-slate-200 py-4 gap-2">
							<CardHeader className="pb-0">
								<div className="flex items-center justify-between">
									<div className="space-y-0.5">
										<CardTitle className="text-base font-semibold text-slate-900 flex items-center gap-2">
											<FileText className="w-4 h-4 text-blue-600" />
											Submitted Details
										</CardTitle>
										<p className="text-xs text-slate-500">
											Your submitted registration details
										</p>
									</div>
									{hasSubmittedResponses && (
										<Badge
											variant="outline"
											className="text-[11px] text-slate-500 gap-1 bg-slate-50 border-slate-200"
										>
											<Lock className="w-3 h-3 text-slate-400" />
											Locked
										</Badge>
									)}
								</div>
							</CardHeader>
							<CardContent className="pt-0">
								<FieldResponsesDisplay
									responses={profileData.submittedResponses}
									emptyMessage="No submitted registration responses found."
								/>
							</CardContent>
						</Card>
					)}

					{/* Unsubmitted Missing Details Form (using canonical FieldsForm with 2-step review) */}
					{hasRegistration && missingCount > 0 && (
						<Card className="shadow-xs border-slate-200 py-4 gap-3">
							<CardHeader className="pb-0">
								<CardTitle className="text-base font-semibold text-slate-900 flex items-center gap-2">
									<Edit3 className="w-4 h-4 text-amber-600" />
									Complete Missing Details
								</CardTitle>
								<p className="text-xs text-slate-500">
									Please complete the required information
									below. You will have an opportunity to
									review before confirming.
								</p>
							</CardHeader>
							<CardContent className="pt-0">
								<FieldsForm
									fields={profileData.missingFields}
									onSubmit={(formData) =>
										updateMutation.mutate(formData)
									}
									isLoading={updateMutation.isPending}
									submitText="Save Details"
								/>
							</CardContent>
						</Card>
					)}
				</div>
			</main>
		</div>
	);
}
