import { cn } from "@/lib/utils";
import { Bot, User } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface ChatMessageProps {
  role: "user" | "assistant";
  content: string;
}

export const ChatMessage = ({ role, content }: ChatMessageProps) => {
  const isAssistant = role === "assistant";

  return (
    <div
      className={cn(
        "flex gap-4 p-6 animate-fade-in",
        isAssistant ? "bg-ai-message" : ""
      )}
    >
      <div
        className={cn(
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
          isAssistant
            ? "bg-primary text-primary-foreground"
            : "bg-user-message text-primary-foreground"
        )}
      >
        {isAssistant ? <Bot className="h-5 w-5" /> : <User className="h-5 w-5" />}
      </div>
      <div className="flex-1 space-y-2">
        <p className="text-sm font-medium">{isAssistant ? "AI Assistant" : "You"}</p>
        <div className="prose prose-sm max-w-none text-foreground prose-headings:text-foreground prose-strong:text-foreground prose-code:text-foreground prose-pre:bg-muted prose-pre:text-foreground">
          {isAssistant ? (
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {content}
            </ReactMarkdown>
          ) : (
            <p>{content}</p>
          )}
        </div>
      </div>
    </div>
  );
};
