import type { CSSProperties } from "react";

// Themed recharts <Tooltip /> props for the dark UI. Recharts defaults its
// tooltip to a white box with dark text, which clashes with the app theme and
// reads poorly — spread these into every Tooltip for a consistent, legible
// surface using the popover tokens.
const content: CSSProperties = {
  background: "var(--popover)",
  border: "1px solid var(--border)",
  borderRadius: 12,
  color: "var(--popover-foreground)",
  fontSize: 12,
  boxShadow: "var(--shadow-card)",
};

export const chartTooltipProps = {
  contentStyle: content,
  itemStyle: { color: "var(--popover-foreground)" } as CSSProperties,
  labelStyle: { color: "var(--muted-foreground)", marginBottom: 2 } as CSSProperties,
} as const;
