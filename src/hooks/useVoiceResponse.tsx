import { useState, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export const useVoiceResponse = () => {
  const [isVoiceEnabled, setIsVoiceEnabled] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const { toast } = useToast();

  const speak = useCallback(async (text: string) => {
    if (!isVoiceEnabled || !text.trim()) return;

    try {
      setIsSpeaking(true);

      // Call the text-to-speech edge function
      const { data, error } = await supabase.functions.invoke('text-to-speech', {
        body: { text },
      });

      if (error) throw error;

      if (data?.audioContent) {
        // Convert base64 to blob
        const audioBlob = await fetch(
          `data:audio/mpeg;base64,${data.audioContent}`
        ).then(res => res.blob());

        // Create audio URL
        const audioUrl = URL.createObjectURL(audioBlob);

        // Stop any currently playing audio
        if (audioRef.current) {
          audioRef.current.pause();
          audioRef.current = null;
        }

        // Play the new audio
        const audio = new Audio(audioUrl);
        audioRef.current = audio;

        audio.onended = () => {
          setIsSpeaking(false);
          URL.revokeObjectURL(audioUrl);
        };

        audio.onerror = () => {
          setIsSpeaking(false);
          URL.revokeObjectURL(audioUrl);
        };

        await audio.play();
      }
    } catch (error) {
      console.error('Voice response error:', error);
      setIsSpeaking(false);
      toast({
        title: "Voice Error",
        description: "Failed to play voice response",
        variant: "destructive",
      });
    }
  }, [isVoiceEnabled, toast]);

  const stopSpeaking = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    setIsSpeaking(false);
  }, []);

  const toggleVoice = useCallback(() => {
    setIsVoiceEnabled(prev => !prev);
    if (isVoiceEnabled) {
      stopSpeaking();
    }
  }, [isVoiceEnabled, stopSpeaking]);

  return {
    isVoiceEnabled,
    isSpeaking,
    speak,
    stopSpeaking,
    toggleVoice,
  };
};
