import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Loader2, Download } from 'lucide-react';

export type PageFormat = 'a4' | 'letter';
export type MarginPreset = 'narrow' | 'normal' | 'wide';

export interface ExportOptions {
  format: 'pdf' | 'docx';
  pageFormat: PageFormat;
  margin: MarginPreset;
  filename: string;
  headerText: string;
  footerText: string;
  showPageNumbers: boolean;
  watermarkEnabled: boolean;
  watermarkText: string;
}

const STORAGE_KEY = 'assistant:export-options:v1';

export const defaultExportOptions = (baseTitle: string): ExportOptions => ({
  format: 'pdf',
  pageFormat: 'a4',
  margin: 'normal',
  filename: baseTitle,
  headerText: 'ANSUT — Document confidentiel',
  footerText: 'ANSUT — Document confidentiel',
  showPageNumbers: true,
  watermarkEnabled: false,
  watermarkText: 'CONFIDENTIEL',
});

export const loadExportOptions = (baseTitle: string): ExportOptions => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return { ...defaultExportOptions(baseTitle), ...parsed, filename: baseTitle };
    }
  } catch { /* noop */ }
  return defaultExportOptions(baseTitle);
};

const persist = (opts: ExportOptions) => {
  try {
    const { filename: _f, ...rest } = opts;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(rest));
  } catch { /* noop */ }
};

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  baseTitle: string;
  onExport: (opts: ExportOptions) => void;
  isExporting: boolean;
}

export function ExportSettingsDialog({ open, onOpenChange, baseTitle, onExport, isExporting }: Props) {
  const [opts, setOpts] = useState<ExportOptions>(() => loadExportOptions(baseTitle));

  useEffect(() => {
    if (open) setOpts((prev) => ({ ...loadExportOptions(baseTitle), format: prev.format }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, baseTitle]);

  const update = <K extends keyof ExportOptions>(k: K, v: ExportOptions[K]) =>
    setOpts((p) => ({ ...p, [k]: v }));

  const handleSubmit = () => {
    persist(opts);
    onExport(opts);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Personnaliser l'export</DialogTitle>
          <DialogDescription>
            Format, marges, en-tête, pied de page et filigrane.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={opts.format} onValueChange={(v) => update('format', v as 'pdf' | 'docx')} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="pdf">PDF</TabsTrigger>
            <TabsTrigger value="docx">DOCX</TabsTrigger>
          </TabsList>
          <TabsContent value="pdf" />
          <TabsContent value="docx" />
        </Tabs>

        <div className="grid gap-4 py-2">
          <div className="grid gap-2">
            <Label htmlFor="filename">Nom du fichier</Label>
            <Input
              id="filename"
              value={opts.filename}
              onChange={(e) => update('filename', e.target.value)}
              placeholder="document"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label>Format de page</Label>
              <Select value={opts.pageFormat} onValueChange={(v) => update('pageFormat', v as PageFormat)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="a4">A4 (210 × 297 mm)</SelectItem>
                  <SelectItem value="letter">US Letter (8.5 × 11 in)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Marges</Label>
              <Select value={opts.margin} onValueChange={(v) => update('margin', v as MarginPreset)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="narrow">Étroites (1.25 cm)</SelectItem>
                  <SelectItem value="normal">Normales (2.5 cm)</SelectItem>
                  <SelectItem value="wide">Larges (3.5 cm)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="header">Texte d'en-tête</Label>
            <Input
              id="header"
              value={opts.headerText}
              onChange={(e) => update('headerText', e.target.value)}
              placeholder="ANSUT — Document confidentiel"
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="footer">Texte de pied de page</Label>
            <Input
              id="footer"
              value={opts.footerText}
              onChange={(e) => update('footerText', e.target.value)}
              placeholder="ANSUT — Document confidentiel"
            />
          </div>

          <div className="flex items-center justify-between rounded-md border p-3">
            <div>
              <Label className="text-sm">Numéros de page</Label>
              <p className="text-xs text-muted-foreground">Afficher Page X / Y dans le pied de page</p>
            </div>
            <Switch checked={opts.showPageNumbers} onCheckedChange={(v) => update('showPageNumbers', v)} />
          </div>

          <div className="rounded-md border p-3 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm">Filigrane</Label>
                <p className="text-xs text-muted-foreground">Texte diagonal en arrière-plan de chaque page</p>
              </div>
              <Switch checked={opts.watermarkEnabled} onCheckedChange={(v) => update('watermarkEnabled', v)} />
            </div>
            {opts.watermarkEnabled && (
              <Input
                value={opts.watermarkText}
                onChange={(e) => update('watermarkText', e.target.value)}
                placeholder="CONFIDENTIEL"
              />
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isExporting}>
            Annuler
          </Button>
          <Button onClick={handleSubmit} disabled={isExporting || !opts.filename.trim()}>
            {isExporting ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Export…</>
            ) : (
              <><Download className="h-4 w-4 mr-2" />Télécharger {opts.format.toUpperCase()}</>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
