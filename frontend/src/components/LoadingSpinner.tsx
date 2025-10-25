import { Loader2 } from "lucide-react";

const LoadingSpinner = () => {
  return (
    <div className="flex flex-col items-center justify-center py-8">
      <Loader2 className="h-8 w-8 text-primary animate-spin mb-3" />
      <p className="text-muted-foreground text-sm font-medium">Thinking...</p>
    </div>
  );
};

export default LoadingSpinner;