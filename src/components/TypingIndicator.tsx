import { Bot } from "lucide-react";

export const TypingIndicator = () => {
  return (
    <div className="flex gap-4 p-6 bg-ai-message animate-fade-in">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
        <Bot className="h-5 w-5" />
      </div>
      <div className="flex-1 space-y-2">
        <p className="text-sm font-medium">AI Assistant</p>
        <div className="flex gap-1 items-center">
          <div className="h-2 w-2 rounded-full bg-typing-indicator animate-pulse-dot"></div>
          <div className="h-2 w-2 rounded-full bg-typing-indicator animate-pulse-dot" style={{ animationDelay: "0.2s" }}></div>
          <div className="h-2 w-2 rounded-full bg-typing-indicator animate-pulse-dot" style={{ animationDelay: "0.4s" }}></div>
        </div>
      </div>
    </div>
  );
};
