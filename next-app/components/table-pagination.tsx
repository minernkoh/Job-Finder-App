/**
 * Table pagination: shows total count, current page of total pages, and Prev/Next buttons. Used by admin tables.
 */

"use client";

import { CaretLeftIcon, CaretRightIcon } from "@phosphor-icons/react";
import { Button } from "@ui/components";

interface TablePaginationProps {
  total: number;
  page: number;
  limit: number;
  onPageChange: (page: number) => void;
}

/** Renders "X total · page Y of Z" and Prev/Next buttons for table pagination. */
export function TablePagination({
  total,
  page,
  limit,
  onPageChange,
}: TablePaginationProps) {
  const totalPages = Math.ceil(total / limit) || 1;
  return (
    <div className="mt-4 flex items-center justify-between">
      <p className="text-muted-foreground text-xs">
        {total} total · page {page} of {totalPages}
      </p>
      <div className="flex gap-1">
        <Button
          variant="outline"
          size="sm"
          disabled={page <= 1}
          onClick={() => onPageChange(Math.max(1, page - 1))}
        >
          <CaretLeftIcon className="size-4" weight="regular" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
        >
          <CaretRightIcon className="size-4" weight="regular" />
        </Button>
      </div>
    </div>
  );
}
