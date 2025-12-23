import Sample from "@/components/Sample";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/")({ component: App });

function App() {
	return (
		<div className="text-lg font-bold">
			SIF
			<Sample />
		</div>
	);
}
