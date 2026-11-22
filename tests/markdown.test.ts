import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { MarkdownRenderer } from "@/lib/markdown";

describe("MarkdownRenderer", () => {
	it("renders supported headings, emphasis, paragraphs, and lists as React elements", () => {
		const markup = renderToStaticMarkup(
			React.createElement(MarkdownRenderer, {
				content: "# Morning brief\n\nKeep **windows closed** and *stay calm*.\n\n- Use the purifier\n- Wear __FFP2__ outdoors\n\n1. Check AQI\n2. Shift errands",
			}),
		);

		expect(markup).toContain("<h1>Morning brief</h1>");
		expect(markup).toContain("<strong>windows closed</strong>");
		expect(markup).toContain("<em>stay calm</em>");
		expect(markup).toContain("<ul><li>Use the purifier</li><li>Wear <strong>FFP2</strong> outdoors</li></ul>");
		expect(markup).toContain("<ol><li>Check AQI</li><li>Shift errands</li></ol>");
	});

	it("escapes raw HTML instead of injecting it", () => {
		const markup = renderToStaticMarkup(
			React.createElement(MarkdownRenderer, { content: "Safe <script>alert(1)</script> text" }),
		);

		expect(markup).toContain("&lt;script&gt;alert(1)&lt;/script&gt;");
		expect(markup).not.toContain("<script>");
		expect(markup).not.toContain("dangerouslySetInnerHTML");
	});
});
