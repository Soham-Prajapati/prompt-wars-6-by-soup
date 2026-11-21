// @ts-check
import js from "@eslint/js";
import tseslint from "typescript-eslint";
import jsxA11y from "eslint-plugin-jsx-a11y";
import reactHooks from "eslint-plugin-react-hooks";

export default tseslint.config(
	{
		ignores: [".next/**", "node_modules/**", "next-env.d.ts", "coverage/**"],
	},
	js.configs.recommended,
	...tseslint.configs.strictTypeChecked,
	{
		languageOptions: {
			parserOptions: {
				projectService: true,
				tsconfigRootDir: import.meta.dirname,
			},
		},
	},
	{
		files: ["src/**/*.{ts,tsx}"],
		plugins: {
			"jsx-a11y": jsxA11y,
			"react-hooks": reactHooks,
		},
		rules: {
			...jsxA11y.configs.recommended.rules,
			"react-hooks/rules-of-hooks": "error",
			"react-hooks/exhaustive-deps": "error",
			"@typescript-eslint/no-explicit-any": "error",
			"@typescript-eslint/no-non-null-assertion": "error",
			"@typescript-eslint/explicit-function-return-type": "error",
			"@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
			"no-console": ["error", { allow: ["warn", "error"] }],
			eqeqeq: ["error", "always"],
			"prefer-const": "error",
			"no-var": "error",
		},
	},
	{
		files: ["tests/**/*.ts", "*.config.ts", "*.config.mjs"],
		rules: {
			"@typescript-eslint/explicit-function-return-type": "off",
		},
	},
	{
		files: ["eslint.config.mjs"],
		extends: [tseslint.configs.disableTypeChecked],
	},
);
