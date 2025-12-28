import { createReadStream, statSync } from "node:fs";
import { join } from "node:path";
import { createFileRoute } from "@tanstack/react-router";
import { requireAdmin } from "@/lib/auth";

// Helper to get MIME type
function getMimeType(ext: string): string {
	const mimeTypes: Record<string, string> = {
		jpg: "image/jpeg",
		jpeg: "image/jpeg",
		png: "image/png",
		gif: "image/gif",
		webp: "image/webp",
		pdf: "application/pdf",
		txt: "text/plain",
		doc: "application/msword",
		docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
	};
	return mimeTypes[ext] || "application/octet-stream";
}

export const Route = createFileRoute("/api/file")({
	server: {
		handlers: {
			GET: async ({ request }) => {
				// Verify admin access
				await requireAdmin();

				// Get the file path from query parameter
				const url = new URL(request.url);
				const filePath = url.searchParams.get("path");
				const download = url.searchParams.get("download") === "true";

				if (!filePath) {
					return new Response("File path required", { status: 400 });
				}

				// Ensure path is within media directory to prevent directory traversal
				const absolutePath = join(process.cwd(), filePath);
				if (!absolutePath.startsWith(join(process.cwd(), "media"))) {
					return new Response("Invalid file path", { status: 403 });
				}

				try {
					// Get file stats
					const stats = statSync(absolutePath);
					if (!stats.isFile()) {
						return new Response("Not a file", { status: 400 });
					}

					// Get file extension and MIME type
					const ext = filePath.split(".").pop()?.toLowerCase() || "";
					const mimeType = getMimeType(ext);

					// Extract filename for Content-Disposition
					const fileName = filePath.split("/").pop() || "file";

					// Create read stream and convert to web-compatible ReadableStream
					const nodeStream = createReadStream(absolutePath);
					const webStream = new ReadableStream({
						start(controller) {
							nodeStream.on("data", (chunk) => {
								controller.enqueue(chunk);
							});
							nodeStream.on("end", () => {
								controller.close();
							});
							nodeStream.on("error", (err) => {
								controller.error(err);
							});
						},
						cancel() {
							nodeStream.destroy();
						},
					});

					// Return streaming response with appropriate headers
					return new Response(webStream, {
						status: 200,
						headers: {
							"Content-Type": mimeType,
							"Content-Length": stats.size.toString(),
							"Content-Disposition": download
								? `attachment; filename="${fileName}"`
								: `inline; filename="${fileName}"`,
							"Cache-Control": "private, max-age=3600",
						},
					});
				} catch (error) {
					console.error("Error serving file:", error);
					return new Response("File not found", { status: 404 });
				}
			},
		},
	},
});
