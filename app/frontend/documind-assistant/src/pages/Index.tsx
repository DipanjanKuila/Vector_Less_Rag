import { useCallback, useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import {
  Send,
  Bot,
  User,
  Network,
  RefreshCw,
  FileText,
  Loader2,
  MessageSquare,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  askQuestion,
  getDocumentTree,
  listDocuments,
  type DocumentItem,
  type TreeNode,
} from "@/lib/api";
import { DocumentUpload } from "@/components/DocumentUpload";
import { DocumentTree } from "@/components/DocumentTree";
import { ApiSettings } from "@/components/ApiSettings";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  node_ids?: string[];
}

const Index = () => {
  const [docs, setDocs] = useState<DocumentItem[]>([]);
  const [loadingDocs, setLoadingDocs] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<string>("");
  const [question, setQuestion] = useState("");
  const [asking, setAsking] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [tree, setTree] = useState<TreeNode | null>(null);
  const [treeOpen, setTreeOpen] = useState(false);
  const [treeLoading, setTreeLoading] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);

  const refreshDocs = useCallback(async () => {
    setLoadingDocs(true);
    try {
      const list = await listDocuments();
      setDocs(list);
      if (list.length > 0 && !list.find((d) => d.id === selectedDoc)) {
        setSelectedDoc(list[0].id);
      }
    } catch (e) {
      toast.error(`Could not load documents: ${(e as Error).message}`);
    } finally {
      setLoadingDocs(false);
    }
  }, [selectedDoc]);

  useEffect(() => {
    refreshDocs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, asking]);

  const handleAsk = async () => {
    const q = question.trim();
    if (!q) return;
    if (!selectedDoc) {
      toast.error("Select a document first");
      return;
    }
    const userMsg: ChatMessage = { id: crypto.randomUUID(), role: "user", content: q };
    setMessages((m) => [...m, userMsg]);
    setQuestion("");
    setAsking(true);
    try {
      const res = await askQuestion(selectedDoc, q);
      setMessages((m) => [
        ...m,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: res.answer || "_No answer returned._",
          node_ids: res.node_ids as string[] | undefined,
        },
      ]);
    } catch (e) {
      setMessages((m) => [
        ...m,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: `⚠️ **Error:** ${(e as Error).message}`,
        },
      ]);
    } finally {
      setAsking(false);
    }
  };

  const handleViewTree = async () => {
    if (!selectedDoc) {
      toast.error("Select a document first");
      return;
    }
    setTreeOpen(true);
    setTreeLoading(true);
    setTree(null);
    try {
      const t = await getDocumentTree(selectedDoc);
      setTree(t);
    } catch (e) {
      toast.error(`Could not load tree: ${(e as Error).message}`);
    } finally {
      setTreeLoading(false);
    }
  };

  const selectedDocName = docs.find((d) => d.id === selectedDoc)?.name;

  return (
    <main className="min-h-screen bg-surface">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-border bg-background">
        <div className="container flex h-14 items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary">
              <MessageSquare className="h-4 w-4 text-primary-foreground" />
            </div>
            <div className="leading-tight">
              <h1 className="text-sm font-semibold text-foreground">Vectorless RAG</h1>
              <p className="text-[11px] text-muted-foreground">Document Q&amp;A</p>
            </div>
          </div>
          <ApiSettings onChange={refreshDocs} />
        </div>
      </header>

      <section className="container grid gap-5 py-6 lg:grid-cols-[340px_1fr]">
        {/* Left: Upload + select */}
        <aside className="space-y-5">
          <div className="rounded-lg border border-border bg-card p-4 shadow-sm">
            <div className="mb-3">
              <h3 className="text-sm font-semibold text-foreground">Upload document</h3>
              <p className="text-xs text-muted-foreground">Add a PDF to your library</p>
            </div>
            <DocumentUpload onUploaded={refreshDocs} />
          </div>

          <div className="rounded-lg border border-border bg-card p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-foreground">Select document</h3>
                <p className="text-xs text-muted-foreground">
                  {docs.length} {docs.length === 1 ? "document" : "documents"} available
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-foreground"
                onClick={refreshDocs}
                disabled={loadingDocs}
                aria-label="Refresh documents"
              >
                <RefreshCw className={cn("h-4 w-4", loadingDocs && "animate-spin")} />
              </Button>
            </div>

            <Select value={selectedDoc} onValueChange={setSelectedDoc}>
              <SelectTrigger>
                <SelectValue placeholder={loadingDocs ? "Loading…" : "Choose a document"} />
              </SelectTrigger>
              <SelectContent>
                {docs.length === 0 && (
                  <div className="px-2 py-3 text-center text-xs text-muted-foreground">
                    No documents yet
                  </div>
                )}
                {docs.map((d) => (
                  <SelectItem key={d.id} value={d.id}>
                    <span className="flex items-center gap-2">
                      <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="max-w-[220px] truncate">{d.name}</span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button
              onClick={handleViewTree}
              disabled={!selectedDoc}
              variant="outline"
              className="mt-3 w-full gap-2"
            >
              <Network className="h-4 w-4" />
              View document tree
            </Button>
          </div>
        </aside>

        {/* Right: chat */}
        <div className="flex min-h-[600px] flex-col rounded-lg border border-border bg-card shadow-sm">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-md bg-accent">
                <Bot className="h-4 w-4 text-primary" />
              </div>
              <div className="leading-tight">
                <p className="text-sm font-semibold text-foreground">Ask a question</p>
                <p className="truncate text-xs text-muted-foreground">
                  {selectedDocName ? `Context: ${selectedDocName}` : "No document selected"}
                </p>
              </div>
            </div>
            {messages.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="text-xs text-muted-foreground hover:text-foreground"
                onClick={() => setMessages([])}
              >
                Clear chat
              </Button>
            )}
          </div>

          <ScrollArea className="flex-1">
            <div ref={scrollRef} className="space-y-4 px-4 py-5">
              {messages.length === 0 && !asking && (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-accent">
                    <MessageSquare className="h-5 w-5 text-primary" />
                  </div>
                  <p className="mt-4 text-sm font-medium text-foreground">
                    Start the conversation
                  </p>
                  <p className="mt-1 max-w-sm text-xs text-muted-foreground">
                    Try: <em>"Summarize the main points"</em> or{" "}
                    <em>"What does section 3 say about pricing?"</em>
                  </p>
                </div>
              )}

              {messages.map((m) => (
                <Message key={m.id} message={m} />
              ))}

              {asking && (
                <div className="flex items-start gap-3 animate-fade-in-up">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-accent">
                    <Bot className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex items-center gap-1.5 rounded-lg border border-border bg-background px-3.5 py-2.5 shadow-xs">
                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-muted-foreground [animation-delay:0ms]" />
                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-muted-foreground [animation-delay:150ms]" />
                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-muted-foreground [animation-delay:300ms]" />
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>

          <div className="border-t border-border bg-surface px-4 py-3">
            <div className="flex items-end gap-2">
              <Textarea
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleAsk();
                  }
                }}
                placeholder={
                  selectedDoc
                    ? "Ask anything about the document…"
                    : "Select a document first"
                }
                disabled={!selectedDoc || asking}
                className="min-h-[44px] max-h-40 resize-none bg-background"
              />
              <Button
                onClick={handleAsk}
                disabled={!selectedDoc || asking || !question.trim()}
                className="h-[44px] gap-2 px-4"
              >
                {asking ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                <span className="hidden sm:inline">Send</span>
              </Button>
            </div>
            <p className="mt-2 text-[11px] text-muted-foreground">
              Press <kbd className="rounded border border-border bg-background px-1 py-0.5 font-mono text-[10px]">Enter</kbd> to send,{" "}
              <kbd className="rounded border border-border bg-background px-1 py-0.5 font-mono text-[10px]">Shift+Enter</kbd> for newline
            </p>
          </div>
        </div>
      </section>

      {/* Tree drawer */}
      <Sheet open={treeOpen} onOpenChange={setTreeOpen}>
        <SheetContent side="right" className="w-full sm:max-w-xl">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <Network className="h-5 w-5 text-primary" />
              Document tree
            </SheetTitle>
            <SheetDescription>
              {selectedDocName ? `Hierarchical structure of "${selectedDocName}"` : "Document structure"}
            </SheetDescription>
          </SheetHeader>

          <ScrollArea className="mt-4 h-[calc(100vh-120px)] pr-3 scrollbar-thin">
            {treeLoading && (
              <div className="flex items-center justify-center py-20 text-sm text-muted-foreground">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Loading tree…
              </div>
            )}
            {!treeLoading && tree && <DocumentTree node={tree} />}
            {!treeLoading && !tree && (
              <p className="py-10 text-center text-sm text-muted-foreground">No tree data</p>
            )}
          </ScrollArea>
        </SheetContent>
      </Sheet>
    </main>
  );
};

const Message = ({ message }: { message: ChatMessage }) => {
  const isUser = message.role === "user";
  return (
    <div
      className={cn(
        "flex items-start gap-3 animate-fade-in-up",
        isUser && "flex-row-reverse"
      )}
    >
      <div
        className={cn(
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-md",
          isUser ? "bg-primary" : "bg-accent"
        )}
      >
        {isUser ? (
          <User className="h-4 w-4 text-primary-foreground" />
        ) : (
          <Bot className="h-4 w-4 text-primary" />
        )}
      </div>
      <div
        className={cn(
          "max-w-[85%] rounded-lg px-3.5 py-2.5 text-sm leading-relaxed shadow-xs",
          isUser
            ? "bg-primary text-primary-foreground"
            : "border border-border bg-background text-foreground"
        )}
      >
        {isUser ? (
          <p className="whitespace-pre-wrap">{message.content}</p>
        ) : (
          <>
            <div className="prose prose-sm max-w-none prose-p:my-2 prose-headings:text-foreground prose-p:text-foreground prose-strong:text-foreground prose-code:text-primary prose-code:before:content-none prose-code:after:content-none">
              <ReactMarkdown>{message.content}</ReactMarkdown>
            </div>
            {message.node_ids && message.node_ids.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1 border-t border-border pt-2">
                <span className="text-[11px] text-muted-foreground mr-1">Sources:</span>
                {message.node_ids.map((id) => (
                  <span
                    key={id}
                    className="rounded border border-border bg-secondary px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground"
                  >
                    {id}
                  </span>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default Index;
