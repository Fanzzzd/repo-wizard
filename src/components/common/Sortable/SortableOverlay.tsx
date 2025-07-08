import type { PropsWithChildren } from "react";
import { DragOverlay, defaultDropAnimationSideEffects } from "@dnd-kit/core";
import type { DropAnimation } from "@dnd-kit/core";

const dropAnimationConfig: DropAnimation = {
  sideEffects: defaultDropAnimationSideEffects({
    styles: {
      active: {
        opacity: "0.5",
      },
    },
  }),
};

export function SortableOverlay({ children }: PropsWithChildren<{}>) {
  return <DragOverlay dropAnimation={dropAnimationConfig}>{children}</DragOverlay>;
}