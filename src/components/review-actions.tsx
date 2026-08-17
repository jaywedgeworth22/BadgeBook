import { useRef } from "react";
import { Check, RotateCcw, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ReviewActions({
  onApprove,
  onRetry,
  onUpload,
  onCancel,
  approveLabel = "Approve",
  retryLabel = "Try another",
  uploadLabel = "Upload",
  cancelLabel = "Skip",
  approveDisabled,
  retryDisabled,
  busy,
}: {
  onApprove?: () => void;
  onRetry?: () => void;
  onUpload: (file: File) => void;
  onCancel: () => void;
  approveLabel?: string;
  retryLabel?: string;
  uploadLabel?: string;
  cancelLabel?: string;
  approveDisabled?: boolean;
  retryDisabled?: boolean;
  busy?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="flex flex-col gap-2">
      {onApprove && (
        <Button size="lg" variant="ok" className="w-full" disabled={approveDisabled || busy} onClick={onApprove}>
          <Check />
          {approveLabel}
        </Button>
      )}
      <div className="grid grid-cols-2 gap-2">
        <Button
          variant="secondary"
          disabled={retryDisabled || busy || !onRetry}
          onClick={onRetry}
        >
          <RotateCcw />
          {retryLabel}
        </Button>
        <Button variant="secondary" disabled={busy} onClick={() => inputRef.current?.click()}>
          <Upload />
          {uploadLabel}
        </Button>
      </div>
      <Button variant="ghost" disabled={busy} onClick={onCancel}>
        <X />
        {cancelLabel}
      </Button>
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/svg+xml,image/gif"
        className="sr-only"
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (file) onUpload(file);
        }}
      />
    </div>
  );
}
