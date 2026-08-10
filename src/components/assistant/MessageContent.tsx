import { Link } from 'react-router-dom';
import { Newspaper, FileText, AlertTriangle } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { cleCitation } from './citationValidite';

interface MessageContentProps {
  content: string;
  /** Clés (`TYPE:id`) des citations jugées invalides par la validation edge. */
  invalidKeys?: Set<string>;
}

// Replace [[ACTU:id|titre]] / [[DOSSIER:id|titre]] with placeholder tokens we can re-render after markdown
// We use a non-markdown sentinel pattern to avoid being mangled by remark.
type Citation = { type: 'ACTU' | 'DOSSIER'; id: string; title: string };

function extractCitations(content: string): { text: string; citations: Citation[] } {
  const citations: Citation[] = [];
  const regex = /\[\[(ACTU|DOSSIER):([a-f0-9-]+)\|([^\]]+)\]\]/g;
  const text = content.replace(regex, (_, type, id, title) => {
    const idx = citations.length;
    citations.push({ type: type as 'ACTU' | 'DOSSIER', id, title });
    return `§§CIT${idx}§§`;
  });
  return { text, citations };
}

function CitationBadge({ c, invalide }: { c: Citation; invalide: boolean }) {
  const isActu = c.type === 'ACTU';
  const Icon = isActu ? Newspaper : FileText;

  // Charte de crédibilité : une citation qui ne remonte à aucune source vérifiée
  // n'est PAS un lien. On l'affiche en texte inerte, explicitement marqué, plutôt
  // que de fabriquer un lien cliquable factice (« préférer l'absence à l'artifice »).
  if (invalide) {
    return (
      <span
        className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded border border-border bg-muted text-[11px] font-medium align-baseline mx-0.5 text-muted-foreground"
        title="Source introuvable : cette citation ne correspond à aucun contenu vérifié du contexte."
      >
        <AlertTriangle className="h-3 w-3" />
        <span className="max-w-[180px] truncate line-through decoration-muted-foreground/50">{c.title}</span>
        <span className="not-italic">· source introuvable</span>
      </span>
    );
  }

  const href = isActu ? `/veille?article=${c.id}` : `/publier?id=${c.id}`;
  const cls = isActu
    ? 'text-blue-700 hover:text-blue-900 bg-blue-50 hover:bg-blue-100 border-blue-200'
    : 'text-purple-700 hover:text-purple-900 bg-purple-50 hover:bg-purple-100 border-purple-200';
  return (
    <Link
      to={href}
      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded border text-[11px] font-medium align-baseline mx-0.5 transition-colors ${cls}`}
      title={`Voir ${isActu ? "l'actualité" : 'le dossier'} : ${c.title}`}
    >
      <Icon className="h-3 w-3" />
      <span className="max-w-[180px] truncate">{c.title}</span>
    </Link>
  );
}

function renderWithCitations(
  text: string,
  citations: Citation[],
  invalidKeys?: Set<string>,
): React.ReactNode {
  if (!citations.length) return text;
  const parts = text.split(/(§§CIT\d+§§)/g);
  return parts.map((p, i) => {
    const m = p.match(/^§§CIT(\d+)§§$/);
    if (m) {
      const c = citations[Number(m[1])];
      if (!c) return null;
      const invalide = !!invalidKeys?.has(cleCitation(c.type, c.id));
      return <CitationBadge key={i} c={c} invalide={invalide} />;
    }
    return <span key={i}>{p}</span>;
  });
}

export function MessageContent({ content, invalidKeys }: MessageContentProps) {
  const { text, citations } = extractCitations(content);

  const renderChildren = (children: React.ReactNode): React.ReactNode => {
    if (typeof children === 'string') return renderWithCitations(children, citations, invalidKeys);
    if (Array.isArray(children)) {
      return children.map((child, i) =>
        typeof child === 'string' ? <span key={i}>{renderWithCitations(child, citations, invalidKeys)}</span> : child
      );
    }
    return children;
  };

  return (
    <div className="prose prose-sm max-w-none text-foreground prose-p:my-2 prose-headings:mt-4 prose-headings:mb-2 prose-headings:text-foreground prose-strong:text-foreground prose-li:my-0.5 prose-ul:my-2 prose-ol:my-2 prose-code:text-xs prose-code:bg-muted prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:before:content-none prose-code:after:content-none">
      <ReactMarkdown
        components={{
          p: ({ children }) => <p>{renderChildren(children)}</p>,
          li: ({ children }) => <li>{renderChildren(children)}</li>,
          h1: ({ children }) => <h1 className="text-base font-bold">{renderChildren(children)}</h1>,
          h2: ({ children }) => <h2 className="text-sm font-bold">{renderChildren(children)}</h2>,
          h3: ({ children }) => <h3 className="text-sm font-semibold uppercase tracking-wide">{renderChildren(children)}</h3>,
          strong: ({ children }) => <strong>{renderChildren(children)}</strong>,
          em: ({ children }) => <em>{renderChildren(children)}</em>,
          a: ({ href, children }) => (
            <a href={href} target="_blank" rel="noopener noreferrer" className="text-primary underline underline-offset-2">
              {children}
            </a>
          ),
        }}
      >
        {text}
      </ReactMarkdown>
    </div>
  );
}
