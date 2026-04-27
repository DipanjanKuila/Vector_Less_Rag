import { useCallback, useRef, useState } from "react";
import { Upload, FileText, Loader2, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { uploadDocument } from "@/lib/api";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Props {
  onUploaded: () => void;
}

export const DocumentUpload = ({ onUploaded }: Props) => {
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [lastFile, setLastFile] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = useCallback(
    async (files: FileList | null) => {
      if (!files || files.length === 0) return;
      const file = files[0];
      if (!file.name.toLowerCase().endsWith(".pdf")) {
        toast.error("Only PDF files are supported");
        return;
      }
      setUploading(true);
      try {
        await uploadDocument(file);
        setLastFile(file.name);
        toast.success(`Uploaded "${file.name}"`);
        onUploaded();
      } catch (e) {
        toast.error(`Upload failed: ${(e as Error).message}`);
      } finally {
        setUploading(false);
      }
    },
    [onUploaded]
  );

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        handleFiles(e.dataTransfer.files);
      }}
      className={cn(
        "relative rounded-lg border-2 border-dashed bg-surface p-6 text-center cursor-pointer transition-colors duration-200 ease-smooth",
        dragOver
          ? "border-primary bg-accent"
          : "border-border hover:border-primary/60 hover:bg-accent/40"
      )}
      onClick={() => inputRef.current?.click()}
    >
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf"
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />

      <div className="flex flex-col items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-accent">
          {uploading ? (
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          ) : (
            <Upload className="h-5 w-5 text-primary" />
          )}
        </div>

        <div>
          <p className="text-sm font-medium text-foreground">
            {uploading ? "Uploading…" : "Drop PDF here or click to browse"}
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">PDF files only · max 20MB</p>
        </div>

        {lastFile && !uploading && (
          <div className="mt-1 flex items-center gap-2 rounded-md border border-border bg-card px-2.5 py-1 text-xs">
            <CheckCircle2 className="h-3.5 w-3.5 text-success" />
            <FileText className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="max-w-[200px] truncate text-foreground">{lastFile}</span>
          </div>
        )}

        <Button
          type="button"
          size="sm"
          variant="outline"
          className="mt-1"
          disabled={uploading}
        >
          Choose file
        </Button>
      </div>
    </div>
  );
};
