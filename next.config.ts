import type { NextConfig } from "next";

/**
 * Next.js configuration.
 *
 * Security headers harden every document response. API routes set their own
 * headers via the shared `apiHeaders` helper in `src/lib/api.ts`.
 */
const nextConfig: NextConfig = {
	poweredByHeader: false,
	reactStrictMode: true,

	headers() {
		return Promise.resolve([
			{
				source: "/:path*",
				headers: [
					{ key: "X-Content-Type-Options", value: "nosniff" },
					{ key: "X-Frame-Options", value: "DENY" },
					{ key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
					{
						key: "Permissions-Policy",
						value: "geolocation=(self), microphone=(), camera=()",
					},
					{
						key: "Strict-Transport-Security",
						value: "max-age=31536000; includeSubDomains",
					},
					{
						key: "Content-Security-Policy",
						value: [
							"default-src 'self'",
							"script-src 'self' 'unsafe-inline'",
							"style-src 'self' 'unsafe-inline'",
							"img-src 'self' data:",
							"font-src 'self'",
						"connect-src 'self'",
						"object-src 'none'",
						"worker-src 'self'",
							"frame-ancestors 'none'",
							"base-uri 'self'",
							"form-action 'self'",
						].join("; "),
					},
				],
			},
		]);
	},
};

export default nextConfig;
