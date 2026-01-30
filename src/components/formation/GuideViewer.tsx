import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { cn } from '@/lib/utils';

interface GuideViewerProps {
  content: string;
  className?: string;
}

// Fonction de slugification pour générer des IDs uniques
const slugify = (text: string): string => {
  return text
    .toString()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Supprimer accents
    .replace(/[^a-z0-9]+/g, '-')     // Remplacer espaces/spéciaux par -
    .replace(/^-+|-+$/g, '');        // Supprimer - en début/fin
};

export function GuideViewer({ content, className }: GuideViewerProps) {
  return (
    <div className={cn("prose prose-sm max-w-none", className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => {
            const id = slugify(String(children));
            return (
              <h1 id={id} className="text-2xl font-bold text-black mb-4 mt-6 first:mt-0 border-b border-gray-200 pb-2 scroll-mt-4">
                {children}
              </h1>
            );
          },
          h2: ({ children }) => {
            const id = slugify(String(children));
            return (
              <h2 id={id} className="text-xl font-semibold text-black mb-3 mt-5 scroll-mt-4">
                {children}
              </h2>
            );
          },
          h3: ({ children }) => {
            const id = slugify(String(children));
            return (
              <h3 id={id} className="text-lg font-semibold text-gray-800 mb-2 mt-4 scroll-mt-4">
                {children}
              </h3>
            );
          },
          h4: ({ children }) => {
            const id = slugify(String(children));
            return (
              <h4 id={id} className="text-base font-semibold text-gray-800 mb-2 mt-3 scroll-mt-4">
                {children}
              </h4>
            );
          },
          p: ({ children }) => (
            <p className="text-gray-700 mb-3 leading-relaxed text-sm">
              {children}
            </p>
          ),
          ul: ({ children }) => (
            <ul className="list-disc list-inside mb-3 text-gray-700 text-sm space-y-1">
              {children}
            </ul>
          ),
          ol: ({ children }) => (
            <ol className="list-decimal list-inside mb-3 text-gray-700 text-sm space-y-1">
              {children}
            </ol>
          ),
          li: ({ children }) => (
            <li className="text-gray-700">{children}</li>
          ),
          table: ({ children }) => (
            <div className="overflow-x-auto mb-4">
              <table className="min-w-full border border-gray-300 text-sm">
                {children}
              </table>
            </div>
          ),
          thead: ({ children }) => (
            <thead className="bg-gray-100">{children}</thead>
          ),
          th: ({ children }) => (
            <th className="border border-gray-300 px-3 py-2 text-left font-semibold text-gray-800">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="border border-gray-300 px-3 py-2 text-gray-700">
              {children}
            </td>
          ),
          blockquote: ({ children }) => (
            <blockquote className="border-l-4 border-amber-400 bg-amber-50 pl-4 py-2 my-3 text-gray-700 text-sm">
              {children}
            </blockquote>
          ),
          code: ({ children, className }) => {
            const isInline = !className;
            if (isInline) {
              return (
                <code className="bg-gray-100 px-1.5 py-0.5 rounded text-sm font-mono text-gray-800">
                  {children}
                </code>
              );
            }
            return (
              <code className="block bg-gray-100 p-3 rounded text-sm font-mono text-gray-800 overflow-x-auto">
                {children}
              </code>
            );
          },
          pre: ({ children }) => (
            <pre className="bg-gray-100 p-3 rounded mb-3 overflow-x-auto">
              {children}
            </pre>
          ),
          hr: () => (
            <hr className="my-6 border-gray-200" />
          ),
          a: ({ href, children }) => (
            <a 
              href={href} 
              className="text-blue-600 hover:underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              {children}
            </a>
          ),
          strong: ({ children }) => (
            <strong className="font-semibold text-gray-900">{children}</strong>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
