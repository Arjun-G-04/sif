import { createFileRoute } from "@tanstack/react-router";
import { Home } from "@/components/user/home";
import { Login } from "@/components/user/login";
import { verifyAuth } from "@/lib/auth";

export const Route = createFileRoute("/")({
	component: HomePage,
	loader: async () => {
		return await verifyAuth();
	},
});

function HomePage() {
	const loaderData = Route.useLoaderData();

	if (loaderData.authenticated && loaderData.user) {
		return <Home user={loaderData.user} />;
	}
	return (
		<div className="h-screen flex flex-col md:flex-row bg-slate-50 overflow-hidden font-sans">
			{/* Left Column: Scrollable SIF Content (2/3) */}
			<main className="flex-1 md:w-2/3 h-full overflow-y-auto px-6 py-6 md:px-12 md:py-12 space-y-12 bg-white">
				<div className="space-y-6">
					<h1 className="text-3xl md:text-5xl font-black text-slate-900 tracking-tight leading-tight">
						Sophisticated Instrumentation Facility - NIT Trichy
					</h1>

					<section className="space-y-4">
						<h2 className="text-xl md:text-2xl font-bold text-slate-800 flex items-center gap-2">
							<div className="w-1.5 h-6 bg-blue-600 rounded-full" />
							About SIF - NITT
						</h2>
						<p className="text-base md:text-lg text-slate-600 leading-relaxed text-balance">
							The state-of-the-art research facility at the
							institute has been pooled under the Sophisticated
							Instrumentation Facility (SIF) to support the
							research activities of faculties and students. This
							initiative ensures resources are available on a
							sharing basis for carrying out research and
							consultancy activities.
						</p>
						<p className="text-base md:text-lg text-slate-600 leading-relaxed text-balance">
							One of the primary objectives of this facility is to
							promote and strengthen collaborative activities with
							other institutes and industries. SIF aims to
							maximize the use of available facilities and make
							them accessible to smaller institutes and
							industries.
						</p>
					</section>

					<section className="space-y-4">
						<h2 className="text-xl md:text-2xl font-bold text-slate-800 flex items-center gap-2">
							<div className="w-1.5 h-6 bg-blue-600 rounded-full" />
							Objectives of SIF
						</h2>
						<ul className="grid gap-3">
							{[
								"To cater to the needs of researchers, scientists, students, startups, and MSMEs in the domain of advanced testing and characterization.",
								"To enable effective utilization of high-end sophisticated equipment by pooling resources for the larger research community.",
								"To build skilled manpower through workshops and short-term courses in advanced research techniques.",
							].map((objective, index) => (
								<li
									key={objective}
									className="flex items-start gap-4 p-4 rounded-xl bg-slate-50 border border-slate-100 shadow-sm"
								>
									<div className="shrink-0 w-7 h-7 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-xs">
										{index + 1}
									</div>
									<p className="text-slate-600 font-medium text-sm md:text-base">
										{objective}
									</p>
								</li>
							))}
						</ul>
					</section>
				</div>
			</main>

			{/* Right Column: Fixed Login UI (1/3) */}
			<aside className="w-full md:w-1/3 h-full flex items-center justify-center p-4 md:p-8 bg-slate-50 border-l border-slate-200">
				<Login />
			</aside>
		</div>
	);
}
