"use client";

import { ClipboardCopy } from "lucide-react";
import { useState } from "react";
import { Button } from "../components/ui/button";

export function CopyLogsButton({
  label = "Copy logs",
  logs,
}: {
  label?: string;
  logs: string;
}) {
  const [copied, setCopied] = useState(false);

  return (
    <Button
      onClick={async () => {
        await navigator.clipboard?.writeText(logs);
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1_500);
      }}
      type="button"
      variant="ghost"
    >
      <ClipboardCopy aria-hidden="true" className="size-4" />
      {copied ? "Copied" : label}
    </Button>
  );
}
