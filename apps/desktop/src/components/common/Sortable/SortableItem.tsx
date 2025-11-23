import type { UniqueIdentifier } from '@dnd-kit/core';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { CSSProperties, PropsWithChildren } from 'react';

export function SortableItem({
  children,
  id,
}: PropsWithChildren<{ id: UniqueIdentifier }>) {
  const {
    attributes,
    isDragging,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id });

  const style: CSSProperties = {
    opacity: isDragging ? 0.4 : undefined,
    transform: CSS.Translate.toString(transform),
    transition: transition
      ? `${transition}, opacity 200ms ease`
      : 'opacity 200ms ease',
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      {children}
    </div>
  );
}

export function DragHandle({ children }: PropsWithChildren) {
  return <div className="flex items-center justify-center">{children}</div>;
}
