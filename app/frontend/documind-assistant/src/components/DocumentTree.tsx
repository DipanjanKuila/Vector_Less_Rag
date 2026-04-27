import { useEffect, useState } from "react";
import { ChevronRight, FileText, Folder, FolderOpen } from "lucide-react";
import type { TreeNode } from "@/lib/api";
import { cn } from "@/lib/utils";

interface Props {
  node: TreeNode;
  depth?: number;
  defaultOpen?: boolean;
}

const nodeLabel = (n: TreeNode, fallback = "Node") =>
  String(n.title ?? n.name ?? n.label ?? n.id ?? fallback);

const nodeBody = (n: TreeNode) =>
  typeof n.summary === "string" && n.summary
    ? n.summary
    : typeof n.text === "string" && n.text
      ? n.text
      : typeof n.content === "string"
        ? n.content
        : null;

export const DocumentTree = ({ node, depth = 0, defaultOpen = true }: Props) => {
  const [open, setOpen] = useState(defaultOpen || depth < 2);
  const children = Array.isArray(node.children) ? node.children : [];
  const hasChildren = children.length > 0;
  const body = nodeBody(node);

  useEffect(() => {
    if (depth >= 3) setOpen(false);
  }, [depth]);

  return (
    <div className={cn("relative", depth > 0 && "ml-3 border-l border-border pl-3")}>
      <button
        type="button"
        onClick={() => hasChildren && setOpen((v) => !v)}
        className={cn(
          "group flex w-full items-start gap-2 rounded-md px-2 py-1.5 text-left transition-colors",
          "hover:bg-secondary",
          !hasChildren && "cursor-default hover:bg-transparent"
        )}
      >
        <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center text-muted-foreground">
          {hasChildren ? (
            <ChevronRight
              className={cn("h-3.5 w-3.5 transition-transform", open && "rotate-90")}
            />
          ) : (
            <span className="h-1.5 w-1.5 rounded-full bg-border" />
          )}
        </span>
        <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center">
          {hasChildren ? (
            open ? (
              <FolderOpen className="h-3.5 w-3.5 text-primary" />
            ) : (
              <Folder className="h-3.5 w-3.5 text-primary" />
            )
          ) : (
            <FileText className="h-3.5 w-3.5 text-muted-foreground" />
          )}
        </span>
        <span className="min-w-0 flex-1">
          <span
            className={cn(
              "block truncate text-sm",
              depth === 0 ? "font-semibold text-foreground" : "font-medium text-foreground"
            )}
          >
            {nodeLabel(node)}
          </span>
          <span className="mt-0.5 flex flex-wrap items-center gap-1.5">
            {node.node_id && (
              <span className="font-mono text-[10px] text-muted-foreground">{String(node.node_id)}</span>
            )}
            {node.page != null && (
              <span className="rounded border border-border bg-secondary px-1 py-0.5 text-[10px] text-muted-foreground">
                p.{String(node.page)}
              </span>
            )}
          </span>
          {body && (
            <span className="mt-0.5 line-clamp-2 block text-xs text-muted-foreground">
              {body}
            </span>
          )}
        </span>
        {hasChildren && (
          <span className="ml-auto rounded border border-border bg-secondary px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
            {children.length}
          </span>
        )}
      </button>

      {open && hasChildren && (
        <div className="mt-0.5 space-y-0.5">
          {children.map((c, i) => (
            <DocumentTree key={(c.id as string) ?? i} node={c} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
};
