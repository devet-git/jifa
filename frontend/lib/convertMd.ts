import { marked } from "marked";
import TurndownService from "turndown";

const turndown = new TurndownService({
  headingStyle: "atx",
  codeBlockStyle: "fenced",
  bulletListMarker: "-",
  emDelimiter: "*",
  strongDelimiter: "**",
});

export function mdToHtml(md: string | undefined | null): string {
  if (!md) return "";
  return marked.parse(md, { async: false }) as string;
}

export function htmlToMd(html: string | undefined | null): string {
  if (!html) return "";
  return turndown.turndown(html);
}
