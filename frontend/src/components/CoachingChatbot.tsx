import React, { useState, useRef, useEffect } from "react";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { MessageCircle, Send, AlertCircle, Mic, MicOff, X } from "lucide-react";
import { ApiResponse, ChatMessage, CoachingAnswer } from "@/types/api";
import { useToast } from "@/hooks/use-toast";
import TypingIndicator from "./TypingIndicator";
import ChatMessageComponent from "./ChatMessage";
import logo from "@/assets/logo.png";

const CoachingChatbot = () => {
  const [message, setMessage] = useState("");
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([
    {
      id: "welcome",
      text: "Hi! I'm your personal coach. Ask me anything about personal development, goal setting, motivation, or any challenges you're facing. How can I help you today?",
      isUser: false,
      timestamp: new Date(),
    }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [transcribedText, setTranscribedText] = useState("");
  const [showTranscription, setShowTranscription] = useState(false);
  const { toast } = useToast();
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!message.trim()) {
      toast({
        variant: "destructive",
        title: "Please enter a message",
        description: "Type your question or message to continue the conversation.",
      });
      return;
    }

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
        { question: userMessage.text },
        {
          headers: {
            "Content-Type": "application/json",
          },
          timeout: 30000,
        }
      );

      if (response.data?.answers && Array.isArray(response.data.answers)) {
        // Create bot responses from the answers
        const botMessages: ChatMessage[] = response.data.answers.map((answer: CoachingAnswer, index: number) => ({
          id: `${Date.now()}-${index}`,
          text: answer.answer,
          isUser: false,
          timestamp: new Date(),
          source: answer.source,
          score: answer.bm25_score,
        }));

        setChatHistory(prev => [...prev, ...botMessages]);
        
        toast({
          title: "Got your coaching insights!",
          description: `Received ${response.data.answers.length} helpful response(s).`,
        });
      } else {
        throw new Error("Invalid response format");
      }
    } catch (err) {
      let errorMessage = "Sorry, I couldn't process your message. Please try again.";
      
      if (axios.isAxiosError(err)) {
        if (err.code === "ECONNABORTED") {
          errorMessage = "The request timed out. Please try again.";
        } else if (err.response) {
          errorMessage = `Server error: ${err.response.status}`;
        } else if (err.request) {
          errorMessage = "Cannot connect to the coaching service. Please check your connection.";
        }
      }
      
      setError(errorMessage);
      toast({
        variant: "destructive",
        title: "Error",
        description: errorMessage,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value);
    if (error) setError(null);
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e as any);
    }
  };

  const startRecording = () => {
    try {
      // Check if browser supports Web Speech API
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      
      if (!SpeechRecognition) {
        toast({
          variant: "destructive",
          title: "Not supported",
          description: "Speech recognition is not supported in your browser.",
        });
        return;
      }

      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      
      // Support both English and German
      recognition.lang = 'en-US'; // Default to English, will auto-detect
      
      recognition.onstart = () => {
        setIsRecording(true);
        toast({
          title: "Recording started",
          description: "Speak now in English or German...",
        });
      };

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setTranscribedText(transcript);
        setMessage(transcript);
        setShowTranscription(true);
        toast({
          title: "Transcription ready",
          description: "You can edit the text before sending.",
        });
      };

      recognition.onerror = (event: any) => {
        setIsRecording(false);
        toast({
          variant: "destructive",
          title: "Transcription error",
          description: "Could not transcribe audio. Please try again.",
        });
      };

      recognition.onend = () => {
        setIsRecording(false);
      };

      recognition.start();
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Microphone access denied",
        description: "Please allow microphone access to use voice input.",
      });
    }
  };

  const stopRecording = () => {
    setIsRecording(false);
  };

  const cancelTranscription = () => {
    setTranscribedText("");
    setMessage("");
    setShowTranscription(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <div className="container mx-auto px-4 py-6 max-w-4xl h-screen flex flex-col">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="flex items-center justify-center mb-3">
            <img src={logo} alt="J&P Mentoring" className="h-16 md:h-20" />
          </div>
          <p className="text-muted-foreground text-sm">
            Your personal development companion powered by AI
          </p>
        </div>

        {/* Chat Area */}
        <Card className="flex-1 shadow-lg border-border/50 backdrop-blur mb-4 flex flex-col">
          <CardContent className="p-0 flex-1 flex flex-col">
            <ScrollArea className="flex-1 p-4" ref={scrollAreaRef}>
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
              {showTranscription && (
                <div className="mb-3 p-3 bg-muted/50 rounded-lg border border-border">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-muted-foreground">Transcribed text (editable)</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={cancelTranscription}
                      className="h-6 w-6 p-0"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
              <form onSubmit={handleSubmit} className="flex gap-2 items-end">
                <Textarea
                  ref={textareaRef}
                  value={message}
                  onChange={handleInputChange}
                  onKeyDown={handleKeyPress}
                  placeholder="Type your message or use voice input..."
                  className="flex-1 min-h-[44px] max-h-32 resize-none bg-background"
                  disabled={isLoading}
                  rows={1}
                />
                <Button
                  type="button"
                  variant={isRecording ? "destructive" : "outline"}
                  onClick={isRecording ? stopRecording : startRecording}
                  disabled={isLoading}
                  className="h-11 w-11 p-0"
                  title={isRecording ? "Stop recording" : "Start voice input"}
                >
                  {isRecording ? (
                    <MicOff className="h-5 w-5" />
                  ) : (
                    <Mic className="h-5 w-5" />
                  )}
                </Button>
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
  );
};

export default CoachingChatbot;
