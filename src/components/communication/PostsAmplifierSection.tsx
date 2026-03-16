import { Megaphone, ExternalLink, MessageSquare, RefreshCw } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useSocialInsights } from '@/hooks/useSocialInsights';
import { useCollectSocial } from '@/hooks/useSocialInsights';

const platformIcons: Record<string, string> = {
  linkedin: '🔗',
  twitter: '𝕏',
  facebook: '📘',
  blog: '📝',
  news: '📰',
  forum: '💬',
};

const platformColors: Record<string, string> = {
  linkedin: 'border-l-blue-600',
  twitter: 'border-l-foreground',
  facebook: 'border-l-blue-500',
  blog: 'border-l-emerald-500',
  news: 'border-l-amber-500',
  forum: 'border-l-purple-500',
};

interface Props {
  onPrepareResponse?: (sujet: string) => void;
}

export function PostsAmplifierSection({ onPrepareResponse }: Props) {
  const { data: insights, isLoading } = useSocialInsights(10);
  const { mutate: collectSocial, isPending: collecting } = useCollectSocial();

  // Filter top engagement posts, non-manual, recent
  const topPosts = (insights || [])
    .filter(p => !p.is_manual_entry && p.engagement_score > 0)
    .sort((a, b) => (b.engagement_score || 0) - (a.engagement_score || 0))
    .slice(0, 5);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Megaphone className="h-5 w-5 text-primary" />
            Posts à Amplifier
          </h2>
          <p className="text-sm text-muted-foreground">
            Publications de l'écosystème méritant un partage ou un engagement
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => collectSocial()} disabled={collecting} className="gap-2">
          <RefreshCw className={`h-3.5 w-3.5 ${collecting ? 'animate-spin' : ''}`} />
          Actualiser
        </Button>
      </div>

      {isLoading && (
        <div className="grid gap-3 md:grid-cols-2">
          {[1, 2, 3].map(i => (
            <Card key={i}>
              <CardContent className="p-4 space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-1/2" />
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {!isLoading && topPosts.length > 0 && (
        <div className="grid gap-3 md:grid-cols-2">
          {topPosts.map(post => (
            <Card key={post.id} className={`border-l-4 ${platformColors[post.plateforme] || 'border-l-primary'}`}>
              <CardContent className="p-4 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-base">{platformIcons[post.plateforme] || '📌'}</span>
                    <span className="text-xs font-medium capitalize">{post.plateforme}</span>
                    {post.auteur && (
                      <span className="text-xs text-muted-foreground">• {post.auteur}</span>
                    )}
                  </div>
                  <Badge variant="outline" className="text-[10px]">
                    ⚡ {post.engagement_score}
                  </Badge>
                </div>

                <p className="text-sm line-clamp-3">{post.contenu}</p>

                {post.hashtags && post.hashtags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {post.hashtags.slice(0, 4).map((h, i) => (
                      <Badge key={i} variant="secondary" className="text-[10px] px-1.5 py-0">
                        {h}
                      </Badge>
                    ))}
                  </div>
                )}

                <div className="flex items-center gap-2 pt-1">
                  {post.url_original && (
                    <a
                      href={post.url_original}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                    >
                      <ExternalLink className="h-3 w-3" /> Voir le post
                    </a>
                  )}
                  {onPrepareResponse && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="gap-1 text-xs h-7 px-2 ml-auto"
                      onClick={() => onPrepareResponse(
                        `Prépare une réponse ou un post en réaction à cette publication de ${post.auteur || post.plateforme} : "${post.contenu?.slice(0, 200)}"`
                      )}
                    >
                      <MessageSquare className="h-3 w-3" /> Préparer une réponse
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {!isLoading && topPosts.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="py-8 text-center">
            <Megaphone className="h-8 w-8 mx-auto text-muted-foreground/40 mb-2" />
            <p className="text-sm text-muted-foreground">
              Aucun post à fort engagement détecté récemment
            </p>
            <Button variant="outline" size="sm" className="mt-3 gap-2" onClick={() => collectSocial()} disabled={collecting}>
              <RefreshCw className={`h-3.5 w-3.5 ${collecting ? 'animate-spin' : ''}`} />
              Lancer une collecte
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
