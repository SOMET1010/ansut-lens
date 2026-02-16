import { useSearchParams } from 'react-router-dom';
import { Users } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import PersonnalitesPage from '@/pages/PersonnalitesPage';
import PresenceDigitalePage from '@/pages/PresenceDigitalePage';
import SpdiReviewPage from '@/pages/SpdiReviewPage';
import { SPDIBenchmarkPanel } from '@/components/spdi';
import { useState } from 'react';

const TABS = [
  { value: 'cartographie', label: 'Cartographie' },
  { value: 'spdi', label: 'Dashboard SPDI' },
  { value: 'revue', label: 'Revue Stabilité' },
  { value: 'benchmark', label: 'Benchmark' },
] as const;

type TabValue = typeof TABS[number]['value'];

export default function ActeursInfluencePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const currentTab = (searchParams.get('tab') as TabValue) || 'cartographie';
  const [benchmarkOpen, setBenchmarkOpen] = useState(false);

  const handleTabChange = (value: string) => {
    if (value === 'benchmark') {
      setBenchmarkOpen(true);
      return;
    }
    setSearchParams({ tab: value }, { replace: true });
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <Tabs value={currentTab} onValueChange={handleTabChange}>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2 mr-auto">
            <Users className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold">Acteurs & Influence</h1>
          </div>
          <TabsList>
            {TABS.map((tab) => (
              <TabsTrigger key={tab.value} value={tab.value}>
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        <TabsContent value="cartographie" className="mt-6">
          <PersonnalitesPage />
        </TabsContent>

        <TabsContent value="spdi" className="mt-6">
          <PresenceDigitalePage />
        </TabsContent>

        <TabsContent value="revue" className="mt-6">
          <SpdiReviewPage />
        </TabsContent>
      </Tabs>

      <SPDIBenchmarkPanel
        open={benchmarkOpen}
        onOpenChange={setBenchmarkOpen}
      />
    </div>
  );
}
