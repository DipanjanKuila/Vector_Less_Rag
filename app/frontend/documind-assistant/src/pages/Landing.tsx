import { useNavigate } from "react-router-dom";
import { MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";

const Landing = () => {
  const navigate = useNavigate();

  return (
    <main className="min-h-screen bg-surface flex flex-col items-center justify-center px-4">
      <div className="max-w-2xl w-full flex flex-col items-center text-center gap-8">
        {/* Diagram */}
        <img
          src="/diagram.png"
          alt="Vectorless RAG with PageIndex diagram"
          className="w-full max-w-lg rounded-xl border border-border shadow-md bg-background p-4"
        />

        {/* Text */}
        <div className="space-y-3 text-left">
          <p className="text-base text-foreground leading-relaxed">
            Ever feel like your RAG system just isn't getting it right for long documents?
          </p>
          <p className="text-base text-foreground leading-relaxed">
            That's because most systems rely on vector similarity… but similarity doesn't mean relevance.
          </p>
          <p className="text-base text-foreground leading-relaxed">
            And when you're dealing with complex, professional documents—where understanding requires
            context, structure, and reasoning—traditional vector search starts to break down.
          </p>
          <p className="text-base text-foreground leading-relaxed">
            I built a <span className="font-semibold text-primary">vectorless RAG system</span> using{" "}
            <span className="font-semibold text-primary">PageIndex</span>, designed for reasoning-based retrieval.
          </p>
        </div>

        {/* CTA */}
        <Button
          size="lg"
          className="gap-2 px-8 py-6 text-base"
          onClick={() => navigate("/chat")}
        >
          <MessageSquare className="h-5 w-5" />
          Open Chatbot
        </Button>
      </div>
    </main>
  );
};

export default Landing;
