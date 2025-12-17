import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, Paperclip, X } from "lucide-react";

interface ChatInputProps {
  onSendMessage: (message: string, files?: File[]) => void;
  disabled?: boolean;
}

export const ChatInput = ({ onSendMessage, disabled }: ChatInputProps) => {
  const [message, setMessage] = useState("");
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setSelectedFiles((prev) => [...prev, ...files]);
  };

  const removeFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim() && !disabled) {
      onSendMessage(message, selectedFiles.length > 0 ? selectedFiles : undefined);
      setMessage("");
      setSelectedFiles([]);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="border-t bg-card p-4">
      {selectedFiles.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-2">
          {selectedFiles.map((file, index) => (
            <div
              key={index}
              className="flex items-center gap-2 rounded-lg border bg-muted px-3 py-2"
            >
              {file.type.startsWith("image/") ? (
                <img
                  src={URL.createObjectURL(file)}
                  alt={file.name}
                  className="h-8 w-8 rounded object-cover"
                />
              ) : (
                <div className="flex h-8 w-8 items-center justify-center rounded bg-primary/10">
                  <Paperclip className="h-4 w-4 text-primary" />
                </div>
              )}
              <span className="text-xs text-foreground">{file.name}</span>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => removeFile(index)}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          ))}
        </div>
      )}
      <div className="flex gap-4">
        <div className="flex flex-1 gap-2">
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*,.pdf,.doc,.docx,.txt"
            className="hidden"
            onChange={handleFileSelect}
          />
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-[60px] w-[60px] shrink-0"
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled}
          >
            <Paperclip className="h-5 w-5" />
          </Button>
          <Textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type your message here..."
            className="min-h-[60px] resize-none"
            disabled={disabled}
          />
        </div>
        <Button
          type="submit"
          size="icon"
          disabled={!message.trim() || disabled}
          className="h-[60px] w-[60px] shrink-0 rounded-sm bg-[hsl(30,50%,40%)] hover:bg-[hsl(30,50%,35%)] text-white"
        >
          <Send className="h-5 w-5" />
        </Button>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        Press Enter to send, Shift + Enter for new line
      </p>
    </form>
  );
};
