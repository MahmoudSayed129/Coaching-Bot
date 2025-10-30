import { Bot } from "lucide-react";
import { Card } from "@/components/ui/card";

const TypingIndicator = () => {
  return (
    <div className="mb-4 animate-in fade-in-0 slide-in-from-bottom-2 flex justify-start">
      <div className="flex items-start gap-3 max-w-[85%]">
        <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center bg-secondary">
          <Bot className="w-5 h-5 text-secondary-foreground" />
        </div>
        
        <Card className="bg-muted">
          <div className="px-4 py-3 flex items-center gap-1">
            <div className="flex gap-1">
              <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
              <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
              <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default TypingIndicator;
