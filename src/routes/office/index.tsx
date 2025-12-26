import { Home } from "@/components/office/home";
import { Login } from "@/components/office/login";
import { verifyAuth } from "@/lib/auth";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/office/")({
	component: OfficePage,
	loader: async () => {
		return await verifyAuth();
	},
});

function OfficePage() {
	const loaderData = Route.useLoaderData();
	if (!loaderData.authenticated || !loaderData.user.admin) {
		return <Login />;
	}

	return <Home user={loaderData.user} />;
}
