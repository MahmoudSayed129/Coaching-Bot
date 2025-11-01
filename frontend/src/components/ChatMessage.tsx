import { ChatMessage as ChatMessageType } from "@/types/api";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Bot, User } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface ChatMessageProps {
  message: ChatMessageType;
}

const ChatMessage = ({ message }: ChatMessageProps) => {
  return (
    <div className={`mb-4 animate-in fade-in-0 slide-in-from-bottom-2 flex ${message.isUser ? 'justify-end' : 'justify-start'}`}>
      <div className={`flex items-start gap-3 max-w-[85%] ${message.isUser ? 'flex-row-reverse' : 'flex-row'}`}>
        <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
          message.isUser ? 'bg-primary' : 'bg-secondary'
        }`}>
          {message.isUser ? (
            <User className="w-5 h-5 text-primary-foreground" />
          ) : (
            <Bot className="w-5 h-5 text-secondary-foreground" />
          )}
        </div>
        
        <div className="flex flex-col space-y-2">
          <Card className={`${
            message.isUser 
              ? 'bg-primary text-primary-foreground' 
              : 'bg-muted'
          }`}>
            <div className="px-4 py-3">
              {message.isUser ? (
                <p className="text-sm whitespace-pre-wrap break-words">{message.text}</p>
              ) : (
                <div className="text-sm prose prose-sm dark:prose-invert max-w-none prose-p:leading-relaxed prose-pre:bg-muted-foreground/10 prose-pre:text-foreground prose-code:text-foreground">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {message.text}
                  </ReactMarkdown>
                </div>
              )}
            </div>
          </Card>
          
          <div className="flex items-center gap-2 px-1">
            <span className="text-xs text-muted-foreground">
              {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatMessage;