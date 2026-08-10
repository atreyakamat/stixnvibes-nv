import React from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export type StatusType = "success" | "warning" | "error" | "info" | "default";

interface StatusBadgeProps {
  status: StatusType;
  label: React.ReactNode;
  className?: string;
}

export function StatusBadge({ status, label, className }: StatusBadgeProps) {
  const getCustomColor = (status: StatusType) => {
    switch (status) {
      case "success":
        return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 border-green-200 dark:border-green-800";
      case "warning":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800";
      case "error":
        return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800";
      case "info":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-800";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300 border-gray-200 dark:border-gray-700";
    }
  };

  return (
    <Badge 
      variant="outline" 
      className={cn(getCustomColor(status), className)}
    >
      {label}
    </Badge>
  );
}
