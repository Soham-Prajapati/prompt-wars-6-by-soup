/**
 * Unit tests for API Security Plumbing, Error Envelopes, and Information Containment.
 */

import { describe, expect, it } from "vitest";
import { z } from "zod";
import {
	GeminiUnavailableError,
	handle,
	jsonError,
	jsonOk,
	MalformedBodyError,
	MAX_JSON_BODY_BYTES,
	RateLimitExceededError,
	readJsonBody,
	RequestBodyTooLargeError,
	SECURITY_HEADERS,
} from "@/lib/api";
import { bodyOf, expectSecurityHeaders, requestWithJson } from "./helpers";

const errorEnvelope = z.object({
	error: z.object({
		code: z.string(),
		message: z.string(),
		issues: z
			.array(z.object({ path: z.string(), message: z.string() }))
			.optional(),
	}),
});

async function parseErrorBody(response: Response): Promise<z.infer<typeof errorEnvelope>> {
	return errorEnvelope.parse(await bodyOf(response));
}

describe("SECURITY_HEADERS", () => {
	it("enforces the strict security headers", () => {
		expect(SECURITY_HEADERS).toEqual({
			"X-Content-Type-Options": "nosniff",
			"X-Frame-Options": "DENY",
			"Referrer-Policy": "strict-origin-when-cross-origin",
			"Permissions-Policy": "geolocation=(self), microphone=(), camera=()",
			"Strict-Transport-Security": "max-age=31536000; includeSubDomains",
		"Content-Security-Policy": "default-src 'none'; frame-ancestors 'none'; base-uri 'none'",
		});
	});
});

describe("jsonOk & jsonError", () => {
	it("returns payload with 200 and security headers", async () => {
		const res = jsonOk({ status: "healthy", aqi: 45 });
		expect(res.status).toBe(200);
		expect(await bodyOf(res)).toEqual({ status: "healthy", aqi: 45 });
		expectSecurityHeaders(res);
	});

	it("returns structured error with status code and security headers", async () => {
		const res = jsonError(404, "NOT_FOUND", "Resource does not exist");
		expect(res.status).toBe(404);
		expect(await bodyOf(res)).toEqual({
			error: { code: "NOT_FOUND", message: "Resource does not exist" },
		});
		expectSecurityHeaders(res);
	});
});

describe("readJsonBody", () => {
	it("parses valid JSON payloads", async () => {
		const req = requestWithJson("http://localhost", JSON.stringify({ city: "Delhi" }));
		const body = await readJsonBody(req);
		expect(body).toEqual({ city: "Delhi" });
	});

	it("throws MalformedBodyError for truncated or malformed JSON", async () => {
		const req = requestWithJson("http://localhost", '{"city":');
		await expect(readJsonBody(req)).rejects.toBeInstanceOf(MalformedBodyError);
	});

	it("throws MalformedBodyError for empty body", async () => {
		const req = requestWithJson("http://localhost", "");
		await expect(readJsonBody(req)).rejects.toBeInstanceOf(MalformedBodyError);
	});

	it("rejects bodies over the bounded payload limit", async () => {
		const req = new Request("http://localhost", {
			method: "POST",
			headers: { "content-length": String(MAX_JSON_BODY_BYTES + 1) },
			body: "{}",
		});
		await expect(readJsonBody(req)).rejects.toBeInstanceOf(RequestBodyTooLargeError);
	});
});

describe("handle() Error Translation & Containment", () => {
	it("passes successful responses through without modification", async () => {
		const res = await handle(() => Promise.resolve(jsonOk({ success: true })));
		expect(res.status).toBe(200);
		expect(await bodyOf(res)).toEqual({ success: true });
	});

	it("maps RateLimitExceededError to 429 RATE_LIMITED with Retry-After header", async () => {
		const res = await handle(() => {
			throw new RateLimitExceededError(45, "Rate limit exceeded.");
		});
		expect(res.status).toBe(429);
		const body = await parseErrorBody(res);
		expect(body.error.code).toBe("RATE_LIMITED");
		expect(res.headers.get("Retry-After")).toBe("45");
		expectSecurityHeaders(res);
	});

	it("maps GeminiUnavailableError to 503 AI_UNAVAILABLE", async () => {
		const res = await handle(() => {
			throw new GeminiUnavailableError();
		});
		expect(res.status).toBe(503);
		const body = await parseErrorBody(res);
		expect(body.error.code).toBe("AI_UNAVAILABLE");
		expect(body.error.message).toContain("GEMINI_API_KEY");
	});

	it("maps MalformedBodyError to 400 MALFORMED_BODY", async () => {
		const res = await handle(() => {
			throw new MalformedBodyError();
		});
		expect(res.status).toBe(400);
		const body = await parseErrorBody(res);
		expect(body.error.code).toBe("MALFORMED_BODY");
	});

	it("maps oversized bodies to 413 BODY_TOO_LARGE", async () => {
		const res = await handle(() => {
			throw new RequestBodyTooLargeError();
		});
		expect(res.status).toBe(413);
		expect((await parseErrorBody(res)).error.code).toBe("BODY_TOO_LARGE");
	});

	it("maps ZodError to 422 VALIDATION_ERROR with path issues", async () => {
		const testSchema = z.object({ city: z.string().min(3), lat: z.number() });
		const res = await handle(() => {
			testSchema.parse({ city: "a" });
			return Promise.resolve(jsonOk({}));
		});

		expect(res.status).toBe(422);
		const body = await parseErrorBody(res);
		expect(body.error.code).toBe("VALIDATION_ERROR");
		expect(body.error.issues).toBeDefined();
		expect(body.error.issues?.map((i) => i.path)).toEqual(["city", "lat"]);
	});

	it("maps unexpected errors to 500 INTERNAL_ERROR without leaking secrets or stack traces", async () => {
		const sensitiveSecret = "mongodb://admin:superSecretPassword@cluster.internal";
		const thrown = new Error(`Connection timeout: ${sensitiveSecret}`);

		const res = await handle(() => {
			throw thrown;
		});

		expect(res.status).toBe(500);
		const rawText = JSON.stringify(await bodyOf(res));
		expect(rawText).not.toContain(sensitiveSecret);
		expect(rawText).not.toContain("superSecretPassword");
		expect(rawText).not.toContain("Connection timeout");
		expect(rawText).toContain("An unexpected error occurred.");
		expectSecurityHeaders(res);
	});

	it("handles thrown primitive strings or non-Error objects safely as 500", async () => {
		const res = await handle(() => {
			// eslint-disable-next-line @typescript-eslint/only-throw-error
			throw "raw primitive exception";
		});
		expect(res.status).toBe(500);
		const rawText = JSON.stringify(await bodyOf(res));
		expect(rawText).not.toContain("raw primitive exception");
	});
});
