import { useState, useRef, useEffect } from "react";
import { ChatMessage } from "@/components/ChatMessage";
import { ChatInput } from "@/components/ChatInput";
import { TypingIndicator } from "@/components/TypingIndicator";
import { Button } from "@/components/ui/button";
import { Trash2, Volume2, VolumeX } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { streamChat } from "@/utils/streamChat";
import { useVoiceResponse } from "@/hooks/useVoiceResponse";
import atdLogo from "@/assets/atd-logo.jpg";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

const WELCOME_MESSAGE: Message = {
  id: "welcome",
  role: "assistant",
  content: `# Hello! I'm Your AI Assistant 👋

I'm here to provide **intelligent, conversational assistance** tailored to your needs.

## What I Can Do

**💼 Business & Strategy**
- Market analysis and competitive research
- Strategic planning and decision support
- Business plan development

**✍️ Writing & Content**
- Professional documents and reports
- Email composition and editing
- Creative content and copywriting

**🔍 Analysis & Problem-Solving**
- Data interpretation and insights
- Complex problem breakdown
- Critical thinking support

**📋 Planning & Organization**
- Project management guidance
- Workflow optimization
- Goal setting strategies

**💡 Creative Thinking**
- Brainstorming and ideation
- Innovation strategies
- Creative problem-solving

---

**How can I help you today?** Feel free to ask me anything, and I'll provide clear, structured, and actionable responses!`,
};

const Index = () => {
  const [messages, setMessages] = useState<Message[]>([WELCOME_MESSAGE]);
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const { isVoiceEnabled, isSpeaking, speak, toggleVoice } = useVoiceResponse();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const handleSendMessage = async (content: string, files?: File[]) => {
    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content,
    };

    setMessages((prev) => [...prev, userMessage]);
    setIsTyping(true);

    let assistantContent = "";
    
    const updateAssistantMessage = (chunk: string) => {
      assistantContent += chunk;
      setMessages((prev) => {
        const last = prev[prev.length - 1];
        if (last?.role === "assistant") {
          return prev.map((m, i) => 
            i === prev.length - 1 ? { ...m, content: assistantContent } : m
          );
        }
        return [...prev, { 
          id: (Date.now() + 1).toString(), 
          role: "assistant", 
          content: assistantContent 
        }];
      });
    };

    try {
      await streamChat({
        messages: [...messages, userMessage].map(m => ({
          role: m.role,
          content: m.content
        })),
        files,
        onDelta: updateAssistantMessage,
        onDone: () => {
          setIsTyping(false);
          // Speak the complete response if voice is enabled
          if (isVoiceEnabled && assistantContent) {
            speak(assistantContent);
          }
        },
        onError: (error) => {
          console.error("Chat error:", error);
          setIsTyping(false);
          toast({
            title: "Error",
            description: error,
            variant: "destructive",
          });
          // Remove the user message on error
          setMessages((prev) => prev.filter((m) => m.id !== userMessage.id));
        },
      });
    } catch (error) {
      console.error("Unexpected error:", error);
      setIsTyping(false);
      toast({
        title: "Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
      setMessages((prev) => prev.filter((m) => m.id !== userMessage.id));
    }
  };

  const handleClearChat = () => {
    setMessages([WELCOME_MESSAGE]);
    toast({
      title: "Chat cleared",
      description: "Conversation history has been reset.",
    });
  };


  return (
    <div className="flex h-screen flex-col">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <img src={atdLogo} alt="ATD Logo" className="h-12 w-auto object-contain" />
            <div>
              <h1 className="text-lg font-semibold">AI Assistant</h1>
              <p className="text-xs text-muted-foreground">Professional & Powerful</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={toggleVoice}
              className="gap-2"
            >
              {isVoiceEnabled ? (
                <>
                  <Volume2 className="h-4 w-4" />
                  Voice On
                </>
              ) : (
                <>
                  <VolumeX className="h-4 w-4" />
                  Voice Off
                </>
              )}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleClearChat}
              className="gap-2"
            >
              <Trash2 className="h-4 w-4" />
              Clear Chat
            </Button>
          </div>
        </div>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto">
        <div className="container max-w-4xl px-4">
          {messages.map((message) => (
            <ChatMessage key={message.id} {...message} />
          ))}
          {isTyping && <TypingIndicator />}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input */}
      <div className="container max-w-4xl px-4">
        <ChatInput onSendMessage={handleSendMessage} disabled={isTyping} />
      </div>
    </div>
  );
};

export default Index;
