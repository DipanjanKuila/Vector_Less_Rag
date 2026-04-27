import { useEffect, useState } from "react";
import { Settings2, Check } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getApiBase, setApiBase } from "@/lib/api";
import { toast } from "sonner";

export const ApiSettings = ({ onChange }: { onChange?: () => void }) => {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState("");

  useEffect(() => {
    setValue(getApiBase());
  }, [open]);

  const save = () => {
    if (!value.trim()) {
      toast.error("Please enter a backend URL");
      return;
    }
    setApiBase(value.trim());
    toast.success("Backend URL saved");
    setOpen(false);
    onChange?.();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Settings2 className="h-4 w-4" />
          <span className="hidden sm:inline">Backend</span>
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Backend configuration</DialogTitle>
          <DialogDescription>
            URL of your FastAPI server exposing /upload-document, /documents, /ask, and /document-tree.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor="api-url">Base URL</Label>
          <Input
            id="api-url"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="http://localhost:8000"
          />
          <p className="text-xs text-muted-foreground">
            Make sure CORS allows this origin from your FastAPI app.
          </p>
        </div>
        <DialogFooter>
          <Button onClick={save} className="gap-2">
            <Check className="h-4 w-4" /> Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
