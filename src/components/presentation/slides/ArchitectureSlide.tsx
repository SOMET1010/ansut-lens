import { Server, Database, Cloud } from 'lucide-react';

export function ArchitectureSlide() {
  return (
    <div className="w-full space-y-8">
      <h2 className="text-3xl font-bold text-white text-center">Architecture Technique</h2>
      <div className="grid grid-cols-3 gap-6 max-w-4xl mx-auto">
        <div className="bg-white/5 rounded-xl p-6">
          <Cloud className="w-8 h-8 text-primary mb-4" />
          <h3 className="text-white font-semibold mb-2">Frontend</h3>
          <ul className="text-white/60 text-sm space-y-1">
            <li>• React + TypeScript</li>
            <li>• Tailwind CSS</li>
            <li>• Vite</li>
          </ul>
        </div>
        <div className="bg-white/5 rounded-xl p-6">
          <Server className="w-8 h-8 text-chart-2 mb-4" />
          <h3 className="text-white font-semibold mb-2">Backend</h3>
          <ul className="text-white/60 text-sm space-y-1">
            <li>• Edge Functions</li>
            <li>• Cron Jobs</li>
            <li>• API REST</li>
          </ul>
        </div>
        <div className="bg-white/5 rounded-xl p-6">
          <Database className="w-8 h-8 text-chart-3 mb-4" />
          <h3 className="text-white font-semibold mb-2">Data</h3>
          <ul className="text-white/60 text-sm space-y-1">
            <li>• PostgreSQL</li>
            <li>• RLS Policies</li>
            <li>• Realtime</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
