"use client";

import * as React from "react";
import * as ToastPrimitive from "@radix-ui/react-toast";
import { cn } from "@/lib/utils";

const ToastProvider = ToastPrimitive.Provider;
const ToastViewport = ToastPrimitive.Viewport;
const ToastRoot = ToastPrimitive.Root;
const ToastTitle = ToastPrimitive.Title;
const ToastDescription = ToastPrimitive.Description;
const ToastClose = ToastPrimitive.Close;

const Toast = ({ children }: { children: React.ReactNode }) => (
  <ToastRoot className={cn(
    "bg-background border border-border rounded-md p-4 shadow-md",
    "flex items-start space-x-2"
  )}>
    {children}
  </ToastRoot>
);

export { ToastProvider, ToastViewport, Toast, ToastTitle, ToastDescription, ToastClose };
