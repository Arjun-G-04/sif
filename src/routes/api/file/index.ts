import { createReadStream, statSync } from "node:fs";
import { join } from "node:path";
import { createFileRoute } from "@tanstack/react-router";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { fieldResponses, fields } from "@/db/schema";
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

export const Route = createFileRoute("/api/file/")({
	server: {
		handlers: {
			GET: async ({ request }) => {
				// Verify admin access
				await requireAdmin();

				// Get entityId and fieldId from query parameters
				const url = new URL(request.url);
				const entityIdParam = url.searchParams.get("entityId");
				const fieldIdParam = url.searchParams.get("fieldId");
				const download = url.searchParams.get("download") === "true";

				if (!entityIdParam || !fieldIdParam) {
					return new Response("entityId and fieldId are required", {
						status: 400,
					});
				}

				const entityId = Number.parseInt(entityIdParam, 10);
				const fieldId = Number.parseInt(fieldIdParam, 10);

				if (Number.isNaN(entityId) || Number.isNaN(fieldId)) {
					return new Response(
						"entityId and fieldId must be valid numbers",
						{
							status: 400,
						},
					);
				}

				// Fetch the file path from field_responses table
				const [response] = await db
					.select({
						value: fieldResponses.value,
						fieldType: fields.type,
					})
					.from(fieldResponses)
					.leftJoin(fields, eq(fieldResponses.fieldId, fields.id))
					.where(
						and(
							eq(fieldResponses.entityId, entityId),
							eq(fieldResponses.fieldId, fieldId),
						),
					);

				if (!response || !response.value) {
					return new Response("File not found", { status: 404 });
				}

				// Ensure it's a file field type
				if (response.fieldType !== "file") {
					return new Response("Field is not a file type", {
						status: 400,
					});
				}

				const filePath = response.value;

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
