/**
 * Uniform API plumbing and HTTP security boundary.
 *
 * Enforces security headers, standard JSON response formatting, typed Zod error
 * extraction, and total exception containment so that internal implementation details,
 * database URLs, or third-party error traces never leak to the client.
 */

import { NextResponse } from "next/server";
import { ZodError } from "zod";

/**
 * Global API security headers applied to every JSON endpoint.
 */
export const SECURITY_HEADERS: Readonly<Record<string, string>> = {
	"X-Content-Type-Options": "nosniff",
	"X-Frame-Options": "DENY",
	"Referrer-Policy": "strict-origin-when-cross-origin",
	"Permissions-Policy": "geolocation=(self), microphone=(), camera=()",
	"Strict-Transport-Security": "max-age=31536000; includeSubDomains",
	"Content-Security-Policy": "default-src 'none'; frame-ancestors 'none'; base-uri 'none'",
};

/** Maximum JSON request size accepted by API routes. */
export const MAX_JSON_BODY_BYTES = 64 * 1024;

/**
 * Shape of a single validation failure.
 */
export interface IssueDetail {
	readonly path: string;
	readonly message: string;
}

/**
 * Raised when request body cannot be parsed as valid JSON.
 */
export class MalformedBodyError extends Error {
	constructor(message = "The request body could not be parsed as JSON.") {
		super(message);
		this.name = "MalformedBodyError";
	}
}

/** Raised when a request body exceeds the API payload limit. */
export class RequestBodyTooLargeError extends Error {
	constructor(message = "The request body exceeds the 64 KB limit.") {
		super(message);
		this.name = "RequestBodyTooLargeError";
	}
}

/**
 * Raised when an IP exceeds rate limit bounds.
 */
export class RateLimitExceededError extends Error {
	readonly retryAfterSeconds: number;

	constructor(retryAfterSeconds = 60, message = "Too many requests. Please try again later.") {
		super(message);
		this.name = "RateLimitExceededError";
		this.retryAfterSeconds = retryAfterSeconds;
	}
}

/**
 * Raised when the Gemini generative model is unavailable or unconfigured.
 */
export class GeminiUnavailableError extends Error {
	constructor(message = "Gemini is not configured: GEMINI_API_KEY is not set.") {
		super(message);
		this.name = "GeminiUnavailableError";
	}
}

/** Raised when an upstream service returns an invalid or unavailable response. */
export class UpstreamServiceError extends Error {
	constructor(message = "An upstream data service is unavailable.") {
		super(message);
		this.name = "UpstreamServiceError";
	}
}

/**
 * Build a structured JSON error response.
 *
 * @param status HTTP status code.
 * @param code Machine-readable error code.
 * @param message Client-safe human message.
 * @param extraHeaders Optional headers (such as Retry-After).
 */
export function jsonError(
	status: number,
	code: string,
	message: string,
	extraHeaders?: Readonly<Record<string, string>>,
): NextResponse {
	return NextResponse.json(
		{ error: { code, message } },
		{
			status,
			headers: {
				...SECURITY_HEADERS,
				...extraHeaders,
			},
		},
	);
}

/**
 * Send a successful JSON response with standard security headers.
 *
 * @param body Serialisable payload.
 * @param status Optional HTTP status code (defaults to 200).
 */
export function jsonOk(body: unknown, status = 200): NextResponse {
	return NextResponse.json(body, { status, headers: SECURITY_HEADERS });
}

/**
 * Read and parse incoming request body as JSON.
 *
 * @param request The incoming Request object.
 * @throws {MalformedBodyError} When JSON parsing fails or body is empty.
 */
export async function readJsonBody(request: Request): Promise<unknown> {
	const contentLength = request.headers.get("content-length");
	if (contentLength !== null) {
		const parsedLength = Number.parseInt(contentLength, 10);
		if (Number.isFinite(parsedLength) && parsedLength > MAX_JSON_BODY_BYTES) {
			throw new RequestBodyTooLargeError();
		}
	}

	const reader = request.body?.getReader();
	if (reader === undefined) {
		throw new MalformedBodyError();
	}

	const chunks: Uint8Array[] = [];
	let totalBytes = 0;
	try {
		for (;;) {
			const result = await reader.read();
			if (result.done) break;

			const chunk = result.value;
			totalBytes += chunk.byteLength;
			if (totalBytes > MAX_JSON_BODY_BYTES) {
				throw new RequestBodyTooLargeError();
			}
			chunks.push(chunk);
		}

		if (totalBytes === 0) {
			throw new MalformedBodyError();
		}

		const bytes = new Uint8Array(totalBytes);
		let offset = 0;
		for (const chunk of chunks) {
			bytes.set(chunk, offset);
			offset += chunk.byteLength;
		}

		const text = new TextDecoder().decode(bytes);
		return JSON.parse(text) as unknown;
	} catch (error) {
		if (error instanceof RequestBodyTooLargeError || error instanceof MalformedBodyError) {
			throw error;
		}
		throw new MalformedBodyError();
	} finally {
		reader.releaseLock();
	}
}

/**
 * Flatten Zod error issues into a clean, client-safe array of path and message pairs.
 */
function issueDetails(error: ZodError): readonly IssueDetail[] {
	return error.issues.map((issue) => ({
		path: issue.path.join("."),
		message: issue.message,
	}));
}

/**
 * Route handler wrapper providing comprehensive error containment and status translation.
 *
 * @param fn The asynchronous route handler execution body.
 */
export async function handle(
	fn: () => Promise<NextResponse>,
): Promise<NextResponse> {
	try {
		return await fn();
	} catch (error) {
		if (error instanceof RateLimitExceededError) {
			return jsonError(
				429,
				"RATE_LIMITED",
				error.message,
				{ "Retry-After": String(error.retryAfterSeconds) },
			);
		}

		if (error instanceof GeminiUnavailableError) {
			return jsonError(503, "AI_UNAVAILABLE", error.message);
		}

		if (error instanceof MalformedBodyError) {
			return jsonError(400, "MALFORMED_BODY", error.message);
		}

		if (error instanceof RequestBodyTooLargeError) {
			return jsonError(413, "BODY_TOO_LARGE", error.message);
		}

		if (error instanceof UpstreamServiceError) {
			return jsonError(502, "UPSTREAM_UNAVAILABLE", error.message);
		}

		if (error instanceof ZodError) {
			return NextResponse.json(
				{
					error: {
						code: "VALIDATION_ERROR",
						message: "The request body is invalid.",
						issues: issueDetails(error),
					},
				},
				{ status: 422, headers: SECURITY_HEADERS },
			);
		}

		// Generic fallback: never echo error message or stack trace
		return jsonError(500, "INTERNAL_ERROR", "An unexpected error occurred.");
	}
}
