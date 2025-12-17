type Message = { role: "user" | "assistant"; content: string | any[] };

// Helper to convert file to base64
async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;
      // Remove data URL prefix to get just the base64 string
      const base64Data = base64.split(',')[1];
      resolve(base64Data);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export async function streamChat({
  messages,
  files,
  onDelta,
  onDone,
  onError,
}: {
  messages: Message[];
  files?: File[];
  onDelta: (deltaText: string) => void;
  onDone: () => void;
  onError: (error: string) => void;
}) {
  // Process files if provided
  const fileContents: any[] = [];
  
  if (files && files.length > 0) {
    for (const file of files) {
      try {
        const mimeType = file.type || 'application/octet-stream';
        
        // Handle images
        if (mimeType.startsWith('image/')) {
          const base64 = await fileToBase64(file);
          fileContents.push({
            type: "image_url",
            image_url: {
              url: `data:${mimeType};base64,${base64}`
            }
          });
        }
        // Handle PDFs
        else if (mimeType === 'application/pdf') {
          const base64 = await fileToBase64(file);
          fileContents.push({
            type: "text",
            text: `[PDF Document: ${file.name}]\nNote: This is a PDF file. Please analyze its content.`
          });
          // Also include as data URL for potential AI processing
          fileContents.push({
            type: "image_url",
            image_url: {
              url: `data:${mimeType};base64,${base64}`
            }
          });
        }
        // Handle text-based files
        else if (
          mimeType.startsWith('text/') ||
          mimeType === 'application/json' ||
          mimeType === 'application/xml' ||
          file.name.endsWith('.md') ||
          file.name.endsWith('.txt') ||
          file.name.endsWith('.csv') ||
          file.name.endsWith('.log')
        ) {
          const text = await file.text();
          fileContents.push({
            type: "text",
            text: `\n\n--- Document: ${file.name} ---\n${text}\n--- End of ${file.name} ---\n`
          });
        }
        // Handle other document types (Word, Excel, etc.)
        else {
          const base64 = await fileToBase64(file);
          fileContents.push({
            type: "text",
            text: `[Document: ${file.name} (${mimeType})]\nThis document has been uploaded. Please analyze its content if possible.`
          });
        }
      } catch (error) {
        console.error(`Error reading file ${file.name}:`, error);
        fileContents.push({
          type: "text",
          text: `[Error reading file: ${file.name}]`
        });
      }
    }
  }

  // Add files to the last user message if present
  const processedMessages = fileContents.length > 0
    ? messages.map((msg, idx) => {
        if (idx === messages.length - 1 && msg.role === "user") {
          // Create multimodal content array
          return {
            ...msg,
            content: [
              { type: "text", text: msg.content as string },
              ...fileContents
            ]
          };
        }
        return msg;
      })
    : messages;

  const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat`;

  try {
    const resp = await fetch(CHAT_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
      },
      body: JSON.stringify({ messages: processedMessages }),
    });

    if (!resp.ok) {
      const errorData = await resp.json().catch(() => ({ error: "Network error" }));
      
      if (resp.status === 429) {
        onError("Rate limit exceeded. Please wait a moment and try again.");
        return;
      }
      
      if (resp.status === 402) {
        onError("AI credits exhausted. Please add credits to continue using this feature.");
        return;
      }
      
      onError(errorData.error || `Request failed with status ${resp.status}`);
      return;
    }

    if (!resp.body) {
      onError("No response body received");
      return;
    }

    const reader = resp.body.getReader();
    const decoder = new TextDecoder();
    let textBuffer = "";
    let streamDone = false;

    while (!streamDone) {
      const { done, value } = await reader.read();
      if (done) break;
      
      textBuffer += decoder.decode(value, { stream: true });

      let newlineIndex: number;
      while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
        let line = textBuffer.slice(0, newlineIndex);
        textBuffer = textBuffer.slice(newlineIndex + 1);

        if (line.endsWith("\r")) line = line.slice(0, -1);
        if (line.startsWith(":") || line.trim() === "") continue;
        if (!line.startsWith("data: ")) continue;

        const jsonStr = line.slice(6).trim();
        if (jsonStr === "[DONE]") {
          streamDone = true;
          break;
        }

        try {
          const parsed = JSON.parse(jsonStr);
          const content = parsed.choices?.[0]?.delta?.content as string | undefined;
          if (content) onDelta(content);
        } catch {
          textBuffer = line + "\n" + textBuffer;
          break;
        }
      }
    }

    // Final flush
    if (textBuffer.trim()) {
      for (let raw of textBuffer.split("\n")) {
        if (!raw || raw.startsWith(":")) continue;
        if (!raw.startsWith("data: ")) continue;
        
        const jsonStr = raw.slice(6).trim();
        if (jsonStr === "[DONE]") continue;
        
        try {
          const parsed = JSON.parse(jsonStr);
          const content = parsed.choices?.[0]?.delta?.content as string | undefined;
          if (content) onDelta(content);
        } catch {
          // Ignore partial leftovers
        }
      }
    }

    onDone();
  } catch (error) {
    console.error("Stream error:", error);
    onError(error instanceof Error ? error.message : "Failed to connect to AI service");
  }
}
