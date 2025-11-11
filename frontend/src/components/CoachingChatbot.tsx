import React, { useState, useRef, useEffect } from "react";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Send, AlertCircle, Mic, MicOff, Phone } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ApiResponse, ChatMessage, CoachingAnswer } from "@/types/api";
import TypingIndicator from "./TypingIndicator";
import ChatMessageComponent from "./ChatMessage";
import VoiceChatOverlay from "./VoiceChatOverlay";
import logo from "@/assets/logo.png";

const CoachingChatbot = () => {
  const [message, setMessage] = useState("");
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([
    {
      id: "welcome",
      text: "Hallo, ich bin Javid von J&P Mentoring. Schön, dass du hier bist! Lass uns über dein Business, dessen Skalierung oder deine nächsten Ziele sprechen – ich helfe dir, den nächsten Schritt zu machen.",
      isUser: false,
      timestamp: new Date(),
    }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [isRecording, setIsRecording] = useState(false);
  const [voiceLanguage, setVoiceLanguage] = useState<'en-US' | 'de-DE'>('de-DE'); // Default to Deutsch
  const [showVoiceChat, setShowVoiceChat] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    if (scrollAreaRef.current) {
      const scrollElement = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollElement) {
        scrollElement.scrollTop = scrollElement.scrollHeight;
      }
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [chatHistory]);

  const detectLanguage = (text: string): 'en' | 'de' => {
    const germanPatterns = /\b(ich|du|er|sie|es|wir|ihr|und|oder|aber|der|die|das|ist|sind|haben|sein|werden|können|müssen|sollen|möchte|würde|über|für|mit|nach|von|bei|zu|auf|in|aus)\b/i;
    const germanChars = /[äöüßÄÖÜ]/;
    return germanPatterns.test(text) || germanChars.test(text) ? 'de' : 'en';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;

    const userLanguage = detectLanguage(message.trim());
    const languageInstruction = userLanguage === 'de' ? ' (Bitte antworte auf Deutsch)' : ' (Please reply in English)';
    const fullMessage = message.trim() + languageInstruction;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      text: message.trim(),
      isUser: true,
      timestamp: new Date(),
    };

    setChatHistory(prev => [...prev, userMessage]);
    setMessage("");
    setIsLoading(true);
    setError(null);

    try {
      const response = await axios.post<ApiResponse>(
        "https://mahmous-chatbot3.hf.space/ask",
        { question: fullMessage },
        {
          headers: { "Content-Type": "application/json" },
          timeout: 30000,
        }
      );

      if (response.data?.answers && Array.isArray(response.data.answers)) {
        const botMessages: ChatMessage[] = response.data.answers.map((answer: CoachingAnswer, index: number) => ({
          id: `${Date.now()}-${index}`,
          text: answer.answer,
          isUser: false,
          timestamp: new Date(),
          source: answer.source,
          score: answer.bm25_score,
        }));

        setChatHistory(prev => [...prev, ...botMessages]);
      } else {
        throw new Error("Invalid response format");
      }
    } catch (err) {
      let errorMessage = "Entschuldigung, ich konnte deine Nachricht nicht verarbeiten. Bitte versuche es erneut.";

      if (axios.isAxiosError(err)) {
        if (err.code === "ECONNABORTED") {
          errorMessage = "Die Anfrage hat zu lange gedauert. Bitte versuche es erneut.";
        } else if (err.response) {
          errorMessage = `Serverfehler: ${err.response.status}`;
        } else if (err.request) {
          errorMessage = "Verbindung zum Coaching-Service nicht möglich. Bitte überprüfe deine Internetverbindung.";
        }
      }
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value);
    if (error) setError(null);
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e as any);
    }
  };

  const startRecording = () => {
    try {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (!SpeechRecognition) return;

      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = voiceLanguage;

      recognition.onstart = () => setIsRecording(true);
      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setMessage(transcript);
      };
      recognition.onerror = () => setIsRecording(false);
      recognition.onend = () => setIsRecording(false);
      recognition.start();
    } catch (err) {
      console.error("Microphone error:", err);
    }
  };

  const stopRecording = () => {
    setIsRecording(false);
  };

  return (
    <>
      {showVoiceChat && <VoiceChatOverlay onClose={() => setShowVoiceChat(false)} />}

      <div className="h-screen bg-gradient-to-br from-background via-background to-muted/20 flex flex-col">
        <div className="container mx-auto px-4 py-6 max-w-4xl flex-1 flex flex-col min-h-0">

          {/* Header */}
          <div className="text-center mb-4 flex-shrink-0">
            <div className="flex items-center justify-center gap-4 mb-2">
              <img src={logo} alt="J&P Mentoring" className="h-16 md:h-20" />
              <Button
                onClick={() => setShowVoiceChat(true)}
                className="rounded-full w-12 h-12 shadow-lg"
                title="Voice Chat"
              >
                <Phone className="h-5 w-5" />
              </Button>
            </div>
            <p className="text-muted-foreground text-sm">
              Dein persönlicher Mentoring-Begleiter, unterstützt durch KI
            </p>
          </div>

          {/* Chat Area */}
          <Card className="flex-1 shadow-lg border-border/50 backdrop-blur flex flex-col overflow-hidden">
            <CardContent className="p-0 flex-1 flex flex-col overflow-hidden">
              <ScrollArea className="flex-1 p-4 h-full" ref={scrollAreaRef}>
                <div className="space-y-2">
                  {chatHistory.map((msg) => (
                    <ChatMessageComponent key={msg.id} message={msg} />
                  ))}
                  {isLoading && <TypingIndicator />}
                </div>
              </ScrollArea>

              {/* Error Display */}
              {error && (
                <div className="p-4 border-t">
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                </div>
              )}

              {/* Input Area */}
              <div className="p-4 border-t bg-background/50 backdrop-blur">
                <form onSubmit={handleSubmit} className="flex gap-2 items-end">
                  <Textarea
                    ref={textareaRef}
                    value={message}
                    onChange={handleInputChange}
                    onKeyDown={handleKeyPress}
                    placeholder="Schreibe deine Nachricht..."
                    className="flex-1 min-h-[44px] max-h-32 resize-none bg-background"
                    disabled={isLoading}
                    rows={1}
                  />
                  <div className="flex gap-2 items-center h-11">
                    {/* Hidden language select, kept for future use */}
                    <div className="hidden">
                      <Select
                        value={voiceLanguage}
                        onValueChange={(value) => setVoiceLanguage(value as 'en-US' | 'de-DE')}
                        disabled={isLoading || isRecording}
                      >
                        <SelectTrigger className="w-[85px] h-11 bg-background border-input">
                          <Mic className="h-4 w-4 mr-1 text-muted-foreground" />
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-popover z-50">
                          <SelectItem value="en-US">English</SelectItem>
                          <SelectItem value="de-DE">Deutsch</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <Button
                      type="button"
                      variant={isRecording ? "destructive" : "outline"}
                      onClick={isRecording ? stopRecording : startRecording}
                      disabled={isLoading}
                      className="h-11 w-11 p-0"
                      title={isRecording ? "Aufnahme stoppen" : "Spracheingabe starten"}
                    >
                      {isRecording ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
                    </Button>
                  </div>
                  <Button
                    type="submit"
                    disabled={isLoading || !message.trim()}
                    className="h-11 px-6 shadow-sm"
                  >
                    {isLoading ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                  </Button>
                </form>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
};

export default CoachingChatbot;
