import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Mic, MicOff, Phone, PhoneOff } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { AudioRecorder, encodeAudioForAPI, playAudioData, clearAudioQueue } from '@/utils/RealtimeAudio';

const VoiceChat = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [aiResponse, setAiResponse] = useState('');
  
  const wsRef = useRef<WebSocket | null>(null);
  const recorderRef = useRef<AudioRecorder | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    return () => {
      disconnect();
    };
  }, []);

  const connect = async () => {
    try {
      // Request microphone permission
      await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Initialize audio context
      audioContextRef.current = new AudioContext({ sampleRate: 24000 });
      
      // Connect to WebSocket
      const projectRef = import.meta.env.VITE_SUPABASE_URL?.split('//')[1]?.split('.')[0];
      const ws = new WebSocket(`wss://${projectRef}.supabase.co/functions/v1/realtime-chat`);
      
      ws.onopen = () => {
        console.log('WebSocket connected');
        setIsConnected(true);
        startRecording();
        
        toast({
          title: "Connected",
          description: "Voice chat is ready. Start speaking!",
        });
      };

      ws.onmessage = async (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('Received event:', data.type);

          if (data.type === 'response.audio.delta' && data.delta) {
            setIsSpeaking(true);
            const binaryString = atob(data.delta);
            const bytes = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) {
              bytes[i] = binaryString.charCodeAt(i);
            }
            if (audioContextRef.current) {
              await playAudioData(audioContextRef.current, bytes);
            }
          } else if (data.type === 'response.audio.done') {
            setIsSpeaking(false);
          } else if (data.type === 'conversation.item.input_audio_transcription.completed') {
            setTranscript(data.transcript || '');
          } else if (data.type === 'response.audio_transcript.delta') {
            setAiResponse(prev => prev + (data.delta || ''));
          } else if (data.type === 'response.audio_transcript.done') {
            // Keep the final transcript
          } else if (data.type === 'error') {
            console.error('WebSocket error:', data);
            toast({
              title: "Error",
              description: data.error || "An error occurred",
              variant: "destructive",
            });
          }
        } catch (error) {
          console.error('Error processing message:', error);
        }
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        toast({
          title: "Connection Error",
          description: "Failed to connect to voice chat",
          variant: "destructive",
        });
        disconnect();
      };

      ws.onclose = () => {
        console.log('WebSocket closed');
        disconnect();
      };

      wsRef.current = ws;
      
    } catch (error) {
      console.error('Error connecting:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : 'Failed to start voice chat',
        variant: "destructive",
      });
    }
  };

  const startRecording = async () => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;

    try {
      recorderRef.current = new AudioRecorder((audioData) => {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
          const encoded = encodeAudioForAPI(audioData);
          wsRef.current.send(JSON.stringify({
            type: 'input_audio_buffer.append',
            audio: encoded
          }));
        }
      });

      await recorderRef.current.start();
      setIsRecording(true);
    } catch (error) {
      console.error('Error starting recording:', error);
      toast({
        title: "Microphone Error",
        description: "Failed to access microphone",
        variant: "destructive",
      });
    }
  };

  const disconnect = () => {
    if (recorderRef.current) {
      recorderRef.current.stop();
      recorderRef.current = null;
    }
    
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }

    clearAudioQueue();
    setIsConnected(false);
    setIsRecording(false);
    setIsSpeaking(false);
    setTranscript('');
    setAiResponse('');
  };

  return (
    <div className="fixed bottom-8 right-8 z-50">
      <Card className="p-6 shadow-lg min-w-[300px]">
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">Voice Chat</h3>
            {isConnected && (
              <div className="flex items-center gap-2">
                {isRecording && (
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                    <span className="text-xs text-muted-foreground">Listening</span>
                  </div>
                )}
                {isSpeaking && (
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                    <span className="text-xs text-muted-foreground">Speaking</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {transcript && (
            <div className="text-sm">
              <p className="text-muted-foreground text-xs mb-1">You said:</p>
              <p className="text-foreground">{transcript}</p>
            </div>
          )}

          {aiResponse && (
            <div className="text-sm">
              <p className="text-muted-foreground text-xs mb-1">AI response:</p>
              <p className="text-foreground">{aiResponse}</p>
            </div>
          )}

          <div className="flex gap-2">
            {!isConnected ? (
              <Button onClick={connect} className="w-full gap-2">
                <Phone className="h-4 w-4" />
                Start Voice Chat
              </Button>
            ) : (
              <Button onClick={disconnect} variant="destructive" className="w-full gap-2">
                <PhoneOff className="h-4 w-4" />
                End Chat
              </Button>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
};

export default VoiceChat;
