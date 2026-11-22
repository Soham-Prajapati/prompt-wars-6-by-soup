import React from "react";

type InlineNode = string | React.JSX.Element;

function renderInline(text: string, keyPrefix: string): readonly InlineNode[] {
	const nodes: InlineNode[] = [];
	const pattern = /(\*\*|__)(.+?)\1|(\*|_)([^*_]+?)\3/g;
	let cursor = 0;

	for (const match of text.matchAll(pattern)) {
		const index = match.index;
		if (index > cursor) {
			nodes.push(text.slice(cursor, index));
		}

		if (match[2] !== undefined) {
			nodes.push(<strong key={`${keyPrefix}-strong-${String(index)}`}>{match[2]}</strong>);
		} else if (match[4] !== undefined) {
			nodes.push(<em key={`${keyPrefix}-em-${String(index)}`}>{match[4]}</em>);
		}
		cursor = index + match[0].length;
	}

	if (cursor < text.length) {
		nodes.push(text.slice(cursor));
	}

	return nodes.length > 0 ? nodes : [text];
}

/** Render a small, safe subset of markdown without injecting HTML. */
export function MarkdownRenderer({
	content,
	className,
}: {
	readonly content: string;
	readonly className?: string;
}): React.JSX.Element {
	const lines = content.replaceAll("\r\n", "\n").split("\n");
	const blocks: React.JSX.Element[] = [];
	let paragraph: string[] = [];
	let list: { ordered: boolean; items: string[] } | null = null;

	const flushParagraph = (): void => {
		if (paragraph.length === 0) return;
		const text = paragraph.join(" ").trim();
		if (text.length > 0) {
			const blockKey = String(blocks.length);
			blocks.push(<p key={`paragraph-${blockKey}`}>{renderInline(text, `paragraph-${blockKey}`)}</p>);
		}
		paragraph = [];
	};

	const flushList = (): void => {
		if (list === null || list.items.length === 0) return;
		const ListTag = list.ordered ? "ol" : "ul";
		const blockKey = String(blocks.length);
		const orderedLabel = list.ordered ? "ordered" : "unordered";
		blocks.push(
			<ListTag key={`list-${blockKey}`}>
				{list.items.map((item, index) => (
					<li key={`${orderedLabel}-${String(index)}`}>
						{renderInline(item, `list-${blockKey}-${String(index)}`)}
					</li>
				))}
			</ListTag>,
		);
		list = null;
	};

	for (const line of lines) {
		const heading = line.match(/^\s*(#{1,6})\s+(.+?)\s*#*\s*$/);
		if (heading !== null) {
			flushParagraph();
			flushList();
			const hashes = heading[1];
			const headingText = heading[2];
			if (hashes === undefined || headingText === undefined) continue;
			const level = Math.min(hashes.length, 6) as 1 | 2 | 3 | 4 | 5 | 6;
			const Heading = `h${String(level)}` as keyof React.JSX.IntrinsicElements;
			blocks.push(
				React.createElement(
					Heading,
					{ key: `heading-${String(blocks.length)}` },
					renderInline(headingText, `heading-${String(blocks.length)}`),
				),
			);
			continue;
		}

		const unordered = line.match(/^\s*[-*+]\s+(.+)$/);
		const ordered = line.match(/^\s*\d+[.)]\s+(.+)$/);
		if (unordered !== null || ordered !== null) {
			flushParagraph();
			const orderedList = ordered !== null;
			if (list === null || list.ordered !== orderedList) {
				flushList();
				list = { ordered: orderedList, items: [] };
			}
			const itemText = ordered !== null ? ordered[1] : unordered?.[1];
			if (itemText !== undefined) list.items.push(itemText);
			continue;
		}

		if (line.trim().length === 0) {
			flushParagraph();
			flushList();
			continue;
		}

		flushList();
		paragraph.push(line.trim());
	}

	flushParagraph();
	flushList();

	return <div className={className}>{blocks}</div>;
}
