import { useMemo, useState } from 'react';
import { Eye, ExternalLink, AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { extractNumericReferenceUrls } from './citationRefs';

interface CitationsPreviewProps {
  content: string;
}

type CitationItem =
  | { kind: 'actu' | 'dossier'; id: string; label: string; url: string }
  | { kind: 'num'; num: string; url: string | null };

const APP_BASE = 'https://ansut-lens.lovable.app';

function extractCitations(content: string): CitationItem[] {
  // Build numeric reference URL map (same regex as PDF/DOCX export)
  const numRefUrls = extractNumericReferenceUrls(content);

  const items: CitationItem[] = [];
  const seen = new Set<string>();
  const re = /(\[\[(ACTU|DOSSIER):([^|\]]+)\|([^\]]+)\]\])|(\[(\d{1,3})\])/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(content)) !== null) {
    if (m[1]) {
      const isActu = m[2] === 'ACTU';
      const id = m[3];
      const label = m[4];
      const key = `${m[2]}:${id}`;
      if (seen.has(key)) continue;
      seen.add(key);
      items.push({
        kind: isActu ? 'actu' : 'dossier',
        id,
        label,
        url: isActu
          ? `${APP_BASE}/radar?tab=flux&id=${encodeURIComponent(id)}`
          : `${APP_BASE}/dossiers?id=${encodeURIComponent(id)}`,
      });
    } else if (m[5]) {
      const num = m[6];
      const key = `NUM:${num}`;
      if (seen.has(key)) continue;
      seen.add(key);
      items.push({ kind: 'num', num, url: numRefUrls[num] || null });
    }
  }
  return items;
}

export function CitationsPreview({ content }: CitationsPreviewProps) {
  const [open, setOpen] = useState(false);
  const items = useMemo(() => extractCitations(content), [content]);

  if (items.length === 0) return null;

  const broken = items.filter((i) => i.kind === 'num' && !i.url).length;
  const total = items.length;

  return (
    <div className="px-4 pt-3 border-t">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-2 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
        aria-expanded={open}
      >
        <span className="flex items-center gap-2">
          <Eye className="h-3.5 w-3.5" />
          Aperçu des liens ({total})
          {broken > 0 && (
            <span className="inline-flex items-center gap-1 text-amber-600">
              <AlertTriangle className="h-3 w-3" />
              {broken} sans URL
            </span>
          )}
        </span>
        {open ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
      </button>

      {open && (
        <div className="pb-3 pt-1 space-y-2 max-h-48 overflow-y-auto">
          <p className="text-[11px] text-muted-foreground italic">
            Rendu approximatif des badges dans le PDF/DOCX exporté.
          </p>
          <div className="flex flex-wrap gap-1.5">
            {items.map((item, idx) => {
              if (item.kind === 'num') {
                if (!item.url) {
                  return (
                    <Badge
                      key={idx}
                      variant="outline"
                      className="border-amber-400 border-dashed bg-amber-50 text-amber-800 font-bold text-[10px] gap-1"
                      title="Lien manquant — apparaîtra non cliquable dans l'export"
                    >
                      <AlertTriangle className="h-2.5 w-2.5" />
                      [{item.num}] · lien manquant
                    </Badge>
                  );
                }
                return (
                  <a
                    key={idx}
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    title={item.url}
                  >
                    <Badge
                      variant="outline"
                      className="border-slate-300 bg-slate-100 text-slate-700 font-bold text-[10px] gap-1 hover:bg-slate-200 cursor-pointer"
                    >
                      [{item.num}]
                      <ExternalLink className="h-2.5 w-2.5" />
                    </Badge>
                  </a>
                );
              }
              const isActu = item.kind === 'actu';
              const truncated =
                item.label.length > 40 ? item.label.slice(0, 39) + '…' : item.label;
              return (
                <a
                  key={idx}
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  title={`${item.label} → ${item.url}`}
                >
                  <Badge
                    variant="outline"
                    className={
                      isActu
                        ? 'border-blue-300 bg-blue-100 text-blue-800 font-bold text-[10px] gap-1 hover:bg-blue-200 cursor-pointer'
                        : 'border-purple-300 bg-purple-100 text-purple-800 font-bold text-[10px] gap-1 hover:bg-purple-200 cursor-pointer'
                    }
                  >
                    <span>{isActu ? '◆' : '■'}</span>
                    {truncated}
                    <ExternalLink className="h-2.5 w-2.5" />
                  </Badge>
                </a>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
