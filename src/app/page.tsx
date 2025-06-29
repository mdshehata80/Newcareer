
"use client";

import { useState, useRef, useEffect } from "react";
import { analyzeAudioResponse, type AnalyzeAudioResponseOutput } from "@/ai/flows/analyze-audio-response";
import { speakQuestion } from "@/ai/flows/speak-question-flow";
import { generateInterviewQuestion } from "@/ai/flows/generate-question-flow";
import { speakFeedback } from "@/ai/flows/speak-feedback-flow";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Loader2, Mic, Square, Volume2, Wand2, AlertCircle, BrainCircuit } from "lucide-react";

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

    if (message.includes('resolve secret') || message.includes('permission denied')) {
        userFriendlyError = "Could not access the GOOGLE_AI_API_KEY. Please verify two things in the Google Cloud Console: 1) The secret exists in Secret Manager and has an enabled Version 1 with the correct API key value. 2) Your backend's service account has the 'Secret Manager Secret Accessor' role.";
        toastDescription = "API Key configuration error.";
    } else if (message.includes('api key not valid') || message.includes('api key not found')) {
        userFriendlyError = "The provided Google AI API Key is not valid or is restricted. Please check the value in Secret Manager, ensure it's unrestricted in 'APIs & Services -> Credentials', and try again.";
        toastDescription = "Invalid or restricted API Key.";
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
    setFeedback(null);
    setQuestion("");
    setAudioDataUri(null);
    try {
      const { question: generatedQuestion } = await generateInterviewQuestion(jobRole);
      setQuestion(generatedQuestion);
      toast({ title: "Question Generated!", description: "A new question is ready below." });
    } catch (err) {
      handleApiError(err);
    } finally {
      setIsGeneratingQuestion(false);
    }
  };

  const handleSpeakQuestion = async () => {
    if (!question) {
      toast({ variant: "destructive", title: "No question", description: "There is no question to read aloud." });
      return;
    }
    setIsSpeaking(true);
    setError(null);
    try {
      const { audioDataUri } = await speakQuestion(question);
      const audio = new Audio(audioDataUri);
      audio.play();
      audio.addEventListener('ended', () => setIsSpeaking(false));
      audio.addEventListener('error', () => {
        setIsSpeaking(false);
        setError("An error occurred while playing the question audio.");
        toast({ variant: "destructive", title: "Audio Playback Error", description: "Could not play the generated audio." });
      });
    } catch (err) {
      handleApiError(err);
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
      mediaRecorderRef.current = new MediaRecorder(stream, { mimeType: 'audio/webm' });
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
          let finalTranscript = '';
          for (let i = event.resultIndex; i < event.results.length; ++i) {
            finalTranscript += event.results[i][0].transcript;
          }
          setTranscript((prev) => prev + finalTranscript);
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
        description: "Please record an answer before analyzing.",
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
    <div className="flex flex-col min-h-screen">
      <header className="sticky top-0 z-10 w-full bg-background/80 backdrop-blur-sm shadow-sm">
        <div className="container mx-auto flex h-16 items-center justify-between px-4 md:px-6">
          <div className="flex items-center gap-3">
            <BrainCircuit className="h-8 w-8 text-primary" />
            <h1 className="text-2xl font-bold text-foreground">AI Interview Coach</h1>
          </div>
        </div>
      </header>

      <main className="flex-1 w-full">
        <div className="container mx-auto p-4 md:p-8 max-w-4xl">
          <div className="grid gap-8">
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="text-xl">1. Generate a Question</CardTitle>
                <CardDescription>Enter a job role to get a relevant interview question.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col sm:flex-row items-start gap-4">
                  <Input
                    id="job-role-input"
                    placeholder="e.g., Software Engineer"
                    value={jobRole}
                    onChange={(e) => setJobRole(e.target.value)}
                    className="flex-grow text-base"
                    disabled={isGeneratingQuestion}
                  />
                  <Button onClick={handleGenerateQuestion} disabled={!jobRole || isGeneratingQuestion} className="w-full sm:w-auto">
                    {isGeneratingQuestion ? (
                      <Loader2 className="animate-spin" />
                    ) : (
                      <Wand2 />
                    )}
                    Generate Question
                  </Button>
                </div>
              </CardContent>
            </Card>

            {question && (
              <>
                <Card className="shadow-lg">
                  <CardHeader>
                    <div className="flex justify-between items-center">
                      <CardTitle className="text-xl">2. Your Question</CardTitle>
                      <Button variant="ghost" size="icon" onClick={handleSpeakQuestion} disabled={isSpeaking}>
                        {isSpeaking ? <Loader2 className="animate-spin" /> : <Volume2 />}
                        <span className="sr-only">Speak question</span>
                      </Button>
                    </div>
                    <CardDescription>Listen to the question, then record your answer.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-lg font-semibold text-primary">{question}</p>
                    <div className="mt-4">
                        <Label htmlFor="model-answer-input" className="text-sm font-medium">Model Answer (Optional)</Label>
                        <Textarea 
                          id="model-answer-input"
                          placeholder="For more accurate feedback, provide an ideal answer here..." 
                          value={modelAnswer}
                          onChange={(e) => setModelAnswer(e.target.value)}
                          className="mt-1 min-h-[80px]"
                        />
                    </div>
                  </CardContent>
                </Card>

                <Card className="shadow-lg">
                  <CardHeader>
                    <CardTitle className="text-xl">3. Record Your Answer</CardTitle>
                  </CardHeader>
                  <CardContent className="flex flex-col items-center justify-center gap-4">
                    <Button
                      onClick={isRecording ? stopRecording : startRecording}
                      size="lg"
                      className={`h-24 w-24 rounded-full flex flex-col items-center justify-center text-sm shadow-lg transition-all duration-300 ease-in-out hover:scale-105 ${
                        isRecording ? "bg-red-500 hover:bg-red-600" : "bg-primary hover:bg-primary/90"
                      }`}
                    >
                      {isRecording ? <Square size={32} /> : <Mic size={32} />}
                    </Button>
                    <div className="h-6">
                      {isRecording && <div className="font-mono text-xl text-center text-red-500 animate-pulse">{formatTime(recordingSeconds)}</div>}
                    </div>
                    {!isRecording && audioDataUri && (
                        <div className="w-full mt-4">
                            <audio controls src={audioDataUri} className="w-full" />
                        </div>
                    )}
                  </CardContent>
                </Card>

                <div className="flex justify-center">
                    <Button onClick={handleAnalyze} disabled={!audioDataUri || isAnalyzing || !question} className="w-full max-w-md py-6 text-lg font-bold">
                    {isAnalyzing ? (
                        <><Loader2 className="animate-spin" /> Analyzing...</>
                    ) : (
                        "Get Feedback"
                    )}
                    </Button>
                </div>
              </>
            )}

            {isAnalyzing && (
              <Card className="mt-4 text-center shadow-lg">
                <CardContent className="p-8">
                  <Loader2 className="mx-auto h-12 w-12 animate-spin text-primary" />
                  <p className="mt-4 text-lg font-medium text-muted-foreground">Analyzing your response... this may take a moment.</p>
                </CardContent>
              </Card>
            )}

            {feedback && (
              <Card className="mt-4 shadow-lg">
                <CardHeader>
                  <CardTitle className="text-2xl">4. AI Feedback</CardTitle>
                  <CardDescription>Here's what our AI coach thought of your answer.</CardDescription>
                </CardHeader>
                <CardContent>
                  {transcript && (
                    <div className="mb-6 p-4 bg-muted/50 rounded-lg">
                      <h4 className="font-semibold text-lg mb-2">Your Transcript:</h4>
                      <blockquote className="text-sm text-foreground/80 italic border-l-4 border-primary pl-4">
                        {transcript}
                      </blockquote>
                    </div>
                  )}
                  <Accordion type="single" collapsible defaultValue="item-1" className="w-full">
                    {Object.entries(feedback).map(([key, value]) => (
                      <AccordionItem key={key} value={`item-${key}`}>
                        <AccordionTrigger className="text-xl font-semibold capitalize">{key}</AccordionTrigger>
                        <AccordionContent className="text-base text-foreground/90 space-y-3 pt-2">
                          <p>{value}</p>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => handleSpeakFeedback(value, key)}
                            disabled={!!speakingFeedbackKey}
                          >
                            {speakingFeedbackKey === key ? <Loader2 className="animate-spin" /> : <Volume2 />}
                            <span className="ml-2">Read Aloud</span>
                          </Button>
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                </CardContent>
              </Card>
            )}

            {error && (
              <Card className="mt-4 border-destructive bg-destructive/10">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-destructive">
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
        </div>
      </main>
    </div>
  );
}
