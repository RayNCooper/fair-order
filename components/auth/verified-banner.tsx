"use client";

import { useState } from "react";
import { IconCheck, IconX } from "@tabler/icons-react";

export function VerifiedBanner() {
  const [visible, setVisible] = useState(true);

  if (!visible) return null;

  return (
    <div className="border-l-[3px] border-primary bg-primary/5 p-4 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <IconCheck className="h-5 w-5 text-primary" />
        <p className="text-sm font-semibold">
          E-Mail erfolgreich bestätigt!
        </p>
      </div>
      <button
        onClick={() => setVisible(false)}
        className="text-muted-foreground hover:text-foreground"
        aria-label="Schließen"
      >
        <IconX className="h-4 w-4" />
      </button>
    </div>
  );
}
