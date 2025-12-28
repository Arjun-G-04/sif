import { createServerFn } from "@tanstack/react-start";
import { join } from "node:path";
import { readFile } from "node:fs/promises";
import * as z from "zod";
import { requireAdmin } from "../lib/auth";
import { safeParseAndThrow } from "../lib/utils";

const GetFieldFileInput = z.object({
	path: z.string().min(1),
});

export const getFieldFile = createServerFn({ method: "GET" })
	.inputValidator(GetFieldFileInput)
	.handler(async ({ data }) => {
		await requireAdmin();
		const parsedData = safeParseAndThrow(data, GetFieldFileInput);

		// Ensure path is within media directory to avoid traversal
		const absolutePath = join(process.cwd(), parsedData.path);
		if (!absolutePath.startsWith(join(process.cwd(), "media"))) {
			throw new Error("Invalid file path");
		}

		try {
			const fileBuffer = await readFile(absolutePath);
			const base64 = fileBuffer.toString("base64");

			// Determine mime type based on extension
			const ext = parsedData.path.split(".").pop()?.toLowerCase();
			let mimeType = "application/octet-stream";
			if (["jpg", "jpeg"].includes(ext || "")) mimeType = "image/jpeg";
			else if (ext === "png") mimeType = "image/png";
			else if (ext === "gif") mimeType = "image/gif";
			else if (ext === "webp") mimeType = "image/webp";
			else if (ext === "pdf") mimeType = "application/pdf";

			return `data:${mimeType};base64,${base64}`;
		} catch (error) {
			console.error("Error reading file:", error);
			throw new Error("Could not read file");
		}
	});
