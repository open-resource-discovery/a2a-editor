import * as React from "react";
import { cn } from "@lib/utils/cn";

/**
 * Simple ScrollArea component that avoids Radix UI's compose-refs issue with React 19.
 *
 * The Radix ScrollArea component has a known infinite loop bug with React 19
 * due to how it handles ref callbacks. This is a simpler native implementation
 * that provides the same visual styling without the problematic ref composition.
 *
 * @see https://github.com/radix-ui/primitives/issues/3799
 */

interface ScrollAreaProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Ref to the scrollable viewport element (inner div) */
  viewportRef?: React.RefObject<HTMLDivElement | null>;
}

const ScrollArea = React.forwardRef<HTMLDivElement, ScrollAreaProps>(
  ({ className, children, viewportRef, ...props }, ref) => (
    <div ref={ref} className={cn("relative overflow-hidden", className)} {...props}>
      <div
        ref={viewportRef}
        className="h-full w-full overflow-auto rounded-[inherit] scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent">
        {children}
      </div>
    </div>
  ),
);
ScrollArea.displayName = "ScrollArea";

const ScrollBar = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { orientation?: "vertical" | "horizontal" }
>(({ className, orientation = "vertical", ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "flex touch-none select-none transition-colors",
      orientation === "vertical" && "h-full w-2.5 border-l border-l-transparent p-[1px]",
      orientation === "horizontal" && "h-2.5 flex-col border-t border-t-transparent p-[1px]",
      className,
    )}
    {...props}
  />
));
ScrollBar.displayName = "ScrollBar";

export { ScrollArea, ScrollBar };
