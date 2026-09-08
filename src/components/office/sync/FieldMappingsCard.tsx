import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type React from "react";
import {
	BOOKING_API_FIELDS,
	EQUIPMENT_API_FIELDS,
	USER_API_FIELDS,
} from "./constants";

interface LocalField {
	id: number;
	name: string;
	entityType: string;
	entityId: number | null;
	stage: string;
}

interface EquipmentItem {
	id: number;
	name: string;
	code: string;
}

interface FieldMappingsCardProps {
	userFields: Array<{ id: number; name: string }>;
	equipmentFields?: LocalField[];
	equipments?: EquipmentItem[];
	userMapping: Record<string, string>;
	setUserMapping: React.Dispatch<
		React.SetStateAction<Record<string, string>>
	>;
	equipmentMapping: Record<string, string>;
	setEquipmentMapping: React.Dispatch<
		React.SetStateAction<Record<string, string>>
	>;
	bookingMappings: Record<string, Record<string, string>>;
	setBookingMappings: React.Dispatch<
		React.SetStateAction<Record<string, Record<string, string>>>
	>;
	staticDefaults: Record<string, string>;
	setStaticDefaults: React.Dispatch<
		React.SetStateAction<Record<string, string>>
	>;
	selectedEquipmentId: string;
	setSelectedEquipmentId: (id: string) => void;
	isConfigChanged: boolean;
	isPending: boolean;
	onSave: () => void;
}

export function FieldMappingsCard({
	userFields,
	equipmentFields = [],
	equipments = [],
	userMapping,
	setUserMapping,
	equipmentMapping,
	setEquipmentMapping,
	bookingMappings,
	setBookingMappings,
	staticDefaults,
	setStaticDefaults,
	selectedEquipmentId,
	setSelectedEquipmentId,
	isConfigChanged,
	isPending,
	onSave,
}: FieldMappingsCardProps) {
	return (
		<Card className="border-slate-200">
			<CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 space-y-0 pb-4">
				<div className="space-y-1">
					<CardTitle>Field Mappings and Defaults</CardTitle>
					<CardDescription>
						Map I-STEM API fields to SIF dynamic fields or define
						static default values directly inline.
					</CardDescription>
				</div>
				<Button
					onClick={onSave}
					disabled={isPending || !isConfigChanged}
				>
					{isPending && <Spinner />}
					{isPending ? "Saving..." : "Save Mappings & Defaults"}
				</Button>
			</CardHeader>
			<CardContent>
				<Tabs defaultValue="users" className="w-full">
					<TabsList className="grid w-full grid-cols-3 bg-slate-100/80 p-1 rounded-lg">
						<TabsTrigger value="users">Users</TabsTrigger>
						<TabsTrigger value="equipments">Equipments</TabsTrigger>
						<TabsTrigger value="bookings">Bookings</TabsTrigger>
					</TabsList>

					{/* Users Mapping Tab */}
					<TabsContent value="users" className="space-y-4 pt-4">
						<div className="grid gap-4 md:grid-cols-2">
							{USER_API_FIELDS.map((f) => (
								<div
									key={f.key}
									className="space-y-1.5 p-3 bg-white rounded-lg border border-slate-200/60 shadow-xs"
								>
									<Label className="text-sm font-semibold text-slate-800">
										{f.label}
									</Label>
									<div className="flex flex-col sm:flex-row gap-2">
										<Select
											value={
												userMapping[f.key] || "default"
											}
											onValueChange={(val) =>
												setUserMapping((prev) => ({
													...prev,
													[f.key]: val,
												}))
											}
										>
											<SelectTrigger className="w-full sm:w-1/2 bg-white">
												<SelectValue placeholder="Select mapped field" />
											</SelectTrigger>
											<SelectContent>
												<SelectItem value="default">
													Unmapped
												</SelectItem>
												<SelectItem value="static">
													Use Static Default
												</SelectItem>
												{userFields.map((field) => (
													<SelectItem
														key={field.id}
														value={String(field.id)}
													>
														{field.name} (ID:{" "}
														{field.id})
													</SelectItem>
												))}
											</SelectContent>
										</Select>
										{userMapping[f.key] === "static" && (
											<Input
												type="text"
												placeholder="Enter static value"
												value={
													staticDefaults[
														`user_${f.key}`
													] || ""
												}
												onChange={(e) =>
													setStaticDefaults(
														(prev) => ({
															...prev,
															[`user_${f.key}`]:
																e.target.value,
														}),
													)
												}
												className="w-full sm:w-1/2"
											/>
										)}
									</div>
								</div>
							))}
						</div>
					</TabsContent>

					{/* Equipments Mapping Tab */}
					<TabsContent value="equipments" className="space-y-4 pt-4">
						<div className="grid gap-4 md:grid-cols-2">
							{EQUIPMENT_API_FIELDS.map((f) => (
								<div
									key={f.key}
									className="space-y-1.5 p-3 bg-white rounded-lg border border-slate-200/60 shadow-xs"
								>
									<Label className="text-sm font-semibold text-slate-800">
										{f.label}
									</Label>
									<div className="flex flex-col sm:flex-row gap-2">
										<Select
											value={
												equipmentMapping[f.key] ||
												"default"
											}
											onValueChange={(val) =>
												setEquipmentMapping((prev) => ({
													...prev,
													[f.key]: val,
												}))
											}
										>
											<SelectTrigger className="w-full sm:w-1/2 bg-white">
												<SelectValue placeholder="Select mapped field" />
											</SelectTrigger>
											<SelectContent>
												<SelectItem value="default">
													Unmapped
												</SelectItem>
												<SelectItem value="static">
													Use Static Default
												</SelectItem>
												<SelectItem value="name">
													Name
												</SelectItem>
												<SelectItem value="code">
													Code
												</SelectItem>
												<SelectItem value="make">
													Make
												</SelectItem>
												<SelectItem value="model">
													Model
												</SelectItem>
												<SelectItem value="departmentLab">
													Department / Lab
												</SelectItem>
												<SelectItem value="usageRate">
													Usage Rate
												</SelectItem>
												<SelectItem value="serialNumber">
													Serial Number
												</SelectItem>
												<SelectItem value="location">
													Location
												</SelectItem>
												<SelectItem value="websiteUrl">
													Website URL
												</SelectItem>
												<SelectItem value="description">
													Description
												</SelectItem>
												<SelectItem value="active">
													Active
												</SelectItem>
											</SelectContent>
										</Select>
										{equipmentMapping[f.key] ===
											"static" && (
											<Input
												type="text"
												placeholder="Enter static value"
												value={
													staticDefaults[
														`equipment_${f.key}`
													] || ""
												}
												onChange={(e) =>
													setStaticDefaults(
														(prev) => ({
															...prev,
															[`equipment_${f.key}`]:
																e.target.value,
														}),
													)
												}
												className="w-full sm:w-1/2"
											/>
										)}
									</div>
								</div>
							))}
						</div>
					</TabsContent>

					{/* Bookings Mapping Tab */}
					<TabsContent value="bookings" className="space-y-4 pt-4">
						<div className="flex flex-col sm:flex-row sm:items-center gap-3 p-4 bg-slate-50 border border-slate-200 rounded-lg">
							<Label className="text-sm font-semibold text-slate-700 shrink-0">
								Configure Bookings Mapping For:
							</Label>
							<Select
								value={selectedEquipmentId}
								onValueChange={setSelectedEquipmentId}
							>
								<SelectTrigger className="w-full sm:w-80 bg-white">
									<SelectValue placeholder="Select an equipment" />
								</SelectTrigger>
								<SelectContent>
									{equipments.map((eq) => (
										<SelectItem
											key={eq.id}
											value={String(eq.id)}
										>
											{eq.name} (Code: {eq.code})
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>

						{selectedEquipmentId && (
							<div className="grid gap-4 md:grid-cols-2">
								{BOOKING_API_FIELDS.map((f) => {
									const currentBookingMapping =
										bookingMappings[selectedEquipmentId] ||
										{};
									const selectedValue =
										currentBookingMapping[f.key] ||
										"default";

									const filteredFields =
										equipmentFields.filter(
											(field) =>
												field.entityType ===
													"equipment" &&
												(field.entityId === null ||
													String(field.entityId) ===
														selectedEquipmentId),
										);

									return (
										<div
											key={f.key}
											className="space-y-1.5 p-3 bg-white rounded-lg border border-slate-200/60 shadow-xs"
										>
											<Label className="text-sm font-semibold text-slate-800">
												{f.label}
											</Label>
											<div className="flex flex-col sm:flex-row gap-2">
												<Select
													value={selectedValue}
													onValueChange={(val) => {
														setBookingMappings(
															(prev) => {
																const eqMap =
																	prev[
																		selectedEquipmentId
																	] || {};
																return {
																	...prev,
																	[selectedEquipmentId]:
																		{
																			...eqMap,
																			[f.key]:
																				val,
																		},
																};
															},
														);
													}}
												>
													<SelectTrigger className="w-full sm:w-1/2 bg-white">
														<SelectValue placeholder="Select mapped field" />
													</SelectTrigger>
													<SelectContent>
														<SelectItem value="default">
															Unmapped
														</SelectItem>
														<SelectItem value="static">
															Use Static Default
														</SelectItem>
														{filteredFields.map(
															(field) => (
																<SelectItem
																	key={
																		field.id
																	}
																	value={String(
																		field.id,
																	)}
																>
																	{field.name}{" "}
																	(ID:{" "}
																	{field.id})
																</SelectItem>
															),
														)}
													</SelectContent>
												</Select>
												{selectedValue === "static" && (
													<Input
														type="text"
														placeholder="Enter static value"
														value={
															staticDefaults[
																`booking_${selectedEquipmentId}_${f.key}`
															] || ""
														}
														onChange={(e) =>
															setStaticDefaults(
																(prev) => ({
																	...prev,
																	[`booking_${selectedEquipmentId}_${f.key}`]:
																		e.target
																			.value,
																}),
															)
														}
														className="w-full sm:w-1/2"
													/>
												)}
											</div>
										</div>
									);
								})}
							</div>
						)}
					</TabsContent>
				</Tabs>
			</CardContent>
		</Card>
	);
}
