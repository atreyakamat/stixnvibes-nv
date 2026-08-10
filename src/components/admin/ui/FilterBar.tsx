"use client";

import React from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export interface FilterOption {
  label: string;
  value: string;
}

export interface FilterDefinition {
  id: string;
  placeholder?: string;
  options: FilterOption[];
}

interface FilterBarProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder?: string;
  filters?: FilterDefinition[];
  filterValues?: Record<string, string>;
  onFilterChange?: (filterId: string, value: string) => void;
  className?: string;
}

export function FilterBar({
  searchQuery,
  onSearchChange,
  searchPlaceholder = "Search...",
  filters = [],
  filterValues = {},
  onFilterChange,
  className,
}: FilterBarProps) {
  return (
    <div className={cn("flex flex-col gap-3 sm:flex-row sm:items-center", className)}>
      <div className="flex-1 sm:max-w-xs">
        <Input
          type="text"
          placeholder={searchPlaceholder}
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full"
        />
      </div>
      
      {filters.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          {filters.map((filter) => (
            <select
              key={filter.id}
              value={filterValues[filter.id] || ""}
              onChange={(e) => onFilterChange?.(filter.id, e.target.value)}
              className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {filter.placeholder && (
                <option value="">{filter.placeholder}</option>
              )}
              {filter.options.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          ))}
        </div>
      )}
    </div>
  );
}
