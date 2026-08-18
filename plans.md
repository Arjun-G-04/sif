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
