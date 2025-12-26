import { Progress } from "@/components/ui/progress";
import { useEffect, useState } from "react";

export function PendingComponent() {
	const [progress, setProgress] = useState(0);

	useEffect(() => {
		const timer = setTimeout(() => {
			setProgress(90);
		}, 100);

		return () => clearTimeout(timer);
	}, []);

	return (
		<div className="fixed top-0 left-0 right-0 z-1000">
			<Progress
				value={progress}
				className="h-2 w-full rounded-none bg-transparent *:bg-red-600 [&>*[data-slot=progress-indicator]]:duration-[7s] [&>*[data-slot=progress-indicator]]:ease-out"
			/>
		</div>
	);
}
