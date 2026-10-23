"use client";

import * as React from "react";
import { KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ApiKeysModal } from "./api-keys-modal";

export interface ApiKeysButtonProps {
  variant?: "out" | "ink" | "ghost";
  size?: "sm" | "md" | "lg";
  className?: string;
  label?: string;
}

export function ApiKeysButton({
  variant = "out",
  size = "sm",
  className,
  label = "API Keys",
}: ApiKeysButtonProps) {
  const [open, setOpen] = React.useState(false);

  return (
    <>
      <Button
        variant={variant}
        size={size}
        onClick={() => setOpen(true)}
        className={className}
      >
        <KeyRound className="h-3.5 w-3.5 text-accent" />
        <span>{label}</span>
      </Button>
      <ApiKeysModal open={open} onClose={() => setOpen(false)} />
    </>
  );
}
