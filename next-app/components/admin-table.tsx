/**
 * Shared admin table: full-width layout, consistent header/row/cell styling, Actions column right-aligned so icons sit at the right edge with no large gap.
 */

"use client";

import type { ReactNode } from "react";

/** Class for thead row. */
export const adminTableHeaderRowClass =
  "border-b border-border";

/** Class for each th; use for all columns except the last. */
export const adminTableHeaderCellClass =
  "pb-2 pr-2 font-medium text-muted-foreground";

/** Class for the last th (Actions); right-aligned so action icons sit at the right edge. */
export const adminTableHeaderCellActionsClass =
  "pb-2 pl-2 pr-0 font-medium text-muted-foreground text-right whitespace-nowrap";

/** Class for each tbody tr. */
export const adminTableBodyRowClass =
  "border-b border-border/50";

/** Class for each td; use for all columns except the last. */
export const adminTableBodyCellClass =
  "py-2 pr-2 text-foreground";

/** Class for the last td (Actions); right-aligned, minimal right padding so icons sit at the right edge. */
export const adminTableBodyCellActionsClass =
  "py-2 pl-2 pr-0 text-right whitespace-nowrap";

interface AdminTableProps {
  /** Header cell content (one per column). Last column is rendered right-aligned for Actions. */
  headers: ReactNode[];
  /** Table body rows (tr elements). */
  children: ReactNode;
}

/** Renders a full-width admin table with consistent thead styling and right-aligned Actions column. */
export function AdminTable({ headers, children }: AdminTableProps) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className={adminTableHeaderRowClass}>
            {headers.map((h, i) => (
              <th
                key={i}
                className={
                  i === headers.length - 1
                    ? adminTableHeaderCellActionsClass
                    : adminTableHeaderCellClass
                }
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}
