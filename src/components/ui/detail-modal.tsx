"use client";

import { X } from "lucide-react";
import type { ReactNode } from "react";

type DetailModalProps = {
  open: boolean;
  title: string;
  description?: string;
  onClose: () => void;
  children: ReactNode;
};

export function DetailModal({ open, title, description, onClose, children }: DetailModalProps) {
  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 py-6">
      <div className="relative max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-3xl bg-card p-6 shadow-2xl">
        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar detalle"
          className="absolute right-4 top-4 inline-flex size-10 items-center justify-center rounded-full bg-muted text-foreground transition hover:bg-border"
        >
          <X className="size-5" />
        </button>
        <div className="pr-12">
          <h2 className="text-xl font-semibold text-foreground">{title}</h2>
          {description ? <p className="mt-2 text-sm leading-6 text-muted-foreground">{description}</p> : null}
        </div>
        <div className="mt-5">{children}</div>
      </div>
    </div>
  );
}
