import { Link } from "@tanstack/react-router";
import { Button } from "../ui/button";
import { ArrowRightIcon } from "../svgs";

interface ActionProps {
	to: string;
	label: string;
}

export function Action({ to, label }: ActionProps) {
	return (
		<Button
			asChild
			variant="ghost"
			className="w-full h-auto py-4 px-4 justify-between hover:bg-blue-50/50 hover:text-blue-700 group border border-slate-100 rounded-xl transition-all"
		>
			<Link to={to}>
				<span className="font-medium text-slate-700 group-hover:text-blue-700">
					{label}
				</span>
				<ArrowRightIcon className="w-4 h-4 text-slate-400 group-hover:translate-x-1 group-hover:text-blue-600 transition-all" />
			</Link>
		</Button>
	);
}
