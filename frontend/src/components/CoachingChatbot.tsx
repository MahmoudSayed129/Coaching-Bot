import React, { useState, useRef, useEffect } from "react";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { MessageCircle, Send, AlertCircle, Mic, MicOff, X, Paperclip, FileText, Phone } from "lucide-react";
import { ApiResponse, ChatMessage, CoachingAnswer } from "@/types/api";
import TypingIndicator from "./TypingIndicator";
import ChatMessageComponent from "./ChatMessage";
import VoiceChatOverlay from "./VoiceChatOverlay";
import logo from "@/assets/logo.png";
import * as pdfjsLib from 'pdfjs-dist';

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

  // Configure PDF.js worker
  useEffect(() => {
    pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;
  }, []);
  const [isRecording, setIsRecording] = useState(false);
  const [voiceLanguage, setVoiceLanguage] = useState<'en-US' | 'de-DE'>('en-US');
  const [pdfContent, setPdfContent] = useState<string>("");
  const [pdfFileName, setPdfFileName] = useState<string>("");
  const [showVoiceChat, setShowVoiceChat] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    
    if (!message.trim() && !pdfContent) {
      return;
    }

    // Combine message with PDF content if available
    let fullMessage = message.trim();
    if (pdfContent) {
      fullMessage = `${message.trim()}\n\n[PDF Content from "${pdfFileName}"]\n${pdfContent}`;
    }

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      text: pdfFileName ? `${message.trim()} [PDF: ${pdfFileName}]` : message.trim(),
      isUser: true,
      timestamp: new Date(),
    };

    setChatHistory(prev => [...prev, userMessage]);
    setMessage("");
    setPdfContent("");
    setPdfFileName("");
    setIsLoading(true);
    setError(null);

    try {
      const response = await axios.post<ApiResponse>(
        "https://mahmous-chatbot3.hf.space/ask",
        { question: fullMessage },
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
        return;
      }

      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = voiceLanguage;
      
      recognition.onstart = () => {
        setIsRecording(true);
      };

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setMessage(transcript);
      };

      recognition.onerror = (event: any) => {
        setIsRecording(false);
      };

      recognition.onend = () => {
        setIsRecording(false);
      };

      recognition.start();
    } catch (err) {
      console.error("Microphone error:", err);
    }
  };

  const stopRecording = () => {
    setIsRecording(false);
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (file.type !== 'application/pdf') {
      setError('Please upload a PDF file');
      return;
    }

    // Validate file size (25MB)
    const maxSize = 25 * 1024 * 1024;
    if (file.size > maxSize) {
      setError('PDF file size must be less than 25MB');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const arrayBuffer = await file.arrayBuffer();
      
      // Configure PDF.js to handle various PDF types
      const loadingTask = pdfjsLib.getDocument({
        data: arrayBuffer,
        useSystemFonts: true,
        verbosity: 0
      });
      
      const pdf = await loadingTask.promise;
      let fullText = '';

      // Extract text from all pages
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items
          .map((item: any) => item.str)
          .join(' ');
        fullText += pageText + '\n';
      }

      if (fullText.trim().length === 0) {
        setError('PDF appears to be empty or contains only images. Please use a text-based PDF.');
        return;
      }

      setPdfContent(fullText);
      setPdfFileName(file.name);
      
    } catch (err) {
      console.error('PDF parsing error:', err);
      setError('Failed to parse PDF file. The file may be corrupted, password-protected, or in an unsupported format.');
    } finally {
      setIsLoading(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const removePdf = () => {
    setPdfContent("");
    setPdfFileName("");
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
                title="Start Voice Chat"
              >
                <Phone className="h-5 w-5" />
              </Button>
            </div>
            <p className="text-muted-foreground text-sm">
              Your personal development companion powered by AI
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
              {pdfFileName && (
                <div className="mb-3 p-3 bg-muted/50 rounded-lg border border-border">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-primary" />
                      <span className="text-sm font-medium">{pdfFileName}</span>
                      <span className="text-xs text-muted-foreground">({Math.round(pdfContent.length / 1024)}KB)</span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={removePdf}
                      className="h-6 w-6 p-0"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
              <form onSubmit={handleSubmit} className="flex gap-2 items-end">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="application/pdf"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <Textarea
                  ref={textareaRef}
                  value={message}
                  onChange={handleInputChange}
                  onKeyDown={handleKeyPress}
                  placeholder="Type your message or upload a PDF..."
                  className="flex-1 min-h-[44px] max-h-32 resize-none bg-background"
                  disabled={isLoading}
                  rows={1}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isLoading}
                  className="h-11 w-11 p-0"
                  title="Upload PDF (max 25MB)"
                >
                  <Paperclip className="h-5 w-5" />
                </Button>
                <div className="flex gap-1">
                  <select
                    value={voiceLanguage}
                    onChange={(e) => setVoiceLanguage(e.target.value as 'en-US' | 'de-DE')}
                    disabled={isLoading || isRecording}
                    className="h-11 px-2 rounded-md border border-input bg-background text-xs"
                    title="Select voice input language"
                  >
                    <option value="en-US">EN</option>
                    <option value="de-DE">DE</option>
                  </select>
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
                </div>
                <Button
                  type="submit"
                  disabled={isLoading || (!message.trim() && !pdfContent)}
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