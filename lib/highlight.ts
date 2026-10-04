import "server-only"

import { codeToHtml } from "shiki"

/** Highlights code for both themes at once; CSS picks one by `.dark`. */
export function highlight(code: string, lang: "tsx" | "ts" | "bash" | "json" | "css") {
  return codeToHtml(code, { lang, themes: { light: "github-light", dark: "github-dark" }, defaultColor: false })
}
