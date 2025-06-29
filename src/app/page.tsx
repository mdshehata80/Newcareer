
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
import { Loader2, Mic, Square, Volume2, Wand2, AlertCircle, Sparkles } from "lucide-react";

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
          let finalTranscript = transcript;
          for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) {
              finalTranscript += event.results[i][0].transcript + ' ';
            }
          }
          setTranscript(finalTranscript);
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
    <div className="flex min-h-screen w-full flex-col items-center bg-gray-50 font-sans text-gray-900">
      <header className="w-full bg-white shadow-sm">
        <div className="container mx-auto flex h-16 items-center justify-between px-4 md:px-6">
          <div className="flex items-center gap-2">
            <Sparkles className="h-8 w-8 text-primary" />
            <h1 className="text-xl font-bold tracking-tighter text-gray-800">LinguaLens Interview Coach</h1>
          </div>
        </div>
      </header>

      <main className="flex w-full flex-1 flex-col items-center p-4 sm:p-6 md:p-8">
        <div className="w-full max-w-4xl space-y-8">
          
          <Card className="w-full shadow-md border-t-4 border-primary">
            <CardHeader>
              <CardTitle className="text-2xl font-bold">Start Your Practice Session</CardTitle>
              <CardDescription>Enter a job role to generate a relevant interview question.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-start gap-4 sm:flex-row">
                <Input
                  id="job-role-input"
                  placeholder="e.g., Product Manager, Data Scientist"
                  value={jobRole}
                  onChange={(e) => setJobRole(e.target.value)}
                  className="flex-grow text-base"
                  disabled={isGeneratingQuestion}
                />
                <Button onClick={handleGenerateQuestion} disabled={!jobRole || isGeneratingQuestion} className="w-full sm:w-auto">
                   {isGeneratingQuestion ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Wand2 className="mr-2 h-4 w-4" />
                  )}
                  Generate Question
                </Button>
              </div>
            </CardContent>
          </Card>

          {question && (
            <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
              
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span>Interview Question</span>
                      <Button variant="ghost" size="icon" onClick={handleSpeakQuestion} disabled={!question || isSpeaking}>
                        {isSpeaking ? <Loader2 className="h-5 w-5 animate-spin" /> : <Volume2 className="h-5 w-5"/>}
                        <span className="sr-only">Speak question</span>
                      </Button>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-lg font-medium text-gray-700">{question}</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Model Answer (Optional)</CardTitle>
                    <CardDescription>For more accurate feedback, provide an ideal answer.</CardDescription>
                  </CardHeader>
                  <CardContent>
                     <Textarea 
                      id="model-answer-input"
                      placeholder="e.g., In my previous role at XYZ Corp..." 
                      value={modelAnswer}
                      onChange={(e) => setModelAnswer(e.target.value)}
                      className="min-h-[100px] text-base"
                    />
                  </CardContent>
                </Card>
              </div>

              <div className="space-y-6">
                <Card className="bg-primary/5">
                   <CardHeader>
                    <CardTitle>Record Your Answer</CardTitle>
                  </CardHeader>
                  <CardContent className="flex flex-col items-center justify-center gap-4">
                     <Button 
                        onClick={isRecording ? stopRecording : startRecording}
                        size="lg"
                        className="h-20 w-20 rounded-full flex flex-col items-center justify-center gap-1 text-sm shadow-lg transition-all duration-300 ease-in-out hover:scale-105"
                        variant={isRecording ? 'destructive' : 'default'}
                      >
                        {isRecording ? <Square className="h-6 w-6"/> : <Mic className="h-6 w-6"/>}
                      </Button>
                      <div className="h-6">
                        {isRecording && <div className="font-mono text-xl text-center text-destructive animate-pulse">{formatTime(recordingSeconds)}</div>}
                      </div>
                      <div className="w-full">
                        {!isRecording && audioDataUri && <audio controls src={audioDataUri} className="w-full" />}
                      </div>
                  </CardContent>
                </Card>

                 <Button onClick={handleAnalyze} disabled={!audioDataUri || isAnalyzing || !question} className="w-full py-6 text-lg">
                  {isAnalyzing ? (
                    <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Analyzing Your Answer...</>
                  ) : (
                    "Get Feedback"
                  )}
                </Button>
              </div>
            </div>
          )}

          {isAnalyzing && (
            <Card className="mt-8 text-center">
              <CardContent className="p-8">
                <Loader2 className="mx-auto h-12 w-12 animate-spin text-primary" />
                <p className="mt-4 text-lg font-medium text-gray-600">Analyzing your response... please wait.</p>
              </CardContent>
            </Card>
          )}

          {feedback && (
            <Card className="mt-8 shadow-lg">
              <CardHeader>
                <CardTitle className="text-2xl font-bold">Analysis Feedback</CardTitle>
                <CardDescription>Here's what our AI coach thought of your answer.</CardDescription>
              </CardHeader>
              <CardContent>
                 {transcript && (
                  <div className="mb-6">
                    <h4 className="font-semibold text-lg">Your Answer Transcript:</h4>
                    <blockquote className="text-sm text-gray-600 p-3 bg-gray-100 rounded-md mt-2 border-l-4 border-primary italic">
                      {transcript}
                    </blockquote>
                  </div>
                )}
                <Accordion type="single" collapsible defaultValue="item-1" className="w-full">
                  <AccordionItem value="item-1">
                    <AccordionTrigger className="text-xl font-semibold">Correctness</AccordionTrigger>
                    <AccordionContent className="text-base text-gray-600 space-y-3 pt-2">
                      <p>{feedback.correctness}</p>
                      <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => handleSpeakFeedback(feedback.correctness, 'correctness')}
                          disabled={!!speakingFeedbackKey}
                      >
                          {speakingFeedbackKey === 'correctness' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Volume2 className="h-4 w-4"/>}
                          <span className="ml-2">Read Aloud</span>
                      </Button>
                    </AccordionContent>
                  </AccordionItem>
                  <AccordionItem value="item-2">
                    <AccordionTrigger className="text-xl font-semibold">Completeness</AccordionTrigger>
                    <AccordionContent className="text-base text-gray-600 space-y-3 pt-2">
                      <p>{feedback.completeness}</p>
                      <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => handleSpeakFeedback(feedback.completeness, 'completeness')}
                          disabled={!!speakingFeedbackKey}
                      >
                          {speakingFeedbackKey === 'completeness' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Volume2 className="h-4 w-4"/>}
                          <span className="ml-2">Read Aloud</span>
                      </Button>
                    </AccordionContent>
                  </AccordionItem>
                  <AccordionItem value="item-3">
                    <AccordionTrigger className="text-xl font-semibold">Clarity</AccordionTrigger>
                    <AccordionContent className="text-base text-gray-600 space-y-3 pt-2">
                      <p>{feedback.clarity}</p>
                      <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => handleSpeakFeedback(feedback.clarity, 'clarity')}
                          disabled={!!speakingFeedbackKey}
                      >
                          {speakingFeedbackKey === 'clarity' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Volume2 className="h-4 w-4"/>}
                          <span className="ml-2">Read Aloud</span>
                      </Button>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </CardContent>
            </Card>
          )}

          {error && (
              <Card className="mt-8 border-destructive bg-destructive/10">
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
      </main>
    </div>
  );
}
