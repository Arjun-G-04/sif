import type {
	fieldAdminFiles,
	fieldGroups,
	fieldOptions,
	fieldRelations,
	fields,
	fieldType,
} from "../../db/schema";

export type Field =
	| (typeof fields.$inferSelect & {
			type: "single_select";
			options: (typeof fieldOptions.$inferSelect)[];
			relation?: undefined;
			groupConfig?: undefined;
			adminFileConfig?: undefined;
			children?: Field[];
	  })
	| (typeof fields.$inferSelect & {
			type: "relation";
			options?: undefined;
			relation: typeof fieldRelations.$inferSelect;
			groupConfig?: undefined;
			adminFileConfig?: undefined;
			children?: Field[];
			relatedValue?: string | null;
	  })
	| (typeof fields.$inferSelect & {
			type: "group";
			options?: undefined;
			relation?: undefined;
			groupConfig: typeof fieldGroups.$inferSelect;
			adminFileConfig?: undefined;
			children: Field[];
	  })
	| (typeof fields.$inferSelect & {
			type: "admin_file";
			options?: undefined;
			relation?: undefined;
			groupConfig?: undefined;
			adminFileConfig: typeof fieldAdminFiles.$inferSelect;
			children?: Field[];
	  })
	| (typeof fields.$inferSelect & {
			type: Exclude<
				(typeof fieldType.enumValues)[number],
				"single_select" | "relation" | "group" | "admin_file"
			>;
			options?: undefined;
			relation?: undefined;
			groupConfig?: undefined;
			adminFileConfig?: undefined;
			children?: Field[];
	  });

export type FieldEntry = {
	fieldId: number;
	iteration: number;
	value: string | null;
};
