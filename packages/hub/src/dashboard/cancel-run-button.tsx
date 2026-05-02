"use client";

import { XCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "../components/ui/button";

export function CancelRunButton({ runId }: { runId: string }) {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);

  return (
    <Button
      disabled={isPending}
      onClick={async () => {
        setIsPending(true);

        try {
          await fetch(`/api/runs/${runId}/cancel/request`, { method: "POST" });
          router.refresh();
        } finally {
          setIsPending(false);
        }
      }}
      size="sm"
      type="button"
      variant="outline"
    >
      <XCircle aria-hidden="true" className="size-4" />
      Cancel
    </Button>
  );
}
