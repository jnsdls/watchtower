"use client";

import { XCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "../components/ui/button";

export function CancelJobButton({ jobId }: { jobId: string }) {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);

  return (
    <Button
      disabled={isPending}
      onClick={async () => {
        if (!window.confirm("Cancel all running Runs in this Job?")) {
          return;
        }

        setIsPending(true);

        try {
          await fetch(`/api/jobs/${jobId}/cancel`, { method: "POST" });
          router.refresh();
        } finally {
          setIsPending(false);
        }
      }}
      size="sm"
      type="button"
      variant="danger"
    >
      <XCircle aria-hidden="true" className="size-4" />
      Cancel job
    </Button>
  );
}
