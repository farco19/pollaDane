"use client";

import Image from "next/image";
import { X } from "lucide-react";
import { useEffect, useState } from "react";

const STORAGE_KEY = "home-promo-modal-dismissed";

export function HomePromoModal() {
  const [open, setOpen] = useState<boolean | null>(null);

  useEffect(() => {
    const dismissed = window.localStorage.getItem(STORAGE_KEY);
    const timeoutId = window.setTimeout(() => {
      setOpen(dismissed !== "true");
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, []);

  function handleClose() {
    window.localStorage.setItem(STORAGE_KEY, "true");
    setOpen(false);
  }

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 py-6">
      <div className="relative w-full max-w-4xl overflow-hidden rounded-3xl bg-card shadow-2xl">
        <button
          type="button"
          onClick={handleClose}
          aria-label="Cerrar anuncio"
          className="absolute right-3 top-3 z-10 inline-flex size-10 items-center justify-center rounded-full bg-black/65 text-white transition hover:bg-black/80"
        >
          <X className="size-5" />
        </button>

        <div className="relative aspect-[4/5] w-full sm:aspect-[16/11] lg:aspect-[16/9]">
          <Image
            src="/popImage.jpeg"
            alt="Informacion destacada del torneo"
            fill
            priority
            className="object-contain bg-black"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 90vw, 960px"
          />
        </div>
      </div>
    </div>
  );
}
