# Future Architecture Plans

## 1. Unified Server Function Middleware & Error Sanitization

### Problem
- Uncaught server/DB exceptions (e.g., Drizzle/Postgres syntax or constraint errors) leak raw query strings, schemas, and parameters to client toasts.
- Auth validation (`requireUser()`, `requireAdmin()`, `requireOperator()`) is repeated manually inside server function handlers.

### Proposed Architecture

#### 1. Custom Error Types & Global Error Middleware
Define standard application errors vs. internal system errors:
```ts
export class AppError extends Error {
	constructor(
		message: string,
		public statusCode = 400,
	) {
		super(message);
		this.name = "AppError";
	}
}

export const errorMiddleware = createMiddleware().server(async ({ next }) => {
	try {
		return await next();
	} catch (err) {
		if (err instanceof AppError) {
			throw err;
		}
		console.error("[Internal Server Error]:", err);
		throw new Error("An unexpected error occurred. Please try again.");
	}
});
```

#### 2. Composable Base Server Function Builders
Replace raw `createServerFn` instances with centralized builders:
- **`publicFn`**: Error sanitization middleware.
- **`userFn`**: Error sanitization + user auth middleware (injects `context.user`).
- **`adminFn`**: Error sanitization + admin auth middleware (injects `context.admin`).
- **`operatorFn`**: Error sanitization + operator auth middleware (injects `context.operator`).

```ts
export const publicFn = createServerFn().middleware([errorMiddleware]);
export const authedFn = createServerFn().middleware([errorMiddleware, authMiddleware]);
export const adminFn = createServerFn().middleware([errorMiddleware, adminAuthMiddleware]);
```

### Benefits
1. **Security & Data Privacy**: Database queries, table structures, and internal errors never leave the server.
2. **Clean Auth Pattern**: Eliminates manual `requireUser()` / `requireAdmin()` boilerplate inside service handlers.
3. **Consistent Client Errors**: Guarantees predictable, safe error messages across all TanStack Start endpoints and UI toasts.

## 2. Authentication & Credential Security Hardening

### Analysis: Password Transmission & Plaintext Over Wire
- **Is plaintext password submission over HTTPS vulnerable?**
  - **No (Industry Standard):** In modern web architecture, credentials sent in an HTTP POST body over TLS/HTTPS are encrypted in transit between browser and server. Intermediaries/MITM cannot inspect or tamper with plaintext payload.
  - **Client-Side Hashing Fallacy:** Hashing password client-side before transmission does not increase security; hash becomes the effective password (equivalent to plaintext authentication), susceptible to replay and pass-the-hash attacks, while breaking server-side salted slow-hashing algorithms (`bcrypt`/`argon2`).
  - **Real Risks Identified:**
    1. **User Enumeration Timing Attack:** If user not found, handler throws immediately without hashing. If user found, `bcrypt.compare` executes (~60-100ms). Discrepancy leaks whether username/email exists.
    2. **Brute Force & Credential Stuffing:** No rate limiting or account lockout on `publicSignIn` / `officeSignIn`.
    3. **Unbounded Input / ReDoS / BCrypt DoS:** Sign-in schemas (`OfficeSignInInput`, `PublicSignInInput`) lack `max()` length restrictions. BCrypt hashes max 72 bytes; large strings waste server CPU.
    4. **TLS Enforcement & HSTS:** Missing strict HSTS headers and redirect guarantees if deployed behind reverse proxy.

### Proposed Architecture & Fixes

#### 1. Constant-Time Sign-In (Eliminate User Enumeration)
Execute dummy hash comparison when user is not found to normalize response time:
```ts
const DUMMY_HASH = "$2b$10$abcdefghijklmnopqrstuuABCDEFGHIJKLMNOPQRSTUVWXYZ012345";

export const publicSignIn = createServerFn({ method: "POST" })
	.inputValidator(PublicSignInInput)
	.handler(async ({ data }) => {
		const parsedData = safeParseAndThrow(data, PublicSignInInput);
		const [user] = await db
			.select({
				username: users.username,
				password: users.password,
				role: users.role,
			})
			.from(users)
			.where(and(eq(users.username, parsedData.username), eq(users.role, "public"), eq(users.active, true)))
			.limit(1);

		const passwordToCompare = user ? user.password : DUMMY_HASH;
		const isPasswordValid = await compare(parsedData.password, passwordToCompare);

		if (!user || !isPasswordValid) {
			throw new AppError("Invalid username or password", 401);
		}

		// Issue JWT & Set-Cookie...
	});
```

#### 2. Input Validation Hardening
Enforce strict upper bounds on auth inputs in `src/lib/auth.ts`:
```ts
const SignInInput = z.object({
	username: z.string().trim().min(1, "Username is required").max(100, "Username too long"),
	password: z.string().min(1, "Password is required").max(72, "Password cannot exceed 72 characters"),
});
```

#### 3. Login Rate Limiting & Bot Protection
- Implement IP + account-level rate limiting middleware on sign-in server functions (e.g., in-memory token bucket / Redis).
- Integrate Cloudflare Turnstile token verification for public sign-in.

#### 4. Transport Security Verification
- Ensure reverse proxy / edge enforces `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload`.
- Ensure all HTTP requests automatically redirect to HTTPS.

### Benefits
1. **Mitigates Account Enumeration:** Constant-time verification masks account existence.
2. **Defends Against Brute Force:** Rate limits and Turnstile prevent automated credential stuffing.
3. **DoS Prevention:** Capped input sizes protect hashing thread pool.

