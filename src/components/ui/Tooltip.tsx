import * as RadixTooltip from "@radix-ui/react-tooltip";
import type { ReactNode } from "react";

// Project-local Tooltip primitive replacing MUI's Tooltip.
// Keeps a MUI-compatible API (title + placement) so call sites only swap imports.
type Placement = "top" | "bottom" | "left" | "right";

interface TooltipProps {
  title: ReactNode;
  placement?: Placement;
  children: ReactNode;
}

export default function Tooltip({ title, placement = "top", children }: TooltipProps) {
  if (!title) return <>{children}</>;

  return (
    <RadixTooltip.Provider delayDuration={300}>
      <RadixTooltip.Root>
        <RadixTooltip.Trigger asChild>{children}</RadixTooltip.Trigger>
        <RadixTooltip.Portal>
          <RadixTooltip.Content
            side={placement}
            sideOffset={6}
            className="z-50 select-none rounded-md bg-foreground px-2 py-1 text-xs text-background shadow-md"
          >
            {title}
            <RadixTooltip.Arrow className="fill-foreground" />
          </RadixTooltip.Content>
        </RadixTooltip.Portal>
      </RadixTooltip.Root>
    </RadixTooltip.Provider>
  );
}
