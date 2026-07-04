// A custom Tiptap block node for editorial callouts ("Tip", "Warning", etc.),
// one of the required rich-text block types that has no built-in extension.
// Renders as <div data-callout="info|warning|success|tip">…</div>, matched
// by the "callout" CSS in src/styles.css and allowed through the article
// HTML sanitizer (src/lib/sanitize-html.ts).
import { Node, mergeAttributes } from "@tiptap/core";

export type CalloutVariant = "info" | "warning" | "success" | "tip";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    callout: {
      setCallout: (variant?: CalloutVariant) => ReturnType;
      unsetCallout: () => ReturnType;
    };
  }
}

export const Callout = Node.create({
  name: "callout",
  group: "block",
  content: "block+",
  defining: true,

  addAttributes() {
    return {
      variant: {
        default: "info",
        parseHTML: (el) => (el as HTMLElement).getAttribute("data-callout") ?? "info",
        renderHTML: (attrs) => ({ "data-callout": attrs.variant }),
      },
    };
  },

  parseHTML() {
    return [{ tag: "div[data-callout]" }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, {
        class: `callout callout-${HTMLAttributes["data-callout"] ?? "info"}`,
      }),
      0,
    ];
  },

  addCommands() {
    return {
      setCallout:
        (variant: CalloutVariant = "info") =>
        ({ commands }) =>
          commands.wrapIn(this.name, { variant }),
      unsetCallout:
        () =>
        ({ commands }) =>
          commands.lift(this.name),
    };
  },
});
