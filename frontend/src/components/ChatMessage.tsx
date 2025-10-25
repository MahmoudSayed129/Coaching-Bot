import { ChatMessage as ChatMessageType } from "@/types/api";
import { Badge } from "@/components/ui/badge";

interface ChatMessageProps {
  message: ChatMessageType;
}

const ChatMessage = ({ message }: ChatMessageProps) => {
  return (
    <div className={`flex ${message.isUser ? 'justify-end' : 'justify-start'} mb-4`}>
      <div 
        className={`max-w-[80%] rounded-2xl px-4 py-3 ${
          message.isUser 
            ? 'bg-primary text-primary-foreground ml-12' 
            : 'bg-muted mr-12'
        }`}
      >
        <p className="text-sm leading-relaxed whitespace-pre-wrap">
          {message.text}
        </p>
        
        {message.source && (
          <div className="flex items-center gap-2 mt-2 pt-2 border-t border-border/30">
            <Badge variant="outline" className="text-xs">
              {message.source}
            </Badge>
            {message.score && (
              <Badge variant="secondary" className="text-xs">
                Score: {message.score.toFixed(2)}
              </Badge>
            )}
          </div>
        )}
        
        <p className="text-xs opacity-70 mt-1">
          {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </p>
      </div>
    </div>
  );
};

export default ChatMessage;