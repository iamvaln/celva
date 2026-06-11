import type { ReactNode } from 'react';

export type DetailAction = {
  icon?: ReactNode;
  label: string;
  onClick: () => void;
  danger?: boolean;
  push?: boolean;
  hidden?: boolean;
};

/** Shared secondary-action row (design CelvaUtil.DetailActions). */
export const DetailActions = ({ actions }: { actions: DetailAction[] }) => (
  <div className="secondary-actions">
    {actions
      .filter((a) => !a.hidden)
      .map((a, i) => (
        <button
          key={i}
          className={`btn btn-quiet${a.danger ? ' btn-danger' : ''}${a.push ? ' push-right' : ''}`}
          onClick={a.onClick}
        >
          {a.icon}
          {a.label}
        </button>
      ))}
  </div>
);
