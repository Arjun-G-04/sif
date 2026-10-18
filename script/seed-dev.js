import bcrypt from "bcrypt";
import pg from "pg";

const { Pool } = pg;

const pool = new Pool({
	connectionString:
		process.env.DATABASE_URL ||
		"postgresql://db_user:sif_db_password@localhost:5432/sif",
});

async function seed() {
	const defaultPasswordHash = await bcrypt.hash("password123", 10);
	const operatorPasswordHash = await bcrypt.hash("operator123", 10);
	const adminPasswordHash = await bcrypt.hash("admin", 10);

	// 0. Ensure Admin User
	await pool.query(
		`INSERT INTO users (username, password, role, active)
     VALUES ('admin', $1, 'admin', true)
     ON CONFLICT (username) DO UPDATE SET password = $1, role = 'admin', active = true`,
		[adminPasswordHash],
	);

	// 1. Dynamic Registration Fields
	const fieldDefs = [
		{ name: "Full Name", type: "text", order: 1, required: true },
		{ name: "Category", type: "single_select", order: 2, required: true },
		{
			name: "Department / Organization",
			type: "text",
			order: 3,
			required: false,
		},
		{ name: "Alternate Email", type: "text", order: 4, required: false },
		{ name: "Alternate Mobile", type: "text", order: 5, required: false },
	];

	const fieldIds = {};
	for (const f of fieldDefs) {
		const existing = await pool.query(
			"SELECT id FROM fields WHERE entity_type = 'registration' AND name = $1",
			[f.name],
		);
		if (existing.rows.length > 0) {
			fieldIds[f.name] = existing.rows[0].id;
		} else {
			const ins = await pool.query(
				`INSERT INTO fields (entity_type, name, type, "order", stage, active, required)
         VALUES ('registration', $1, $2, $3, 'initial', true, $4)
         RETURNING id`,
				[f.name, f.type, f.order, f.required],
			);
			fieldIds[f.name] = ins.rows[0].id;
		}
	}

	// Category options
	const categoryOptions = [
		"Internal Student",
		"Internal Faculty",
		"External Academic",
		"Industry",
	];
	for (const opt of categoryOptions) {
		const optCheck = await pool.query(
			"SELECT id FROM field_options WHERE field_id = $1 AND value = $2",
			[fieldIds["Category"], opt],
		);
		if (optCheck.rows.length === 0) {
			await pool.query(
				"INSERT INTO field_options (field_id, value) VALUES ($1, $2)",
				[fieldIds["Category"], opt],
			);
		}
	}

	// 2. System Configuration
	const configCheck = await pool.query(
		"SELECT id FROM configurations LIMIT 1",
	);
	if (configCheck.rows.length === 0) {
		await pool.query(
			`INSERT INTO configurations ("officeEmail", registration_name_field_id, registration_category_field_id)
       VALUES ('sif@nitt.edu', $1, $2)`,
			[fieldIds["Full Name"], fieldIds["Category"]],
		);
	} else {
		await pool.query(
			`UPDATE configurations SET
       "officeEmail" = 'sif@nitt.edu',
       registration_name_field_id = $1,
       registration_category_field_id = $2
       WHERE id = $3`,
			[
				fieldIds["Full Name"],
				fieldIds["Category"],
				configCheck.rows[0].id,
			],
		);
	}

	// 3. Equipments
	const equipmentDefs = [
		{
			name: "Field Emission Scanning Electron Microscope (FE-SEM)",
			code: "FESEM-01",
			departmentLab: "Central Characterization Lab",
			usageRate: "1200/hr",
		},
		{
			name: "X-Ray Diffractometer (XRD)",
			code: "XRD-01",
			departmentLab: "Materials Science Lab",
			usageRate: "500/sample",
		},
		{
			name: "High-Resolution Transmission Electron Microscope (HR-TEM)",
			code: "HRTEM-01",
			departmentLab: "Nanotechnology Center",
			usageRate: "2500/hr",
		},
		{
			name: "Nuclear Magnetic Resonance Spectrometer (500 MHz NMR)",
			code: "NMR-500",
			departmentLab: "Chemistry Research Lab",
			usageRate: "800/sample",
		},
		{
			name: "Atomic Force Microscope (AFM)",
			code: "AFM-01",
			departmentLab: "Nanotechnology Center",
			usageRate: "1000/hr",
		},
		{
			name: "Confocal Laser Scanning Microscope (CLSM)",
			code: "CLSM-01",
			departmentLab: "Bio-Imaging Center",
			usageRate: "1500/hr",
		},
		{
			name: "Thermogravimetric Analyzer (TGA/DSC)",
			code: "TGA-01",
			departmentLab: "Thermal Analysis Lab",
			usageRate: "600/sample",
		},
		{
			name: "UV-Vis-NIR Spectrophotometer",
			code: "UV-VIS-01",
			departmentLab: "Optics & Spectroscopy Lab",
			usageRate: "400/sample",
		},
		{
			name: "Inductively Coupled Plasma Mass Spectrometer (ICP-MS)",
			code: "ICPMS-01",
			departmentLab: "Analytical Chemistry Lab",
			usageRate: "1800/sample",
		},
	];

	const eqIds = {};
	for (const eq of equipmentDefs) {
		const existing = await pool.query(
			"SELECT id FROM equipments WHERE code = $1",
			[eq.code],
		);
		if (existing.rows.length > 0) {
			eqIds[eq.code] = existing.rows[0].id;
			await pool.query(
				`UPDATE equipments SET
           name = $1,
           department_lab = $2,
           usage_rate = $3,
           active = true
         WHERE id = $4`,
				[eq.name, eq.departmentLab, eq.usageRate, existing.rows[0].id],
			);
		} else {
			const ins = await pool.query(
				`INSERT INTO equipments (name, code, department_lab, usage_rate, active)
         VALUES ($1, $2, $3, $4, true)
         RETURNING id`,
				[eq.name, eq.code, eq.departmentLab, eq.usageRate],
			);
			eqIds[eq.code] = ins.rows[0].id;
		}
	}

	// 4. Operators
	const operatorDefs = [
		{
			username: "operator_fesem",
			passwordHash: operatorPasswordHash,
			eqCodes: ["FESEM-01", "XRD-01", "AFM-01"],
		},
		{
			username: "operator_tem",
			passwordHash: operatorPasswordHash,
			eqCodes: ["HRTEM-01", "CLSM-01"],
		},
		{
			username: "operator_nmr",
			passwordHash: operatorPasswordHash,
			eqCodes: ["NMR-500", "TGA-01", "UV-VIS-01", "ICPMS-01"],
		},
	];

	for (const op of operatorDefs) {
		let opId;
		const existing = await pool.query(
			"SELECT id FROM users WHERE username = $1",
			[op.username],
		);
		if (existing.rows.length > 0) {
			opId = existing.rows[0].id;
			await pool.query(
				"UPDATE users SET password = $1, role = 'operator', active = true WHERE id = $2",
				[op.passwordHash, opId],
			);
		} else {
			const ins = await pool.query(
				`INSERT INTO users (username, password, role, active)
         VALUES ($1, $2, 'operator', true)
         RETURNING id`,
				[op.username, op.passwordHash],
			);
			opId = ins.rows[0].id;
		}

		// Assign to equipments
		for (const code of op.eqCodes) {
			const eqId = eqIds[code];
			if (eqId) {
				await pool.query(
					`INSERT INTO operator_equipments (operator_id, equipment_id)
           VALUES ($1, $2)
           ON CONFLICT DO NOTHING`,
					[opId, eqId],
				);
			}
		}
	}

	// 5. Registrations
	const registrationDefs = [
		{
			email: "ananya.sharma@nitt.edu",
			phone: "9876500001",
			accepted: null,
			rejectionReason: null,
			responses: {
				"Full Name": "Ananya Sharma",
				Category: "Internal Student",
				"Department / Organization": "Chemical Engineering, NIT Trichy",
				"Alternate Email": "ananya.personal@gmail.com",
				"Alternate Mobile": "9876500011",
			},
		},
		{
			email: "dr.vikram.patel@iitm.ac.in",
			phone: "9876500002",
			accepted: null,
			rejectionReason: null,
			responses: {
				"Full Name": "Dr. Vikram Patel",
				Category: "External Academic",
				"Department / Organization":
					"Department of Physics, IIT Madras",
				"Alternate Email": "vikram.patel.res@gmail.com",
				"Alternate Mobile": "9876500022",
			},
		},
		{
			email: "contact@biotech-innovations.com",
			phone: "9876500003",
			accepted: null,
			rejectionReason: null,
			responses: {
				"Full Name": "Kavitha R.",
				Category: "Industry",
				"Department / Organization": "Biotech Innovations Ltd",
				"Alternate Email": "kavitha.biotech@gmail.com",
				"Alternate Mobile": "9876500033",
			},
		},
		{
			email: "suresh.kumar@nitt.edu",
			phone: "9876500004",
			accepted: null,
			rejectionReason: null,
			responses: {
				"Full Name": "Suresh Kumar",
				Category: "Internal Student",
				"Department / Organization":
					"Metallurgical & Materials Engineering",
			},
		},
		{
			email: "priya.nair@nitt.edu",
			phone: "9876500005",
			accepted: true,
			rejectionReason: null,
			createUser: true,
			responses: {
				"Full Name": "Priya Nair",
				Category: "Internal Student",
				"Department / Organization": "Department of Chemistry",
			},
		},
		{
			email: "fake.applicant@test.com",
			phone: "9876500006",
			accepted: false,
			rejectionReason:
				"Institutional identity verification failed: ID card proof expired.",
			responses: {
				"Full Name": "Test Applicant",
				Category: "External Academic",
			},
		},
	];

	for (const reg of registrationDefs) {
		let regId;
		const existing = await pool.query(
			"SELECT id FROM registrations WHERE email = $1",
			[reg.email],
		);
		if (existing.rows.length > 0) {
			regId = existing.rows[0].id;
			await pool.query(
				"UPDATE registrations SET accepted = $1, rejection_reason = $2 WHERE id = $3",
				[reg.accepted, reg.rejectionReason, regId],
			);
		} else {
			const ins = await pool.query(
				`INSERT INTO registrations (password, email, phone, accepted, rejection_reason)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id`,
				[
					defaultPasswordHash,
					reg.email,
					reg.phone,
					reg.accepted,
					reg.rejectionReason,
				],
			);
			regId = ins.rows[0].id;
		}

		// Field responses
		for (const [fname, fval] of Object.entries(reg.responses)) {
			const fid = fieldIds[fname];
			if (fid && fval) {
				const respCheck = await pool.query(
					"SELECT id FROM field_responses WHERE entity_type = 'registration' AND entity_id = $1 AND field_id = $2",
					[regId, fid],
				);
				if (respCheck.rows.length === 0) {
					await pool.query(
						`INSERT INTO field_responses (entity_type, entity_id, field_id, value, iteration)
             VALUES ('registration', $1, $2, $3, 0)`,
						[regId, fid, fval],
					);
				} else {
					await pool.query(
						"UPDATE field_responses SET value = $1 WHERE id = $2",
						[fval, respCheck.rows[0].id],
					);
				}
			}
		}

		// User account if accepted
		if (reg.createUser) {
			const userCheck = await pool.query(
				"SELECT id FROM users WHERE username = $1",
				[reg.email],
			);
			if (userCheck.rows.length === 0) {
				await pool.query(
					`INSERT INTO users (username, password, role, active, registration_id)
           VALUES ($1, $2, 'public', true, $3)`,
					[reg.email, defaultPasswordHash, regId],
				);
			}
		}
	}

	// 6. Ensure Sample Completed Bookings for Analytics
	const bookingsCountRes = await pool.query("SELECT count(*) FROM bookings");
	const bookingsCount = parseInt(bookingsCountRes.rows[0].count, 10);
	if (bookingsCount === 0) {
		console.log("🌱 Seeding sample completed bookings for analytics...");
		const publicUsers = await pool.query(
			"SELECT id FROM users WHERE role = 'public'",
		);
		const userList = publicUsers.rows.map((r) => r.id);
		const eqList = Object.values(eqIds);

		if (userList.length > 0 && eqList.length > 0) {
			const months = [
				"2026-05-15",
				"2026-06-15",
				"2026-07-15",
				"2026-08-15",
				"2026-09-15",
				"2026-10-15",
			];
			const samplePrices = [800, 1200, 1500, 2400, 3000, 4500, 5000];

			for (const eqId of eqList) {
				for (const m of months) {
					const numBookings = 2 + Math.floor(Math.random() * 3);
					for (let i = 0; i < numBookings; i++) {
						const uId =
							userList[
								Math.floor(Math.random() * userList.length)
							];
						const price =
							samplePrices[
								Math.floor(Math.random() * samplePrices.length)
							];
						const day = 1 + Math.floor(Math.random() * 25);
						const dateStr = `${m.slice(0, 7)}-${day.toString().padStart(2, "0")} 10:00:00`;
						await pool.query(
							`INSERT INTO bookings (user_id, equipment_id, status, price, created_at, updated_at)
               VALUES ($1, $2, 'completed', $3, $4, $4)`,
							[uId, eqId, price, dateStr],
						);
					}
				}
			}
		}
	}

	console.log("✅ Seed completed successfully!");
	await pool.end();
}

seed().catch((err) => {
	console.error("❌ Seed failed:", err);
	pool.end();
	process.exit(1);
});
