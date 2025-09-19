
"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { provideContextualHelp } from "@/ai/flows/provide-contextual-help";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Bot, Loader, Mic, MicOff, Play, StopCircle, Video, VideoOff } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { SettingsSheet } from "@/components/settings-sheet";
import { Badge } from "@/components/ui/badge";

interface CustomWindow extends Window {
  SpeechRecognition?: any;
  webkitSpeechRecognition?: any;
}

export function GeminiAssist() {
  const [isCapturing, setIsCapturing] = useState(false);
  const [isAudioCapturing, setIsAudioCapturing] = useState(false);
  const [instructions, setInstructions] = useState<string>("Hi there! I'm Gemini Assist. Share your screen and I'll help you out.");
  const [status, setStatus] = useState<"idle" | "capturing" | "analyzing" | "error">("idle");
  const [devices, setDevices] = useState<{ audio: MediaDeviceInfo[], video: MediaDeviceInfo[] }>({ audio: [], video: [] });
  const [selectedAudioDevice, setSelectedAudioDevice] = useState<string>('default');
  const [transcript, setTranscript] = useState('');

  const videoRef = useRef<HTMLVideoElement>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const audioStreamRef = useRef<MediaStream | null>(null);
  const recognitionRef = useRef<any>(null);
  const analysisIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const { toast } = useToast();

  const getDevices = useCallback(async () => {
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      const deviceInfos = await navigator.mediaDevices.enumerateDevices();
      const audio = deviceInfos.filter(d => d.kind === 'audioinput');
      const video = deviceInfos.filter(d => d.kind === 'videoinput');
      setDevices({ audio, video });
    } catch (err) {
      console.error("Error enumerating devices:", err);
      // Don't toast here as it can be annoying on page load if permissions are not set
    }
  }, []);

  useEffect(() => {
    getDevices();
  }, [getDevices]);
  
  const handleStopCapture = useCallback(() => {
    if(!isCapturing && !screenStreamRef.current && !audioStreamRef.current) return;

    screenStreamRef.current?.getTracks().forEach(track => track.stop());
    audioStreamRef.current?.getTracks().forEach(track => track.stop());

    screenStreamRef.current = null;
    audioStreamRef.current = null;
    if (videoRef.current) {
        videoRef.current.srcObject = null;
    }

    setIsCapturing(false);
    setStatus("idle");
    setInstructions("Capture stopped. Start again when you're ready.");
  }, [isCapturing]);

  const handleStartCapture = async () => {
    if (isCapturing) return;
    setInstructions("Starting capture... Please select a screen to share.");

    try {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({
            video: { cursor: "always" },
            audio: false,
        });
        
        const audioStream = await navigator.mediaDevices.getUserMedia({
            audio: { deviceId: selectedAudioDevice !== 'default' ? { exact: selectedAudioDevice } : undefined },
            video: false
        });

        screenStreamRef.current = screenStream;
        audioStreamRef.current = audioStream;

        if (videoRef.current) {
            videoRef.current.srcObject = screenStream;
            videoRef.current.play().catch(console.error);
        }

        screenStream.getTracks()[0].onended = () => {
          handleStopCapture();
        };

        setIsCapturing(true);
        setStatus("capturing");
        setInstructions("Capture started! I'm now watching and listening.");

    } catch (err: any) {
        console.error("Error starting capture:", err);
        let description = "Could not start screen or audio capture. Please try again.";
        if (err.name === 'NotAllowedError') {
            description = "You denied permission for screen capture. Please allow it to use the app.";
        }
        toast({
            variant: "destructive",
            title: "Capture Failed",
            description,
        });
        setIsCapturing(false);
        setStatus("idle");
        setInstructions("Hi there! I'm Gemini Assist. Share your screen and I'll help you out.");
    }
  }

  useEffect(() => {
    const SpeechRecognition = (window as CustomWindow).SpeechRecognition || (window as CustomWindow).webkitSpeechRecognition;
    if (!isCapturing || !SpeechRecognition) {
      if(recognitionRef.current) {
        recognitionRef.current.stop();
        recognitionRef.current = null;
      }
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onstart = () => setIsAudioCapturing(true);
    recognition.onend = () => {
      setIsAudioCapturing(false);
      // Automatically restart if still capturing
      if (isCapturing && recognitionRef.current) {
        recognition.start();
      }
    };
    recognition.onerror = (e:any) => {
      if (e.error === 'no-speech') {
        // This is a common occurrence, just ignore it and let recognition restart.
        return;
      }
      
      console.error("Speech recognition error:", e.error);

      if (e.error === 'not-allowed') {
        toast({ variant: 'destructive', title: 'Audio permission denied', description: 'Please allow microphone access in your browser settings.'});
        handleStopCapture();
      } else {
        setIsAudioCapturing(false);
      }
    };

    let final_transcript = '';
    recognition.onresult = (event: any) => {
        let interim_transcript = '';
        final_transcript = ''; // Reset final transcript to avoid concatenation
        for (let i = 0; i < event.results.length; ++i) {
            if (event.results[i].isFinal) {
                final_transcript += event.results[i][0].transcript;
            } else {
                interim_transcript += event.results[i][0].transcript;
            }
        }
        setTranscript(final_transcript + interim_transcript);
    };
    
    recognitionRef.current = recognition;
    recognition.start();

    return () => {
      if(recognitionRef.current){
        recognitionRef.current.stop();
        recognitionRef.current = null;
      }
      setTranscript('');
    }
  }, [isCapturing, handleStopCapture, toast]);

  const analyzeScreenWithTranscript = useCallback(async () => {
    if (!videoRef.current || !screenStreamRef.current || !isCapturing) return;

    setStatus("analyzing");
    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const context = canvas.getContext('2d');
    if (!context) {
        setStatus("error");
        return
    };

    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    const screenDataUri = canvas.toDataURL('image/jpeg', 0.7);
    
    try {
      const result = await provideContextualHelp({
        screenDataUri,
        audioTranscription: transcript || 'User is not speaking.',
      });
      setInstructions(result.instructions);
    } catch (error) {
      console.error("AI analysis failed:", error);
      toast({
        variant: "destructive",
        title: "Analysis Failed",
        description: "Could not get instructions from the AI.",
      });
      setStatus("error");
    } finally {
      if (isCapturing) {
        setStatus("capturing");
      }
    }
  }, [isCapturing, toast, transcript]);

  useEffect(() => {
    if (isCapturing) {
      analysisIntervalRef.current = setInterval(analyzeScreenWithTranscript, 7000);
    } else {
      if (analysisIntervalRef.current) {
        clearInterval(analysisIntervalRef.current);
        analysisIntervalRef.current = null;
      }
    }

    return () => {
      if (analysisIntervalRef.current) {
        clearInterval(analysisIntervalRef.current);
      }
    }
  }, [isCapturing, analyzeScreenWithTranscript]);

  return (
    <div className="flex flex-col w-full h-full max-w-screen-2xl mx-auto bg-background rounded-xl shadow-2xl overflow-hidden p-2 md:p-4">
      <header className="flex items-center justify-between p-2 md:p-4 border-b">
        <div className="flex items-center gap-3">
          <Bot className="w-7 h-7 md:w-8 md:h-8 text-primary" />
          <h1 className="text-xl md:text-2xl font-bold text-foreground">Gemini Assist</h1>
        </div>
        <SettingsSheet 
          devices={devices} 
          selectedAudioDevice={selectedAudioDevice}
          setSelectedAudioDevice={setSelectedAudioDevice}
        />
      </header>

      <div className="flex flex-1 flex-col lg:flex-row min-h-0 gap-4 mt-4">
        <div className="flex-1 flex flex-col space-y-4">
          <div className="flex-1 w-full bg-card/50 rounded-lg flex items-center justify-center relative aspect-video shadow-inner">
            <video ref={videoRef} className="w-full h-full object-contain rounded-lg" muted playsInline />
            {!isCapturing && (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground p-4 text-center">
                <VideoOff className="w-12 h-12 md:w-16 md:h-16 mb-4" />
                <p className="text-lg font-medium">Screen share is off</p>
                <p className="text-sm">Click "Start Capture" to begin</p>
              </div>
            )}
          </div>
          
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-lg bg-card/50">
             <div className="flex items-center gap-4">
               {!isCapturing ? (
                  <Button size="lg" onClick={handleStartCapture} className="bg-accent hover:bg-accent/90 text-accent-foreground font-bold shadow-md">
                    <Play className="mr-2 h-5 w-5" />
                    Start Capture
                  </Button>
                ) : (
                  <Button size="lg" variant="destructive" onClick={handleStopCapture} className="font-bold shadow-md">
                    <StopCircle className="mr-2 h-5 w-5" />
                    Stop Capture
                  </Button>
                )}
             </div>
             <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <div className={`flex items-center gap-2 transition-colors ${isCapturing ? 'text-foreground' : ''}`}>
                    <Video className={`h-5 w-5 transition-colors ${isCapturing ? 'text-accent' : ''}`} />
                    <span>Screen</span>
                </div>
                 <div className={`flex items-center gap-2 transition-colors ${isAudioCapturing ? 'text-foreground' : ''}`}>
                    {isAudioCapturing ? <Mic className="h-5 w-5 text-accent" /> : <MicOff className="h-5 w-5" />}
                    <span>Audio</span>
                </div>
                {isCapturing && (
                    <Badge variant={status === 'analyzing' ? 'default' : 'secondary'} className="transition-all w-28 justify-center">
                        {status === 'analyzing' && <Loader className="mr-2 h-4 w-4 animate-spin" />}
                        {status === 'capturing' && 'Listening'}
                        {status === 'analyzing' && 'Analyzing'}
                        {status === 'idle' && 'Idle'}
                        {status === 'error' && 'Error'}
                    </Badge>
                )}
             </div>
          </div>

          {isCapturing && (
            <Card className="bg-card/50 h-32">
                <CardHeader className="py-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Live Transcript</CardTitle>
                </CardHeader>
                <CardContent className="py-2 h-full overflow-y-auto">
                    <p className="text-sm text-foreground/80 italic">{transcript || "..."}</p>
                </CardContent>
            </Card>
          )}
        </div>

        <Separator orientation="vertical" className="hidden lg:block" />
        
        <div className="w-full lg:w-2/5 flex flex-col p-4 lg:p-0 lg:pl-4">
          <Card className="flex-1 flex flex-col bg-card/50 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-primary">
                <Bot className="h-6 w-6" />
                AI Instructions
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto">
              <div className="text-foreground/90 leading-relaxed space-y-4">
                <p className="transition-all duration-500 whitespace-pre-wrap">{instructions}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
