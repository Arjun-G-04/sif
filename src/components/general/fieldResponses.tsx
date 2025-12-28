import { Download, Eye, FileText, Loader2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";

interface FieldResponse {
	fieldId: number;
	fieldName: string;
	fieldType: string;
	value: string | null;
}

interface FieldResponsesDisplayProps {
	responses: FieldResponse[];
	emptyMessage?: string;
}

interface FileViewerProps {
	path: string | null;
	name: string;
}

// Helper to convert storage path (media/...) to API URL
function getFileUrl(path: string, download = false): string {
	const params = new URLSearchParams({ path });
	if (download) params.set("download", "true");
	return `/api/file?${params.toString()}`;
}

export function FieldResponsesDisplay({
	responses,
	emptyMessage = "No field responses.",
}: FieldResponsesDisplayProps) {
	if (responses.length === 0) {
		return (
			<p className="text-sm text-slate-500 italic col-span-2">
				{emptyMessage}
			</p>
		);
	}

	return (
		<div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
			{responses.map((resp) => (
				<div key={resp.fieldId} className="space-y-1">
					<p className="text-sm font-medium text-slate-500">
						{resp.fieldName}
					</p>
					{resp.fieldType === "file" ? (
						<FileViewer path={resp.value} name={resp.fieldName} />
					) : (
						<p className="text-slate-900 border border-slate-100 bg-slate-50/30 p-2 rounded text-sm">
							{resp.value || "—"}
						</p>
					)}
				</div>
			))}
		</div>
	);
}

export function FileViewer({ path, name: _name }: FileViewerProps) {
	const [previewOpen, setPreviewOpen] = useState(false);

	if (!path)
		return (
			<p className="text-slate-400 text-sm italic">No file uploaded</p>
		);

	const fileName = path.split("/").pop() || "File";
	const ext = path.split(".").pop()?.toLowerCase() || "";
	const isImage = ["jpg", "jpeg", "png", "gif", "webp"].includes(ext);
	const isPdf = ext === "pdf";

	// Get direct file URLs
	const fileUrl = getFileUrl(path);
	const downloadUrl = getFileUrl(path, true);

	const handleView = (e: React.MouseEvent) => {
		e.stopPropagation();
		setPreviewOpen(true);
	};

	return (
		<div className="space-y-2">
			<Button
				variant="outline"
				size="sm"
				onClick={handleView}
				className="h-8 gap-2"
			>
				<Eye className="h-3 w-3" />
				View File
			</Button>

			<FilePreviewDialog
				open={previewOpen}
				onOpenChange={setPreviewOpen}
				fileUrl={fileUrl}
				downloadUrl={downloadUrl}
				fileName={fileName}
				isImage={isImage}
				isPdf={isPdf}
			/>
		</div>
	);
}

function FilePreviewDialog({
	open,
	onOpenChange,
	fileUrl,
	downloadUrl,
	fileName,
	isImage,
	isPdf,
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	fileUrl: string;
	downloadUrl: string;
	fileName: string;
	isImage: boolean;
	isPdf: boolean;
}) {
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(false);

	const handleLoad = () => {
		setLoading(false);
		setError(false);
	};

	const handleError = () => {
		setLoading(false);
		setError(true);
	};

	// Reset states when dialog opens
	const handleOpenChange = (isOpen: boolean) => {
		if (isOpen) {
			setLoading(true);
			setError(false);
		}
		onOpenChange(isOpen);
	};

	return (
		<Dialog open={open} onOpenChange={handleOpenChange}>
			<DialogContent className="max-w-[calc(100%-2rem)] sm:max-w-[80vw] w-[80vw] h-[90vh] flex flex-col p-0 overflow-hidden bg-slate-950 border-slate-800 shadow-2xl [&>button]:text-slate-400 [&>button]:hover:text-white [&>button]:top-[28px] [&>button]:right-5">
				<DialogHeader className="p-5 border-b border-slate-800/50 bg-slate-900/50 flex-row items-center justify-between space-y-0 pr-16">
					<DialogTitle className="text-slate-100 text-lg font-semibold truncate">
						{fileName}
					</DialogTitle>
					<div className="flex items-center gap-2">
						<Button
							variant="ghost"
							size="sm"
							asChild
							className="text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-all"
						>
							<a href={downloadUrl} download={fileName}>
								<Download className="h-4 w-4 mr-2" />
								Download
							</a>
						</Button>
					</div>
				</DialogHeader>
				<div className="flex-1 overflow-auto bg-slate-950 flex items-center justify-center">
					{loading && !error && (
						<div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950">
							<Loader2 className="h-12 w-12 text-slate-600 animate-spin" />
							<p className="text-slate-500 font-medium mt-4">
								Loading preview...
							</p>
						</div>
					)}

					{error ? (
						<div className="text-center p-12 bg-slate-900/50 rounded-2xl border border-slate-800 border-dashed max-w-md mx-auto">
							<div className="bg-slate-800 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
								<FileText className="h-10 w-10 text-slate-400" />
							</div>
							<h3 className="text-slate-100 text-xl font-medium mb-2">
								Failed to Load
							</h3>
							<p className="text-slate-400 mb-8 max-w-xs mx-auto">
								Could not load the file preview. Try downloading
								instead.
							</p>
							<Button
								variant="secondary"
								size="lg"
								asChild
								className="w-full"
							>
								<a href={downloadUrl} download={fileName}>
									<Download className="h-5 w-5 mr-2" />
									Download to View
								</a>
							</Button>
						</div>
					) : isImage ? (
						<div className="w-full h-full p-8 flex items-center justify-center">
							<img
								src={fileUrl}
								alt={fileName}
								onLoad={handleLoad}
								onError={handleError}
								className="max-w-full max-h-full object-contain rounded shadow-lg transition-transform duration-300 hover:scale-[1.01]"
							/>
						</div>
					) : isPdf ? (
						<iframe
							src={fileUrl}
							title={fileName}
							onLoad={handleLoad}
							onError={handleError}
							className="w-full h-full border-0 bg-white shadow-inner"
						/>
					) : (
						<div className="text-center p-12 bg-slate-900/50 rounded-2xl border border-slate-800 border-dashed max-w-md mx-auto">
							<div className="bg-slate-800 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
								<FileText className="h-10 w-10 text-slate-400" />
							</div>
							<h3 className="text-slate-100 text-xl font-medium mb-2">
								Preview Unavailable
							</h3>
							<p className="text-slate-400 mb-8 max-w-xs mx-auto">
								This file type cannot be previewed directly in
								the browser.
							</p>
							<Button
								variant="secondary"
								size="lg"
								asChild
								className="w-full"
							>
								<a href={downloadUrl} download={fileName}>
									<Download className="h-5 w-5 mr-2" />
									Download to View
								</a>
							</Button>
						</div>
					)}
				</div>
			</DialogContent>
		</Dialog>
	);
}
