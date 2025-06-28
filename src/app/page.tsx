"use client";

import { useState, useRef, useEffect } from "react";
import { analyzeAudioResponse, type AnalyzeAudioResponseOutput } from "@/ai/flows/analyze-audio-response";
import { speakQuestion } from "@/ai/flows/speak-question-flow";
import { generateInterviewQuestion } from "@/ai/flows/generate-question-flow";
import { speakFeedback } from "@/ai/flows/speak-feedback-flow";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Loader2, Mic, Square, Volume2, Wand2, AlertCircle } from "lucide-react";

export default function Home() {
  const [question, setQuestion] = useState("");
  const [modelAnswer, setModelAnswer] = useState("");
  const [jobRole, setJobRole] = useState("");
  const [isGeneratingQuestion, setIsGeneratingQuestion] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [audioDataUri, setAudioDataUri] = useState<string | null>(null);
  const [transcript, setTranscript] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [feedback, setFeedback] = useState<AnalyzeAudioResponseOutput | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [speakingFeedbackKey, setSpeakingFeedbackKey] = useState<string | null>(null);
  
  const [speechRecognition, setSpeechRecognition] = useState<any>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  const { toast } = useToast();

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    setSpeechRecognition(() => SpeechRecognition);
    
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setError("Audio recording is not supported by your browser.");
      toast({ variant: "destructive", title: "Compatibility Error", description: "Audio recording is not supported." });
    }
    if (!SpeechRecognition) {
      setError((prev) => (prev ? prev + " Speech recognition is not supported." : "Speech recognition is not supported by your browser. Analysis may be less accurate."));
       toast({ variant: "destructive", title: "Compatibility Error", description: "Speech recognition not supported." });
    }
    
    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.stop();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  
  const handleApiError = (err: unknown) => {
    console.error("API Error:", err);
    const message = err instanceof Error ? err.message.toLowerCase() : String(err).toLowerCase();
    
    let userFriendlyError = "An unexpected error occurred with the AI service. Please try again later.";
    let toastDescription = "An unexpected error occurred.";

    if (message.includes('google_ai_api_key') || message.includes('secret') || message.includes('permission')) {
        userFriendlyError = "There is a configuration error with your API key. Please ensure the GOOGLE_AI_API_KEY secret exists in Secret Manager, has a value, and that your App Hosting backend has the 'Secret Manager Secret Accessor' role for it.";
        toastDescription = "Missing API Key or permissions.";
    } else if (message.includes('api key not valid')) {
        userFriendlyError = "The provided Google AI API Key is not valid. Please check the value in Secret Manager and try again.";
        toastDescription = "Invalid API Key.";
    } else if (message.includes('quota')) {
        userFriendlyError = "You have exceeded your API quota. Please check your Google Cloud project billing and quotas.";
        toastDescription = "API quota exceeded.";
    }

    setError(userFriendlyError);
    toast({ variant: "destructive", title: "Service Error", description: toastDescription });
  }

  const handleGenerateQuestion = async () => {
    if (!jobRole) {
      toast({ variant: "destructive", title: "No job role", description: "Please enter a job role to generate a question." });
      return;
    }
    setIsGeneratingQuestion(true);
    setError(null);
    try {
      const { question: generatedQuestion } = await generateInterviewQuestion(jobRole);
      setQuestion(generatedQuestion);
      toast({ title: "Question Generated!", description: "The question has been filled in for you." });
    } catch (err) {
      handleApiError(err);
    } finally {
      setIsGeneratingQuestion(false);
    }
  };

  const handleSpeakQuestion = async () => {
    if (!question) {
      toast({ variant: "destructive", title: "No question", description: "Please enter a question to speak." });
      return;
    }
    setIsSpeaking(true);
    setError(null);
    try {
      const { audioDataUri } = await speakQuestion(question);
      const audio = new Audio(audioDataUri);
      audio.play();
    } catch (err) {
      handleApiError(err);
    } finally {
      setIsSpeaking(false);
    }
  };
  
  const startRecording = async () => {
    setError(null);
    setFeedback(null);
    setAudioDataUri(null);
    setTranscript("");

    if (isRecording) return;
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorderRef.current.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = () => {
          setAudioDataUri(reader.result as string);
        };
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
      setRecordingSeconds(0);
      timerIntervalRef.current = setInterval(() => {
        setRecordingSeconds(prev => prev + 1);
      }, 1000);

      if (speechRecognition) {
        const recognition = new speechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        
        recognition.onresult = (event: any) => {
          let interimTranscript = '';
          let finalTranscript = transcript;
          for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) {
              finalTranscript += event.results[i][0].transcript;
            } else {
              interimTranscript += event.results[i][0].transcript;
            }
          }
          setTranscript(finalTranscript + interimTranscript);
        };
        recognition.start();
        recognitionRef.current = recognition;
      }

    } catch (err) {
      console.error("Error starting recording:", err);
      setError("Microphone access was denied. Please allow microphone access in your browser settings.");
      toast({ variant: "destructive", title: "Microphone Error", description: "Could not access microphone." });
    }
  };

  const stopRecording = () => {
    if (!isRecording || !mediaRecorderRef.current) return;
    
    mediaRecorderRef.current.stop();
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setIsRecording(false);
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
    }
  };
  
  const handleAnalyze = async () => {
    if (!audioDataUri || !question) {
      toast({
        variant: "destructive",
        title: "Missing Information",
        description: "Please provide a question and record an answer before analyzing.",
      });
      return;
    }

    setIsAnalyzing(true);
    setError(null);
    setFeedback(null);
    
    try {
      const result = await analyzeAudioResponse({
        question,
        modelAnswer,
        audioDataUri,
        transcript,
      });
      setFeedback(result);
    } catch (err) {
      handleApiError(err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSpeakFeedback = async (text: string, key: string) => {
    if (speakingFeedbackKey) return; 
    
    setSpeakingFeedbackKey(key);
    setError(null);
    try {
      const { audioDataUri } = await speakFeedback(text);
      const audio = new Audio(audioDataUri);
      audio.play();
      audio.addEventListener('ended', () => setSpeakingFeedbackKey(null));
      audio.addEventListener('error', () => {
        setError("An error occurred while playing feedback audio.");
        toast({ variant: "destructive", title: "Audio Playback Error", description: "Could not play the generated audio." });
        setSpeakingFeedbackKey(null);
      });
    } catch (err) {
      handleApiError(err);
      setSpeakingFeedbackKey(null);
    }
  };

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <main className="flex min-h-screen w-full flex-col items-center justify-center bg-background p-4 sm:p-6 md:p-8">
      <div className="w-full max-w-2xl">
        <header className="text-center mb-8">
          <h1 className="text-4xl font-bold text-primary font-headline">LinguaLens: AI Interview Coach</h1>
          <p className="text-muted-foreground mt-2 font-body">Your AI-powered coach for mastering interviews.</p>
        </header>

        <Card className="w-full shadow-lg">
          <CardContent className="p-6 space-y-6">
            
            <div className="space-y-2">
              <label htmlFor="job-role-input" className="font-semibold text-lg font-headline">Auto-generate Question</label>
               <p className="text-sm text-muted-foreground">Enter a job role to generate a common interview question.</p>
              <div className="flex items-center gap-2">
                <Input
                  id="job-role-input"
                  placeholder="e.g., Software Engineer"
                  value={jobRole}
                  onChange={(e) => setJobRole(e.target.value)}
                  className="text-base"
                  disabled={isGeneratingQuestion}
                />
                <Button onClick={handleGenerateQuestion} disabled={!jobRole || isGeneratingQuestion}>
                   {isGeneratingQuestion ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Wand2 className="mr-2 h-4 w-4" />
                  )}
                  Generate
                </Button>
              </div>
            </div>

            <Separator />

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label htmlFor="question-input" className="font-semibold text-lg font-headline">1. Your Question</label>
                <Button variant="ghost" size="icon" onClick={handleSpeakQuestion} disabled={!question || isSpeaking}>
                  {isSpeaking ? <Loader2 className="h-5 w-5 animate-spin" /> : <Volume2 className="h-5 w-5"/>}
                  <span className="sr-only">Speak question</span>
                </Button>
              </div>
              <p className="text-sm text-muted-foreground">Type your own question below, or generate one using the tool above.</p>
              <Textarea 
                id="question-input"
                placeholder="e.g., Tell me about a time you handled a difficult project." 
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                className="min-h-[80px] text-base"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="model-answer-input" className="font-semibold text-lg font-headline">2. Model Answer (Optional)</label>
              <p className="text-sm text-muted-foreground">Provide an ideal answer to the question for more accurate feedback.</p>
              <Textarea 
                id="model-answer-input"
                placeholder="e.g., In my previous role at XYZ Corp..." 
                value={modelAnswer}
                onChange={(e) => setModelAnswer(e.target.value)}
                className="min-h-[80px] text-base"
              />
            </div>

            <div className="space-y-4">
              <p className="font-semibold text-lg font-headline">3. Record Your Answer</p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 p-4 rounded-lg bg-muted/50">
                <Button 
                  onClick={isRecording ? stopRecording : startRecording}
                  size="lg"
                  className="w-24 h-24 rounded-full flex flex-col gap-1 transition-all duration-300 ease-in-out hover:scale-105"
                  variant={isRecording ? 'destructive' : 'default'}
                >
                  {isRecording ? (
                    <>
                      <Square className="h-8 w-8"/>
                      <span>Stop</span>
                    </>
                  ) : (
                    <>
                      <Mic className="h-8 w-8"/>
                      <span>Record</span>
                    </>
                  )}
                </Button>
                {isRecording && (
                  <div className="font-mono text-2xl text-center w-32 text-destructive animate-pulse">{formatTime(recordingSeconds)}</div>
                )}
                {!isRecording && audioDataUri && (
                    <audio controls src={audioDataUri} className="w-full sm:w-auto" />
                )}
              </div>
            </div>

            <div className="space-y-2">
              <p className="font-semibold text-lg font-headline">4. Get Feedback</p>
              <Button onClick={handleAnalyze} disabled={!audioDataUri || isAnalyzing || !question} className="w-full bg-accent text-accent-foreground hover:bg-accent/90">
                {isAnalyzing ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Analyzing...</>
                ) : (
                  <><Wand2 className="mr-2 h-4 w-4" /> Analyze Answer</>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {feedback && (
          <Card className="mt-8 shadow-lg">
            <CardHeader>
              <CardTitle className="font-headline">Analysis Feedback</CardTitle>
              <CardDescription>Here's what our AI thought of your answer.</CardDescription>
            </CardHeader>
            <CardContent>
              <Accordion type="single" collapsible defaultValue="item-1" className="w-full">
                <AccordionItem value="item-1">
                  <AccordionTrigger className="text-lg font-semibold">Correctness</AccordionTrigger>
                  <AccordionContent className="text-base text-muted-foreground space-y-3">
                    <p>{feedback.correctness}</p>
                    <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => handleSpeakFeedback(feedback.correctness, 'correctness')}
                        disabled={!!speakingFeedbackKey}
                    >
                        {speakingFeedbackKey === 'correctness' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Volume2 className="h-4 w-4"/>}
                        <span className="ml-2">Speak Feedback</span>
                    </Button>
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="item-2">
                  <AccordionTrigger className="text-lg font-semibold">Completeness</AccordionTrigger>
                  <AccordionContent className="text-base text-muted-foreground space-y-3">
                    <p>{feedback.completeness}</p>
                    <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => handleSpeakFeedback(feedback.completeness, 'completeness')}
                        disabled={!!speakingFeedbackKey}
                    >
                        {speakingFeedbackKey === 'completeness' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Volume2 className="h-4 w-4"/>}
                        <span className="ml-2">Speak Feedback</span>
                    </Button>
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="item-3">
                  <AccordionTrigger className="text-lg font-semibold">Clarity</AccordionTrigger>
                  <AccordionContent className="text-base text-muted-foreground space-y-3">
                    <p>{feedback.clarity}</p>
                    <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => handleSpeakFeedback(feedback.clarity, 'clarity')}
                        disabled={!!speakingFeedbackKey}
                    >
                        {speakingFeedbackKey === 'clarity' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Volume2 className="h-4 w-4"/>}
                        <span className="ml-2">Speak Feedback</span>
                    </Button>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
               {transcript && (
                  <div className="mt-6">
                    <h4 className="font-semibold text-md font-headline">Your Answer Transcript:</h4>
                    <blockquote className="text-sm text-muted-foreground p-3 bg-muted/50 rounded-md mt-2 border-l-4 border-primary italic">
                      {transcript}
                    </blockquote>
                  </div>
                )}
            </CardContent>
          </Card>
        )}
        
        {error && (
            <Card className="mt-8 border-destructive bg-destructive/10">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-destructive font-headline">
                        <AlertCircle />
                        An Error Occurred
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-destructive/90">{error}</p>
                </CardContent>
            </Card>
        )}
      </div>
    </main>
  );
}
