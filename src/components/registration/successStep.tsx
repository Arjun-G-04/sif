import { CheckIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CardContent } from "@/components/ui/card";
import { Link } from "@tanstack/react-router";

export function SuccessStep() {
	return (
		<div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
			<div className="w-full max-w-lg shadow-2xl border border-slate-200 bg-white rounded-xl">
				<CardContent className="pt-12 pb-12 text-center space-y-6">
					<div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto ring-8 ring-green-50">
						<CheckIcon className="w-10 h-10" />
					</div>
					<div className="space-y-2">
						<h2 className="text-3xl font-bold text-slate-900">
							Application Submitted Successfully!
						</h2>
						<p className="text-slate-500 text-lg">
							Your application has been submitted successfully.
							Your details will be verifed by the office and your
							account will be activated. You will receive a
							confirmation email once your account is activated.
						</p>
					</div>
					<Link to="/">
						<Button className="w-full h-12 text-lg bg-blue-600 hover:bg-blue-500">
							Go to Home
						</Button>
					</Link>
				</CardContent>
			</div>
		</div>
	);
}
