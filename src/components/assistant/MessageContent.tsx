import { Link } from 'react-router-dom';
import { Newspaper, FileText } from 'lucide-react';

interface MessageContentProps {
  content: string;
}

// Parse message content and replace source citations with clickable links
// Format: [[ACTU:id|titre]] or [[DOSSIER:id|titre]]
export function MessageContent({ content }: MessageContentProps) {
  const parts: React.ReactNode[] = [];
  const regex = /\[\[(ACTU|DOSSIER):([a-f0-9-]+)\|([^\]]+)\]\]/g;
  
  let lastIndex = 0;
  let match;
  
  while ((match = regex.exec(content)) !== null) {
    // Add text before the match
    if (match.index > lastIndex) {
      parts.push(content.slice(lastIndex, match.index));
    }
    
    const [, type, id, title] = match;
    const isActualite = type === 'ACTU';
    const href = isActualite ? `/actualites?id=${id}` : `/dossiers?id=${id}`;
    const Icon = isActualite ? Newspaper : FileText;
    const colorClass = isActualite ? 'text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100' : 'text-purple-600 hover:text-purple-800 bg-purple-50 hover:bg-purple-100';
    
    parts.push(
      <Link
        key={`${type}-${id}-${match.index}`}
        to={href}
        className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium transition-colors ${colorClass}`}
        title={`Voir ${isActualite ? "l'actualité" : 'le dossier'}: ${title}`}
      >
        <Icon className="h-3 w-3" />
        <span className="max-w-[150px] truncate">{title}</span>
      </Link>
    );
    
    lastIndex = match.index + match[0].length;
  }
  
  // Add remaining text
  if (lastIndex < content.length) {
    parts.push(content.slice(lastIndex));
  }
  
  // If no citations found, return plain text
  if (parts.length === 0) {
    return <>{content}</>;
  }
  
  return <>{parts}</>;
}
