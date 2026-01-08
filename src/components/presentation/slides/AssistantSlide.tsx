import { Bot, MessageSquare, Lightbulb } from 'lucide-react';

export function AssistantSlide() {
  return (
    <div className="w-full space-y-8">
      <h2 className="text-3xl font-bold text-white text-center">Assistant IA</h2>
      <div className="grid grid-cols-3 gap-6 max-w-4xl mx-auto">
        <div className="bg-white/5 rounded-xl p-6">
          <Bot className="w-8 h-8 text-primary mb-4" />
          <h3 className="text-white font-semibold mb-2">Intelligence artificielle</h3>
          <p className="text-white/60 text-sm">Powered by GPT pour des analyses contextuelles</p>
        </div>
        <div className="bg-white/5 rounded-xl p-6">
          <MessageSquare className="w-8 h-8 text-chart-1 mb-4" />
          <h3 className="text-white font-semibold mb-2">Conversation</h3>
          <p className="text-white/60 text-sm">Interface de chat naturelle et intuitive</p>
        </div>
        <div className="bg-white/5 rounded-xl p-6">
          <Lightbulb className="w-8 h-8 text-yellow-400 mb-4" />
          <h3 className="text-white font-semibold mb-2">Recommandations</h3>
          <p className="text-white/60 text-sm">Suggestions basées sur le contexte de veille</p>
        </div>
      </div>
    </div>
  );
}
