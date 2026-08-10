"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export interface ColumnDef<T> {
  id: string;
  header: React.ReactNode | string;
  accessorKey?: keyof T;
  cell?: (item: T) => React.ReactNode;
  sortable?: boolean;
  className?: string;
}

export interface PaginationState {
  page: number;
  pageSize: number;
  total: number;
}

export interface SortState<T> {
  column: keyof T | string;
  direction: "asc" | "desc";
}

interface DataTableProps<T> {
  data: T[];
  columns: ColumnDef<T>[];
  getRowId: (item: T) => string;
  
  // Selection
  enableSelection?: boolean;
  selectedIds?: string[];
  onSelectionChange?: (selectedIds: string[]) => void;
  
  // Sorting
  sortState?: SortState<T>;
  onSort?: (column: string) => void;
  
  // Pagination
  pagination?: PaginationState;
  onPageChange?: (page: number) => void;
  
  // Other
  onRowClick?: (item: T) => void;
  isLoading?: boolean;
  emptyMessage?: string;
  className?: string;
}

export function DataTable<T>({
  data,
  columns,
  getRowId,
  enableSelection = false,
  selectedIds = [],
  onSelectionChange,
  sortState,
  onSort,
  pagination,
  onPageChange,
  onRowClick,
  isLoading = false,
  emptyMessage = "No data available.",
  className,
}: DataTableProps<T>) {
  const allSelected = data.length > 0 && selectedIds.length === data.length;
  const someSelected = selectedIds.length > 0 && selectedIds.length < data.length;

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!onSelectionChange) return;
    if (e.target.checked) {
      onSelectionChange(data.map(getRowId));
    } else {
      onSelectionChange([]);
    }
  };

  const handleSelectRow = (e: React.ChangeEvent<HTMLInputElement>, id: string) => {
    if (!onSelectionChange) return;
    if (e.target.checked) {
      onSelectionChange([...selectedIds, id]);
    } else {
      onSelectionChange(selectedIds.filter((selectedId) => selectedId !== id));
    }
  };

  const totalPages = pagination ? Math.ceil(pagination.total / pagination.pageSize) : 1;

  return (
    <div className={cn("space-y-4", className)}>
      <div className="rounded-md border bg-card">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-muted-foreground uppercase bg-muted/50 border-b">
              <tr>
                {enableSelection && (
                  <th className="px-4 py-3 w-[40px]">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      ref={(input) => {
                        if (input) {
                          input.indeterminate = someSelected;
                        }
                      }}
                      onChange={handleSelectAll}
                      className="rounded border-gray-300"
                    />
                  </th>
                )}
                {columns.map((col) => (
                  <th
                    key={col.id}
                    className={cn(
                      "px-4 py-3 font-medium",
                      col.sortable && "cursor-pointer hover:bg-muted/80",
                      col.className
                    )}
                    onClick={() => {
                      if (col.sortable && onSort) {
                        onSort(col.id);
                      }
                    }}
                  >
                    <div className="flex items-center gap-1">
                      {col.header}
                      {col.sortable && sortState?.column === col.id && (
                        <span>
                          {sortState.direction === "asc" ? "↑" : "↓"}
                        </span>
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td
                    colSpan={columns.length + (enableSelection ? 1 : 0)}
                    className="h-24 text-center"
                  >
                    Loading...
                  </td>
                </tr>
              ) : data.length === 0 ? (
                <tr>
                  <td
                    colSpan={columns.length + (enableSelection ? 1 : 0)}
                    className="h-24 text-center text-muted-foreground"
                  >
                    {emptyMessage}
                  </td>
                </tr>
              ) : (
                data.map((item) => {
                  const rowId = getRowId(item);
                  const isSelected = selectedIds.includes(rowId);

                  return (
                    <tr
                      key={rowId}
                      className={cn(
                        "border-b transition-colors hover:bg-muted/50",
                        isSelected && "bg-muted/50",
                        onRowClick && "cursor-pointer"
                      )}
                      onClick={(e) => {
                        // Prevent row click if clicking checkbox
                        if ((e.target as HTMLElement).tagName.toLowerCase() === "input") return;
                        onRowClick?.(item);
                      }}
                    >
                      {enableSelection && (
                        <td className="px-4 py-3 w-[40px]" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={(e) => handleSelectRow(e, rowId)}
                            className="rounded border-gray-300"
                          />
                        </td>
                      )}
                      {columns.map((col) => (
                        <td key={col.id} className={cn("px-4 py-3", col.className)}>
                          {col.cell
                            ? col.cell(item)
                            : col.accessorKey
                            ? String(item[col.accessorKey] ?? "")
                            : null}
                        </td>
                      ))}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {pagination && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            Showing{" "}
            {Math.min(
              (pagination.page - 1) * pagination.pageSize + 1,
              pagination.total
            )}{" "}
            to{" "}
            {Math.min(pagination.page * pagination.pageSize, pagination.total)} of{" "}
            {pagination.total} entries
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange?.(pagination.page - 1)}
              disabled={pagination.page <= 1}
            >
              Previous
            </Button>
            <div className="text-sm">
              Page {pagination.page} of {totalPages}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange?.(pagination.page + 1)}
              disabled={pagination.page >= totalPages}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
