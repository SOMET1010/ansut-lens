import { useState } from 'react';
import { Send, Bot, User } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';

const quickPrompts = [
  'Résume les actualités du jour',
  'Quels sont les risques actuels ?',
  'Analyse la couverture média ANSUT',
  'Génère un briefing DG',
];

export default function AssistantPage() {
  const [messages, setMessages] = useState([
    { role: 'assistant', content: 'Bonjour ! Je suis votre assistant IA ANSUT RADAR. Comment puis-je vous aider dans votre veille stratégique ?' }
  ]);
  const [input, setInput] = useState('');

  const handleSend = () => {
    if (!input.trim()) return;
    setMessages([...messages, { role: 'user', content: input }]);
    setInput('');
    // TODO: Implement actual AI call via edge function
    setTimeout(() => {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Je suis en cours de configuration. L\'intégration Lovable AI sera bientôt active.' }]);
    }, 1000);
  };

  return (
    <div className="h-[calc(100vh-8rem)] flex gap-4 animate-fade-in">
      <Card className="flex-1 glass flex flex-col">
        <CardHeader><CardTitle className="flex items-center gap-2"><Bot className="h-5 w-5 text-primary" />Assistant IA</CardTitle></CardHeader>
        <CardContent className="flex-1 flex flex-col">
          <ScrollArea className="flex-1 pr-4">
            <div className="space-y-4">
              {messages.map((msg, i) => (
                <div key={i} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                  <div className={`h-8 w-8 rounded-full flex items-center justify-center ${msg.role === 'assistant' ? 'bg-primary/20 text-primary' : 'bg-secondary/20 text-secondary'}`}>
                    {msg.role === 'assistant' ? <Bot className="h-4 w-4" /> : <User className="h-4 w-4" />}
                  </div>
                  <div className={`max-w-[80%] p-3 rounded-lg ${msg.role === 'assistant' ? 'bg-muted' : 'bg-primary text-primary-foreground'}`}>
                    {msg.content}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
          <div className="flex gap-2 mt-4">
            <Input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Posez votre question..." onKeyPress={(e) => e.key === 'Enter' && handleSend()} />
            <Button onClick={handleSend}><Send className="h-4 w-4" /></Button>
          </div>
        </CardContent>
      </Card>
      <Card className="w-72 glass">
        <CardHeader><CardTitle className="text-sm">Prompts rapides</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {quickPrompts.map((p, i) => (
            <Button key={i} variant="outline" size="sm" className="w-full justify-start text-xs" onClick={() => setInput(p)}>{p}</Button>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
