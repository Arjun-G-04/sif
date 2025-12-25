import { Home } from "@/components/Office/Home";
import { Login } from "@/components/Office/Login";
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
	if (!loaderData.authenticated) {
		return <Login />;
	}

	return <Home user={loaderData.user} />;
}
