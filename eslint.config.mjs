import vitals from "eslint-config-next/core-web-vitals"
import typescript from "eslint-config-next/typescript"

const config = [
  { ignores: [".next/**", "out/**", "public/**", "references/**", "test-results/**", "playwright-report/**", "next-env.d.ts"] },
  ...vitals,
  ...typescript,
  {
    rules: {
      // entities keep their state loosely typed so a host can hold many kinds side by side
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
    },
  },
]

export default config
