import { createServerOnlyFn } from "@tanstack/react-start";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

export const MEDIA_BASE = join(process.cwd(), "media");

interface WriteFileOptions {
	subPath: string;
	file: File;
}

export const saveUploadedFile = createServerOnlyFn(
	async ({ subPath, file }: WriteFileOptions) => {
		const fullDir = join(MEDIA_BASE, subPath);
		await mkdir(fullDir, { recursive: true });

		const originalName = file.name;
		const sanitizedFileName = `${Date.now()}-${originalName.replace(/[^a-zA-Z0-9.-]/g, "_")}`;
		const filePath = join(fullDir, sanitizedFileName);

		const arrayBuffer = await file.arrayBuffer();
		await writeFile(filePath, Buffer.from(arrayBuffer));

		const relativePath = `${subPath}/${sanitizedFileName}`;

		return {
			relativePath,
			originalName,
		};
	},
);
