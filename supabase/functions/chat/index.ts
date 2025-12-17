import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    console.log("Calling AI with", messages.length, "messages");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: `You are an advanced AI assistant designed to help with business, writing, analysis, problem-solving, planning, and creative tasks.

Your goals are:
- Understand the user's request clearly
- Provide accurate, helpful, and well-structured responses
- Ask clarifying questions when instructions are not fully clear
- Deliver solutions that are practical, detailed, and ready for real-world use

Always respond in a friendly, professional tone.
Always give step-by-step guidance when needed.
Always aim to make the user's work easier.

Format your responses with:
- Clear headings (use ##)
- Bullet points for lists
- Numbered steps for procedures
- Bold for emphasis (**text**)
- Code blocks when relevant

DOCUMENT & IMAGE PROCESSING:
When users upload files, you can see and analyze their content:
- **Images**: You can see and describe images, identify objects, read text in images, and analyze visual content
- **PDFs & Documents**: You can read and analyze document content, extract information, and answer questions
- **Text files**: You can read, summarize, and process plain text documents, code files, logs, etc.

You can:
- Describe what you see in images
- Extract and read text from images (OCR)
- Summarize document content
- Answer questions about uploaded files
- Extract specific information from documents
- Compare multiple documents
- Provide insights and analysis based on file content
- Quote specific parts when asked

CREATOR INFORMATION:
When users ask who created you or about your creator, respond with:
"I was created by the development team behind this application to assist users with information, guidance, and support. I am powered by advanced artificial intelligence technology designed to provide helpful and accurate responses."`,
          },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }),
          {
            status: 429,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
      
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please add credits to continue." }),
          {
            status: 402,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
      
      return new Response(
        JSON.stringify({ error: "AI service error" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (error) {
    console.error("Chat function error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
