import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Mic, MicOff, PhoneOff } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import coachImage from '@/assets/coach-image.png';

interface VoiceChatOverlayProps {
  onClose: () => void;
}

const VoiceChatOverlay = ({ onClose }: VoiceChatOverlayProps) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [aiResponse, setAiResponse] = useState('');
  const [duration, setDuration] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<number | null>(null);
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    startTimer();
    return () => {
      cleanup();
    };
  }, []);

  const startTimer = () => {
    timerRef.current = window.setInterval(() => {
      setDuration(prev => prev + 1);
    }, 1000);
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const toggleRecording = async () => {
    if (isRecording) {
      // Stop recording and send audio
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.stop();
      }
      setIsRecording(false);
    } else {
      // Start recording
      try {
        if (!streamRef.current) {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          streamRef.current = stream;
        }
        
        audioChunksRef.current = [];
        
        const mediaRecorder = new MediaRecorder(streamRef.current, {
          mimeType: 'audio/webm',
        });

        mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            audioChunksRef.current.push(event.data);
          }
        };

        mediaRecorder.onstop = async () => {
          if (audioChunksRef.current.length > 0) {
            await sendAudioToBackend();
          }
          audioChunksRef.current = [];
        };

        mediaRecorder.start();
        setIsRecording(true);
        mediaRecorderRef.current = mediaRecorder;
      } catch (error) {
        console.error('Error accessing microphone:', error);
      }
    }
  };

  const sendAudioToBackend = async () => {
    setIsProcessing(true);

    try {
      const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
      const formData = new FormData();
      formData.append('audio', audioBlob, 'voice.wav');

      const response = await fetch('https://mahmous-chatbot3.hf.space/voice', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (data.transcript) setTranscript(data.transcript);
      if (data.answer) setAiResponse(data.answer);
      if (data.audio_url) await playAudioResponse(data.audio_url);
    } catch (error) {
      console.error('Error sending audio to backend:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const playAudioResponse = async (audioUrl: string) => {
    setIsSpeaking(true);

    try {
      if (currentAudioRef.current) {
        currentAudioRef.current.pause();
        currentAudioRef.current = null;
      }

      const audio = new Audio(audioUrl);
      currentAudioRef.current = audio;

      audio.onended = () => {
        setIsSpeaking(false);
        currentAudioRef.current = null;
      };

      audio.onerror = () => {
        setIsSpeaking(false);
        currentAudioRef.current = null;
      };

      // Mobile-friendly audio playback
      audio.load();
      const playPromise = audio.play();
      
      if (playPromise !== undefined) {
        playPromise.catch(error => {
          console.error('Error playing audio:', error);
          setIsSpeaking(false);
        });
      }
    } catch (error) {
      console.error('Error playing audio:', error);
      setIsSpeaking(false);
    }
  };

  const stopSpeaking = () => {
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current.currentTime = 0;
      currentAudioRef.current.src = '';
      currentAudioRef.current.load();
      currentAudioRef.current.onended = null;
      currentAudioRef.current.onerror = null;
      currentAudioRef.current = null;
    }
    setIsSpeaking(false);
  };

  const cleanup = () => {
    if (timerRef.current) clearInterval(timerRef.current);

    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current.currentTime = 0;
      currentAudioRef.current.src = '';
      currentAudioRef.current.load();
      currentAudioRef.current.onended = null;
      currentAudioRef.current.onerror = null;
      currentAudioRef.current = null;
    }
    
    setIsSpeaking(false);
  };

  const handleEndCall = () => {
    cleanup();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-md animate-fade-in overflow-hidden">
      <div className="flex flex-col items-center justify-center w-full max-w-2xl px-4">
        {/* Call Duration */}
        <div className="mb-8 text-sm text-muted-foreground">
          {formatDuration(duration)}
        </div>

        {/* Voice Activity Visualization */}
        <div className="relative flex items-center justify-center gap-4 mb-6 w-full max-w-md">
          {/* Left Talking Bars */}
          {isSpeaking && (
            <div className="flex items-center gap-1 flex-shrink-0">
              {[...Array(4)].map((_, i) => (
                <div
                  key={`left-${i}`}
                  className="w-1 bg-primary rounded-full animate-pulse"
                  style={{
                    height: `${20 + Math.random() * 30}px`,
                    animationDelay: `${i * 0.1}s`,
                    animationDuration: `${0.6 + Math.random() * 0.4}s`,
                  }}
                />
              ))}
            </div>
          )}

          {/* Circular Avatar with Glow and Spinner */}
          <div className="relative flex-shrink-0">
            {/* Loading Spinner Ring */}
            {isProcessing && (
              <div className="absolute inset-0 -m-3 animate-spin">
                <svg className="w-[210px] h-[210px]" viewBox="0 0 100 100">
                  <circle
                    cx="50"
                    cy="50"
                    r="45"
                    fill="none"
                    stroke="hsl(var(--accent))"
                    strokeWidth="3"
                    strokeDasharray="70 200"
                    strokeLinecap="round"
                  />
                </svg>
              </div>
            )}

            {/* Glow Effect */}
            <div
              className={`absolute inset-0 rounded-full transition-all duration-1000 ${
                isSpeaking
                  ? 'bg-primary/20 blur-2xl scale-110 animate-pulse'
                  : isRecording
                  ? 'bg-red-500/20 blur-xl scale-105 animate-pulse'
                  : 'bg-primary/10 blur-lg'
              }`}
            />

            {/* Avatar Image */}
            <div
              className={`relative w-48 h-48 rounded-full overflow-hidden border-4 transition-all duration-500 ${
                isSpeaking
                  ? 'border-primary shadow-2xl'
                  : isRecording
                  ? 'border-red-500 shadow-lg'
                  : 'border-border shadow-md'
              }`}
            >
              <img src={coachImage} alt="Coach" className="w-full h-full object-cover" />
            </div>
          </div>

          {/* Right Talking Bars */}
          {isSpeaking && (
            <div className="flex items-center gap-1 flex-shrink-0">
              {[...Array(4)].map((_, i) => (
                <div
                  key={`right-${i}`}
                  className="w-1 bg-primary rounded-full animate-pulse"
                  style={{
                    height: `${20 + Math.random() * 30}px`,
                    animationDelay: `${i * 0.1}s`,
                    animationDuration: `${0.6 + Math.random() * 0.4}s`,
                  }}
                />
              ))}
            </div>
          )}
        </div>

        {/* Coach Name */}
        <h2 className="text-2xl font-semibold mb-2">J&P Mentoring</h2>

        {/* Status Badge */}
        {(isSpeaking || isProcessing || isRecording) && (
          <div className={`mb-6 px-4 py-1 rounded-full text-sm animate-pulse ${
            isProcessing 
              ? 'bg-accent/20 text-accent' 
              : isSpeaking 
              ? 'bg-primary/20 text-primary'
              : 'bg-red-500/20 text-red-500'
          }`}>
            {isProcessing ? 'Processing...' : isSpeaking ? 'Talking' : 'Recording...'}
          </div>
        )}

        {/* Transcripts */}
        <div className="w-full max-w-md mb-8 space-y-3 min-h-[120px] max-h-[200px] overflow-y-auto">
          {transcript && (
            <div className="text-sm bg-card/50 backdrop-blur-sm rounded-lg p-3 border border-border/50 animate-fade-in">
              <p className="text-xs text-muted-foreground mb-1">You said:</p>
              <div className="text-foreground prose prose-sm dark:prose-invert max-w-none">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {transcript}
                </ReactMarkdown>
              </div>
            </div>
          )}

          {aiResponse && (
            <div className="text-sm bg-card/50 backdrop-blur-sm rounded-lg p-3 border border-border/50 animate-fade-in">
              <p className="text-xs text-muted-foreground mb-1">Coach says:</p>
              <div className="text-foreground prose prose-sm dark:prose-invert max-w-none">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {aiResponse}
                </ReactMarkdown>
              </div>
            </div>
          )}
        </div>

        {/* Control Buttons */}
        <div className="flex gap-4 items-center">
          {isSpeaking && (
            <Button
              size="lg"
              variant="outline"
              onClick={stopSpeaking}
              className="w-16 h-16 rounded-full border-2 border-primary text-primary hover:bg-primary hover:text-primary-foreground"
            >
              <MicOff className="h-7 w-7" />
            </Button>
          )}
          
          <Button
            size="lg"
            variant={isRecording ? 'destructive' : 'default'}
            onClick={toggleRecording}
            disabled={isProcessing || isSpeaking}
            className={`w-16 h-16 rounded-full transition-all ${
              isRecording ? 'bg-red-500 hover:bg-red-600 animate-pulse' : 'bg-primary hover:bg-primary/90'
            }`}
          >
            {isRecording ? <MicOff className="h-7 w-7" /> : <Mic className="h-7 w-7" />}
          </Button>

          <Button
            size="lg"
            onClick={handleEndCall}
            className="w-14 h-14 rounded-full bg-destructive hover:bg-destructive/90"
          >
            <PhoneOff className="h-6 w-6" />
          </Button>
        </div>
        
        {/* Instructions */}
        <p className="mt-4 text-xs text-muted-foreground text-center">
          {isSpeaking 
            ? 'Click the stop button to interrupt and ask another question' 
            : isRecording 
            ? 'Click the mic button again to stop and send' 
            : 'Click the mic button to start speaking'}
        </p>
      </div>
    </div>
  );
};

export default VoiceChatOverlay;
