import React from "react";

export type IconName =
	| "arrow"
	| "calendar"
	| "family"
	| "leaf"
	| "pin"
	| "search"
	| "send"
	| "shield"
	| "spark"
	| "target"
	| "tools"
	| "window";

const PATHS: Record<IconName, React.JSX.Element> = {
	arrow: <path d="M5 12h13m-5-5 5 5-5 5" />,
	calendar: <path d="M7 3v3m10-3v3M4 9h16M5 5h14a1 1 0 0 1 1 1v13H4V6a1 1 0 0 1 1-1Zm3 8h3m-3 3h5" />,
	family: <path d="M9 20v-1a3 3 0 0 1 3-3h2a3 3 0 0 1 3 3v1M13 13a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm-8 7v-1a3 3 0 0 1 3-3h1m-2-3a3 3 0 1 1 0-6" />,
	leaf: <path d="M20 4C11 4 5 8 5 14a6 6 0 0 0 6 6c6 0 9-6 9-16ZM4 20c3-4 6-6 11-8" />,
	pin: <path d="M19 10c0 5-7 10-7 10S5 15 5 10a7 7 0 1 1 14 0Zm-4 0a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />,
	search: <path d="m20 20-4.5-4.5M10.5 17a6.5 6.5 0 1 1 0-13 6.5 6.5 0 0 1 0 13Z" />,
	send: <path d="m4 4 16 8-16 8 3-8-3-8Zm3 8h10" />,
	shield: <path d="M12 3 19 6v5c0 4.7-2.8 8.1-7 10-4.2-1.9-7-5.3-7-10V6l7-3Zm-3 9 2 2 4-4" />,
	spark: <path d="m12 3 1.5 5.5L19 10l-5.5 1.5L12 17l-1.5-5.5L5 10l5.5-1.5L12 3Zm6 12 .6 2.4L21 18l-2.4.6L18 21l-.6-2.4L15 18l2.4-.6L18 15Z" />,
	target: <path d="M12 3v3m0 12v3M3 12h3m12 0h3M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Zm0 3a1 1 0 1 0 0 2 1 1 0 0 0 0-2Z" />,
	tools: <path d="m14 6 4-3 2 2-3 4m-3-3 4 4m-4-4L5 18a2 2 0 1 0 3 3l12-9M4 4l4 4m-5-1 2-2 4 4-2 2-4-4Z" />,
	window: <path d="M4 5h16v14H4V5Zm0 4h16M8 3v4m4-4v4m4-4v4M8 13h3m2 0h3m-8 3h3m2 0h3" />,
};

export function Icon({ name, size = 18 }: { readonly name: IconName; readonly size?: number }): React.JSX.Element {
	return (
		<svg
			aria-hidden="true"
			className="icon"
			fill="none"
			height={size}
			stroke="currentColor"
			strokeLinecap="round"
			strokeLinejoin="round"
			strokeWidth="1.7"
			viewBox="0 0 24 24"
			width={size}
		>
			{PATHS[name]}
		</svg>
	);
}
