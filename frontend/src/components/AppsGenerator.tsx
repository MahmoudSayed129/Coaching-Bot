import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Youtube, Facebook, FileText, Mail, Instagram } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

type AppType = 'youtube' | 'facebook' | 'instagram' | 'email' | 'blog' | null;

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
    title: 'YouTube Script',
    description: 'Generate engaging YouTube video scripts',
    icon: <Youtube className="h-6 w-6" />,
    questions: [
      { id: 'topic', label: 'Video Topic', type: 'text', placeholder: 'E.g., How to start a business' },
      { id: 'duration', label: 'Video Duration (minutes)', type: 'text', placeholder: 'E.g., 10' },
      { id: 'tone', label: 'Tone', type: 'text', placeholder: 'E.g., Educational, Entertaining' },
      { id: 'audience', label: 'Target Audience', type: 'text', placeholder: 'E.g., Entrepreneurs, Students' },
    ]
  },
  {
    id: 'facebook',
    title: 'Facebook Ad',
    description: 'Create compelling Facebook ad copy',
    icon: <Facebook className="h-6 w-6" />,
    questions: [
      { id: 'product', label: 'Product/Service', type: 'text', placeholder: 'What are you selling?' },
      { id: 'benefit', label: 'Main Benefit', type: 'textarea', placeholder: 'What problem does it solve?' },
      { id: 'audience', label: 'Target Audience', type: 'text', placeholder: 'Who is your ideal customer?' },
      { id: 'cta', label: 'Call to Action', type: 'text', placeholder: 'E.g., Shop Now, Learn More' },
    ]
  },
  {
    id: 'instagram',
    title: 'Instagram Caption',
    description: 'Generate engaging Instagram captions',
    icon: <Instagram className="h-6 w-6" />,
    questions: [
      { id: 'topic', label: 'Post Topic', type: 'text', placeholder: 'What is your post about?' },
      { id: 'mood', label: 'Mood/Style', type: 'text', placeholder: 'E.g., Motivational, Funny, Professional' },
      { id: 'hashtags', label: 'Number of Hashtags', type: 'text', placeholder: 'E.g., 5-10' },
    ]
  },
  {
    id: 'email',
    title: 'Email Campaign',
    description: 'Write effective email marketing copy',
    icon: <Mail className="h-6 w-6" />,
    questions: [
      { id: 'subject', label: 'Email Purpose', type: 'text', placeholder: 'E.g., Product launch, Newsletter' },
      { id: 'offer', label: 'Offer/Message', type: 'textarea', placeholder: 'What are you offering?' },
      { id: 'audience', label: 'Recipient', type: 'text', placeholder: 'Who are you sending to?' },
    ]
  },
  {
    id: 'blog',
    title: 'Blog Post',
    description: 'Create SEO-optimized blog content',
    icon: <FileText className="h-6 w-6" />,
    questions: [
      { id: 'topic', label: 'Blog Topic', type: 'text', placeholder: 'What is your blog about?' },
      { id: 'keywords', label: 'Keywords', type: 'text', placeholder: 'E.g., SEO, marketing, business' },
      { id: 'length', label: 'Approximate Length (words)', type: 'text', placeholder: 'E.g., 500, 1000' },
      { id: 'style', label: 'Writing Style', type: 'text', placeholder: 'E.g., Professional, Casual, Technical' },
    ]
  }
];

const AppsGenerator = () => {
  const [selectedApp, setSelectedApp] = useState<AppType>(null);
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedContent, setGeneratedContent] = useState<string>('');

  const currentApp = apps.find(app => app.id === selectedApp);

  const handleInputChange = (id: string, value: string) => {
    setFormData(prev => ({ ...prev, [id]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentApp) return;

    setIsGenerating(true);
    setGeneratedContent('');

    try {
      let response;
      
      if (selectedApp === 'youtube') {
        // YouTube script has its own endpoint with specific field names
        response = await fetch('https://mahmous-chatbot3.hf.space/youtube-script', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            topic: formData.topic || '',
            duration_minutes: formData.duration || '',
            tone: formData.tone || '',
            target_audience: formData.audience || ''
          })
        });
      } else {
        // Other apps use the generic endpoint
        response = await fetch('https://mahmous-chatbot3.hf.space/generate-content', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            appType: selectedApp,
            data: formData
          })
        });
      }

      const result = await response.json();
      
      if (!response.ok) {
        setGeneratedContent(result.error || 'Error generating content. Please try again.');
      } else {
        // YouTube returns 'script', others return 'content' or 'generated_content'
        setGeneratedContent(result.script || result.content || result.generated_content || 'No content generated');
      }
    } catch (error) {
      console.error('Generation error:', error);
      setGeneratedContent('Error generating content. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleReset = () => {
    setSelectedApp(null);
    setFormData({});
    setGeneratedContent('');
  };

  if (!selectedApp) {
    return (
      <div className="p-6 md:p-8 max-w-7xl mx-auto">
        <div className="mb-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-3 bg-gradient-to-r from-primary via-primary/80 to-primary/60 bg-clip-text text-transparent">
            AI Content Generators
          </h2>
          <p className="text-muted-foreground text-lg">Choose a generator to create professional content instantly</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
          ← Back to Apps
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
            <form onSubmit={handleSubmit} className="space-y-5">
              {currentApp?.questions.map((question, index) => (
                <div key={question.id} className="space-y-2 animate-fade-in" style={{ animationDelay: `${index * 0.1}s` }}>
                  <Label htmlFor={question.id} className="text-base font-medium">{question.label}</Label>
                  {question.type === 'textarea' ? (
                    <Textarea
                      id={question.id}
                      placeholder={question.placeholder}
                      value={formData[question.id] || ''}
                      onChange={(e) => handleInputChange(question.id, e.target.value)}
                      required
                      className="min-h-[100px] border-2 focus:border-primary/50 transition-colors"
                    />
                  ) : (
                    <Input
                      id={question.id}
                      type="text"
                      placeholder={question.placeholder}
                      value={formData[question.id] || ''}
                      onChange={(e) => handleInputChange(question.id, e.target.value)}
                      required
                      className="border-2 focus:border-primary/50 transition-colors"
                    />
                  )}
                </div>
              ))}
              <Button 
                type="submit" 
                className="w-full h-12 text-lg font-semibold bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 transition-all duration-300 shadow-lg hover:shadow-xl" 
                disabled={isGenerating}
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Generating...
                  </>
                ) : (
                  'Generate Content'
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Result Section */}
        <Card className="flex flex-col border-2 shadow-lg bg-gradient-to-br from-background to-muted/20">
          <CardHeader className="pb-4">
            <CardTitle className="text-2xl">Generated Content</CardTitle>
            <CardDescription className="text-base">
              {generatedContent ? '✨ Your AI-generated content is ready' : 'Fill the form and click generate'}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-1">
            <ScrollArea className="h-[500px] pr-4">
              {isGenerating ? (
                <div className="flex flex-col items-center justify-center h-full space-y-4">
                  <Loader2 className="h-12 w-12 animate-spin text-primary" />
                  <p className="text-muted-foreground animate-pulse">Creating your content...</p>
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
                  <p className="text-muted-foreground">No content generated yet</p>
                  <p className="text-sm text-muted-foreground/70">Complete the form to get started</p>
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
