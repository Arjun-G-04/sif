import { createReadStream, statSync } from "node:fs";
import { join } from "node:path";
import { createFileRoute } from "@tanstack/react-router";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { fieldAdminFiles, fieldResponses, fields } from "@/db/schema";
import { requireAdmin, requireUser } from "@/lib/auth";
import { MEDIA_BASE } from "@/lib/files";

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
				const url = new URL(request.url);
				const fieldIdParam = url.searchParams.get("fieldId");
				const responseIdParam = url.searchParams.get("responseId");
				const download = url.searchParams.get("download") === "true";

				// Must provide exactly one of fieldId or responseId
				if (!fieldIdParam && !responseIdParam) {
					return new Response("fieldId or responseId is required", {
						status: 400,
					});
				}

				if (fieldIdParam && responseIdParam) {
					return new Response(
						"Provide only one of fieldId or responseId",
						{ status: 400 },
					);
				}

				let filePath: string;
				let fileName: string;

				if (fieldIdParam) {
					// Admin file: accessible by any authenticated user
					await requireUser();

					const fieldId = Number.parseInt(fieldIdParam, 10);
					if (Number.isNaN(fieldId)) {
						return new Response("fieldId must be a valid number", {
							status: 400,
						});
					}

					// Look up admin file from fieldAdminFiles table
					const [adminFile] = await db
						.select({
							filePath: fieldAdminFiles.filePath,
							originalName: fieldAdminFiles.originalName,
						})
						.from(fieldAdminFiles)
						.where(eq(fieldAdminFiles.fieldId, fieldId));

					if (!adminFile) {
						return new Response("Admin file not found", {
							status: 400,
						});
					}

					filePath = adminFile.filePath;
					fileName = adminFile.originalName;
				} else {
					// Response file: accessible only by admin
					await requireAdmin();

					// responseIdParam is guaranteed to be non-null here due to earlier checks
					const responseId = Number.parseInt(
						responseIdParam as string,
						10,
					);
					if (Number.isNaN(responseId)) {
						return new Response(
							"responseId must be a valid number",
							{
								status: 400,
							},
						);
					}

					// Look up response file from fieldResponses table
					const [response] = await db
						.select({
							value: fieldResponses.value,
							fieldType: fields.type,
						})
						.from(fieldResponses)
						.leftJoin(fields, eq(fieldResponses.fieldId, fields.id))
						.where(eq(fieldResponses.id, responseId));

					if (!response || !response.value) {
						return new Response("File not found", { status: 400 });
					}

					if (response.fieldType !== "file") {
						return new Response("Field is not a file type", {
							status: 400,
						});
					}

					filePath = response.value;
					fileName = filePath.split("/").pop() || "file";
				}

				// Prevent directory traversal
				if (filePath.includes("..")) {
					return new Response("Invalid path", { status: 400 });
				}

				// Resolve to absolute path
				const absolutePath = join(MEDIA_BASE, filePath);

				try {
					const stats = statSync(absolutePath);
					if (!stats.isFile()) {
						return new Response("Not a file", { status: 400 });
					}

					const ext = filePath.split(".").pop()?.toLowerCase() || "";
					const mimeType = getMimeType(ext);

					const stream = createReadStream(absolutePath);

					return new Response(
						new ReadableStream({
							start(controller) {
								stream.on("data", (chunk) =>
									controller.enqueue(chunk),
								);
								stream.on("end", () => controller.close());
								stream.on("error", (err) =>
									controller.error(err),
								);
							},
							cancel() {
								stream.destroy();
							},
						}),
						{
							headers: {
								"Content-Type": mimeType,
								"Content-Length": stats.size.toString(),
								"Content-Disposition": download
									? `attachment; filename="${fileName}"`
									: `inline; filename="${fileName}"`,
								"Cache-Control": "private, max-age=3600",
							},
						},
					);
				} catch (error) {
					console.error("Error reading file:", error);
					return new Response("File not found", { status: 400 });
				}
			},
		},
	},
});
