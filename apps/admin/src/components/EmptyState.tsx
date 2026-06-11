import type { ReactNode } from 'react';

/** Shared filtered-to-zero / empty-list state (design `EmptyState`). */
export const EmptyState = ({
  icon,
  title,
  sub,
  actionLabel,
  onAction,
}: {
  icon: ReactNode;
  title: string;
  sub?: string;
  actionLabel?: string;
  onAction?: () => void;
}) => (
  <div className="empty-state">
    <div className="es-ic">{icon}</div>
    <div className="es-t">{title}</div>
    {sub && <div className="es-s">{sub}</div>}
    {actionLabel && onAction && (
      <button className="btn btn-ghost" onClick={onAction}>
        {actionLabel}
      </button>
    )}
  </div>
);
