import React, { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Youtube, Facebook, FileText, Mail, Mic, Upload, Download, Globe, Video, BookOpen, Type } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

type AppType = 'youtube' | 'facebook' | 'landingpage' | 'webinar' | 'storytelling' | 'headlines' | 'email' | 'blog' | null;

interface AppConfig {
  id: AppType;
  title: string;
  description: string;
  icon: React.ReactNode;
  questions: { id: string; label: string; type: 'text' | 'textarea'; placeholder: string }[];
}

const apps: AppConfig[] = [
  {
    id: 'youtube',
    title: 'YouTube-Skript',
    description: 'Erstellen Sie ansprechende YouTube-Video-Skripte',
    icon: <Youtube className="h-6 w-6" />,
    questions: [
      { id: 'topic', label: 'Video-Thema', type: 'text', placeholder: 'Z.B., Wie man ein Unternehmen gründet' },
      { id: 'duration', label: 'Videodauer (Minuten)', type: 'text', placeholder: 'Z.B., 10' },
      { id: 'tone', label: 'Tonfall', type: 'text', placeholder: 'Z.B., Bildend, Unterhaltsam' },
      { id: 'audience', label: 'Zielgruppe', type: 'text', placeholder: 'Z.B., Unternehmer, Studenten' },
    ]
  },
  {
    id: 'facebook',
    title: 'Facebook-Anzeige',
    description: 'Erstellen Sie überzeugende Facebook-Werbetexte',
    icon: <Facebook className="h-6 w-6" />,
    questions: [
      { id: 'product', label: 'Produkt/Dienstleistung', type: 'text', placeholder: 'Was verkaufen Sie?' },
      { id: 'benefit', label: 'Hauptvorteil', type: 'textarea', placeholder: 'Welches Problem löst es?' },
      { id: 'audience', label: 'Zielgruppe', type: 'text', placeholder: 'Wer ist Ihr idealer Kunde?' },
      { id: 'cta', label: 'Handlungsaufforderung', type: 'text', placeholder: 'Z.B., Jetzt kaufen, Mehr erfahren' },
    ]
  },
  {
    id: 'landingpage',
    title: 'Landing Page',
    description: 'Erstellen Sie überzeugende Landing-Page-Texte',
    icon: <Globe className="h-6 w-6" />,
    questions: [
      { id: 'product', label: 'Produkt/Angebot', type: 'text', placeholder: 'Was bieten Sie an?' },
      { id: 'headline', label: 'Gewünschte Überschrift', type: 'text', placeholder: 'Hauptbotschaft der Seite' },
      { id: 'benefits', label: 'Hauptvorteile', type: 'textarea', placeholder: 'Listen Sie die wichtigsten Vorteile auf' },
      { id: 'audience', label: 'Zielgruppe', type: 'text', placeholder: 'Wer soll angesprochen werden?' },
    ]
  },
  {
    id: 'webinar',
    title: 'Webinar',
    description: 'Erstellen Sie strukturierte Webinar-Inhalte',
    icon: <Video className="h-6 w-6" />,
    questions: [
      { id: 'topic', label: 'Webinar-Thema', type: 'text', placeholder: 'Worum geht es im Webinar?' },
      { id: 'duration', label: 'Dauer (Minuten)', type: 'text', placeholder: 'Z.B., 45, 60' },
      { id: 'objectives', label: 'Lernziele', type: 'textarea', placeholder: 'Was sollen die Teilnehmer lernen?' },
      { id: 'audience', label: 'Zielgruppe', type: 'text', placeholder: 'Wer nimmt teil?' },
    ]
  },
  {
    id: 'storytelling',
    title: 'Storytelling',
    description: 'Erstellen Sie fesselnde Geschichten für Ihr Marketing',
    icon: <BookOpen className="h-6 w-6" />,
    questions: [
      { id: 'brand', label: 'Marke/Unternehmen', type: 'text', placeholder: 'Um welche Marke geht es?' },
      { id: 'message', label: 'Kernbotschaft', type: 'textarea', placeholder: 'Was soll vermittelt werden?' },
      { id: 'emotion', label: 'Gewünschte Emotion', type: 'text', placeholder: 'Z.B., Inspiration, Vertrauen' },
      { id: 'format', label: 'Format', type: 'text', placeholder: 'Z.B., Video, Blog, Social Media' },
    ]
  },
  {
    id: 'headlines',
    title: 'Headlines',
    description: 'Generieren Sie aufmerksamkeitsstarke Überschriften',
    icon: <Type className="h-6 w-6" />,
    questions: [
      { id: 'topic', label: 'Thema/Produkt', type: 'text', placeholder: 'Wofür brauchen Sie Headlines?' },
      { id: 'style', label: 'Stil', type: 'text', placeholder: 'Z.B., Dringend, Neugierig, Professionell' },
      { id: 'count', label: 'Anzahl der Headlines', type: 'text', placeholder: 'Z.B., 5, 10' },
      { id: 'platform', label: 'Plattform', type: 'text', placeholder: 'Z.B., E-Mail, Webseite, Anzeige' },
    ]
  },
  {
    id: 'email',
    title: 'E-Mail-Kampagne',
    description: 'Schreiben Sie effektive E-Mail-Marketing-Texte',
    icon: <Mail className="h-6 w-6" />,
    questions: [
      { id: 'subject', label: 'E-Mail-Zweck', type: 'text', placeholder: 'Z.B., Produkteinführung, Newsletter' },
      { id: 'offer', label: 'Angebot/Nachricht', type: 'textarea', placeholder: 'Was bieten Sie an?' },
      { id: 'audience', label: 'Empfänger', type: 'text', placeholder: 'An wen senden Sie?' },
    ]
  },
  {
    id: 'blog',
    title: 'Blogbeitrag',
    description: 'Erstellen Sie SEO-optimierte Blog-Inhalte',
    icon: <FileText className="h-6 w-6" />,
    questions: [
      { id: 'topic', label: 'Blog-Thema', type: 'text', placeholder: 'Worum geht es in Ihrem Blog?' },
      { id: 'keywords', label: 'Schlüsselwörter', type: 'text', placeholder: 'Z.B., SEO, Marketing, Geschäft' },
      { id: 'length', label: 'Ungefähre Länge (Wörter)', type: 'text', placeholder: 'Z.B., 500, 1000' },
      { id: 'style', label: 'Schreibstil', type: 'text', placeholder: 'Z.B., Professionell, Locker, Technisch' },
    ]
  }
];

const AppsGenerator = () => {
  const [selectedApp, setSelectedApp] = useState<AppType>(null);
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedContent, setGeneratedContent] = useState<string>('');
  const [uploadedPdfText, setUploadedPdfText] = useState<string>('');
  const [uploadedFileName, setUploadedFileName] = useState<string>('');
  const [isRecording, setIsRecording] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const currentApp = apps.find(app => app.id === selectedApp);

  const handleInputChange = (id: string, value: string) => {
    setFormData(prev => ({ ...prev, [id]: value }));
  };

  // Voice recording using native Web Speech API (instant transcription)
  const startRecording = (fieldId: string) => {
    try {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (!SpeechRecognition) {
        console.error('Speech recognition not supported');
        return;
      }

      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'de-DE';

      recognition.onstart = () => setIsRecording(fieldId);
      
      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        const currentValue = formData[fieldId] || '';
        handleInputChange(fieldId, currentValue ? `${currentValue} ${transcript}` : transcript);
      };
      
      recognition.onerror = () => setIsRecording(null);
      recognition.onend = () => setIsRecording(null);
      
      recognition.start();
    } catch (err) {
      console.error('Microphone error:', err);
      setIsRecording(null);
    }
  };

  const stopRecording = () => {
    setIsRecording(null);
  };

  // PDF extraction function
  const extractTextFromPdf = async (file: File): Promise<string> => {
    const pdfjsLib = await import('pdfjs-dist');
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;
    
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    let fullText = '';
    
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        .map((item: any) => item.str)
        .join(' ');
      fullText += pageText + '\n';
    }
    
    return fullText;
  };

  // Word extraction function
  const extractTextFromWord = async (file: File): Promise<string> => {
    const mammoth = await import('mammoth');
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer });
    return result.value;
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const isPdf = file.type === 'application/pdf';
    const isWord = file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || 
                   file.type === 'application/msword' ||
                   file.name.endsWith('.docx') ||
                   file.name.endsWith('.doc');

    if (!isPdf && !isWord) return;

    try {
      let text = '';
      if (isPdf) {
        text = await extractTextFromPdf(file);
      } else if (isWord) {
        text = await extractTextFromWord(file);
      }
      setUploadedPdfText(text);
      setUploadedFileName(file.name);
    } catch (error) {
      console.error('File extraction error:', error);
      setUploadedFileName('');
    }
  };

  // Download as PDF function
  const downloadAsPdf = async () => {
    if (!generatedContent) return;

    // Create a simple HTML document for printing
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>${currentApp?.title || 'Generierter Inhalt'}</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              padding: 40px;
              line-height: 1.6;
              max-width: 800px;
              margin: 0 auto;
            }
            h1 { font-size: 24px; margin-bottom: 20px; }
            h2 { font-size: 20px; margin-top: 20px; }
            h3 { font-size: 18px; margin-top: 16px; }
            p { margin: 10px 0; }
            ul, ol { margin: 10px 0; padding-left: 20px; }
            pre { background: #f4f4f4; padding: 10px; border-radius: 4px; overflow-x: auto; }
            code { background: #f4f4f4; padding: 2px 6px; border-radius: 3px; }
          </style>
        </head>
        <body>
          <h1>${currentApp?.title || 'Generierter Inhalt'}</h1>
          ${generatedContent.replace(/\n/g, '<br>')}
        </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
    printWindow.print();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentApp) return;

    setIsGenerating(true);
    setGeneratedContent('');

    try {
      let response;
      const dataWithPdf = uploadedPdfText 
        ? { ...formData, pdfContent: uploadedPdfText }
        : formData;
      
      if (selectedApp === 'youtube') {
        response = await fetch('https://mahmous-chatbot3.hf.space/youtube-script', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            topic: formData.topic || '',
            duration_minutes: formData.duration || '',
            tone: formData.tone || '',
            target_audience: formData.audience || '',
            pdfContent: uploadedPdfText || undefined
          })
        });
      } else {
        response = await fetch('https://mahmous-chatbot3.hf.space/generate-content', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            appType: selectedApp,
            data: dataWithPdf
          })
        });
      }

      const result = await response.json();
      
      if (!response.ok) {
        setGeneratedContent(result.error || 'Fehler beim Generieren des Inhalts. Bitte versuchen Sie es erneut.');
      } else {
        setGeneratedContent(result.script || result.content || result.generated_content || 'Kein Inhalt generiert');
      }
    } catch (error) {
      console.error('Generation error:', error);
      setGeneratedContent('Fehler beim Generieren des Inhalts. Bitte versuchen Sie es erneut.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleReset = () => {
    setSelectedApp(null);
    setFormData({});
    setGeneratedContent('');
    setUploadedPdfText('');
    setUploadedFileName('');
  };

  if (!selectedApp) {
    return (
      <div className="p-6 md:p-8 max-w-7xl mx-auto">
        <div className="mb-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-3 bg-gradient-to-r from-primary via-primary/80 to-primary/60 bg-clip-text text-transparent">
            KI-Inhaltsgeneratoren
          </h2>
          <p className="text-muted-foreground text-lg">Wählen Sie einen Generator, um sofort professionelle Inhalte zu erstellen</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {apps.map((app) => (
            <Card 
              key={app.id}
              className="group cursor-pointer border-2 hover:border-primary/50 transition-all duration-300 hover:shadow-xl hover:-translate-y-1 bg-gradient-to-br from-background to-muted/20"
              onClick={() => setSelectedApp(app.id)}
            >
              <CardHeader className="space-y-3">
                <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform duration-300">
                  {app.icon}
                </div>
                <CardTitle className="text-xl group-hover:text-primary transition-colors">{app.title}</CardTitle>
                <CardDescription className="text-base">{app.description}</CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto animate-fade-in">
      <div className="mb-6">
        <Button variant="ghost" onClick={handleReset} className="hover:bg-primary/10">
          ← Zurück zu Apps
        </Button>
      </div>

      <div className="flex flex-col gap-6">
        {/* Form Section */}
        <Card className="border-2 shadow-lg bg-gradient-to-br from-background to-muted/20">
          <CardHeader className="space-y-4 pb-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                {currentApp?.icon}
              </div>
              <div>
                <CardTitle className="text-2xl">{currentApp?.title}</CardTitle>
                <CardDescription className="text-base mt-1">{currentApp?.description}</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {/* PDF Upload Section */}
            <div className="mb-6 p-4 border-2 border-dashed rounded-lg border-muted-foreground/30 hover:border-primary/50 transition-colors">
              <input
                type="file"
                ref={fileInputRef}
                accept="application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,.pdf,.doc,.docx"
                onChange={handleFileUpload}
                className="hidden"
              />
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Upload className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium">Dokument hochladen (optional)</p>
                    <p className="text-sm text-muted-foreground">
                      {uploadedFileName ? (
                        <span className="text-primary font-medium">✓ {uploadedFileName}</span>
                      ) : (
                        'Text wird extrahiert und mitgesendet'
                      )}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {uploadedFileName && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setUploadedPdfText('');
                        setUploadedFileName('');
                        if (fileInputRef.current) fileInputRef.current.value = '';
                      }}
                      className="text-destructive hover:text-destructive"
                    >
                      Entfernen
                    </Button>
                  )}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    {uploadedFileName ? 'Andere Datei' : 'Datei wählen'}
                  </Button>
                </div>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {currentApp?.questions.map((question, index) => (
                <div key={question.id} className="space-y-2 animate-fade-in" style={{ animationDelay: `${index * 0.1}s` }}>
                  <Label htmlFor={question.id} className="text-base font-medium">{question.label}</Label>
                  <div className="flex gap-2">
                    {question.type === 'textarea' ? (
                      <Textarea
                        id={question.id}
                        placeholder={question.placeholder}
                        value={formData[question.id] || ''}
                        onChange={(e) => handleInputChange(question.id, e.target.value)}
                        required
                        className="min-h-[100px] border-2 focus:border-primary/50 transition-colors flex-1"
                      />
                    ) : (
                      <Input
                        id={question.id}
                        type="text"
                        placeholder={question.placeholder}
                        value={formData[question.id] || ''}
                        onChange={(e) => handleInputChange(question.id, e.target.value)}
                        required
                        className="border-2 focus:border-primary/50 transition-colors flex-1"
                      />
                    )}
                    <Button
                      type="button"
                      variant={isRecording === question.id ? "destructive" : "outline"}
                      size="icon"
                      className="shrink-0"
                      onClick={() => {
                        if (isRecording === question.id) {
                          stopRecording();
                        } else {
                          startRecording(question.id);
                        }
                      }}
                    >
                      <Mic className={`h-4 w-4 ${isRecording === question.id ? 'animate-pulse' : ''}`} />
                    </Button>
                  </div>
                  {isRecording === question.id && (
                    <p className="text-sm text-destructive animate-pulse">🎤 Aufnahme läuft... Klicken Sie erneut zum Stoppen</p>
                  )}
                </div>
              ))}
              <div className="flex justify-center">
                <Button
                  type="submit"
                  className="px-4 py-2 text-sm font-semibold bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 transition-all duration-300 shadow-md hover:shadow-lg"
                  disabled={isGenerating}
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Wird erstellt...
                    </>
                  ) : (
                    'Inhalt generieren'
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Result Section */}
        <Card className="flex flex-col border-2 shadow-lg bg-gradient-to-br from-background to-muted/20">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-2xl">Generierter Inhalt</CardTitle>
                <CardDescription className="text-base">
                  {generatedContent ? '✨ Ihr KI-generierter Inhalt ist bereit' : 'Füllen Sie das Formular aus und klicken Sie auf Generieren'}
                </CardDescription>
              </div>
              {generatedContent && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={downloadAsPdf}
                  className="flex items-center gap-2"
                >
                  <Download className="h-4 w-4" />
                  Als PDF herunterladen
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="flex-1">
            <ScrollArea className="h-[500px] pr-4">
              {isGenerating ? (
                <div className="flex flex-col items-center justify-center h-full space-y-4">
                  <Loader2 className="h-12 w-12 animate-spin text-primary" />
                  <p className="text-muted-foreground animate-pulse">Ihr Inhalt wird erstellt...</p>
                </div>
              ) : generatedContent ? (
                <div className="prose prose-sm dark:prose-invert max-w-none animate-fade-in [&>h1]:text-2xl [&>h2]:text-xl [&>h3]:text-lg [&>p]:leading-relaxed [&>ul]:my-4 [&>ol]:my-4">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {generatedContent}
                  </ReactMarkdown>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-center space-y-3">
                  <FileText className="h-16 w-16 text-muted-foreground/30" />
                  <p className="text-muted-foreground">Noch kein Inhalt generiert</p>
                  <p className="text-sm text-muted-foreground/70">Füllen Sie das Formular aus, um zu beginnen</p>
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AppsGenerator;
