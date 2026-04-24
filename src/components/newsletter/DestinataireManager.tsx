import { useState } from 'react';
import { UserPlus, Trash2, Mail, Loader2, Users, ChevronDown } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from '@/components/ui/dialog';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  useNewsletterDestinataires, 
  useAddDestinataire, 
  useDeleteDestinataire 
} from '@/hooks/useNewsletters';
import type { NewsletterCible } from '@/types/newsletter';

const GROUPS: { key: string; label: string; description: string; variant: 'default' | 'secondary' | 'outline' }[] = [
  { key: 'dg_ca', label: 'DG / Conseil d\'Administration', description: 'Décideurs internes ANSUT', variant: 'default' },
  { key: 'partenaires', label: 'Partenaires', description: 'Bailleurs, opérateurs, institutionnels', variant: 'secondary' },
  { key: 'general', label: 'Grand public', description: 'Newsletter publique et abonnés', variant: 'outline' },
  { key: 'externe', label: 'Externe', description: 'Presse, observateurs, médias', variant: 'outline' },
];

const groupMeta = Object.fromEntries(GROUPS.map(g => [g.key, g]));

export function DestinataireManager() {
  const [isOpen, setIsOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [nom, setNom] = useState('');
  const [type, setType] = useState<NewsletterCible | 'externe'>('general');
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({ dg_ca: true });

  const { data: destinataires, isLoading } = useNewsletterDestinataires();
  const addDestinataire = useAddDestinataire();
  const deleteDestinataire = useDeleteDestinataire();

  const handleAdd = async () => {
    if (!email) return;
    
    await addDestinataire.mutateAsync({
      email,
      nom: nom || null,
      type,
      actif: true,
      frequence: 'mensuel',
    });
    
    setEmail('');
    setNom('');
    setType('general');
    setIsOpen(false);
  };

  const groupedDestinataires = destinataires?.reduce((acc, dest) => {
    const key = dest.type;
    if (!acc[key]) acc[key] = [];
    acc[key].push(dest);
    return acc;
  }, {} as Record<string, typeof destinataires>) || {};

  const toggleGroup = (key: string) => {
    setOpenGroups(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const totalActifs = destinataires?.filter(d => d.actif).length || 0;

  return (
    <div className="space-y-6">
      {/* Vue d'ensemble des groupes */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                Groupes de destinataires
              </CardTitle>
              <CardDescription>
                {totalActifs} actifs sur {destinataires?.length || 0} configurés — répartis en {GROUPS.length} groupes
              </CardDescription>
            </div>
            
            <Dialog open={isOpen} onOpenChange={setIsOpen}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <UserPlus className="h-4 w-4 mr-2" />
                  Ajouter
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Ajouter un destinataire</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div>
                    <Label>Email *</Label>
                    <Input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="email@example.com"
                    />
                  </div>
                  <div>
                    <Label>Nom</Label>
                    <Input
                      value={nom}
                      onChange={(e) => setNom(e.target.value)}
                      placeholder="Jean Dupont"
                    />
                  </div>
                  <div>
                    <Label>Groupe</Label>
                    <Select value={type} onValueChange={(v) => setType(v as NewsletterCible | 'externe')}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {GROUPS.map(g => (
                          <SelectItem key={g.key} value={g.key}>{g.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button 
                    onClick={handleAdd} 
                    disabled={!email || addDestinataire.isPending}
                    className="w-full"
                  >
                    {addDestinataire.isPending ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <UserPlus className="h-4 w-4 mr-2" />
                    )}
                    Ajouter
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>

        <CardContent>
          {/* Tuiles de synthèse par groupe */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            {GROUPS.map(g => {
              const count = groupedDestinataires[g.key]?.length || 0;
              return (
                <button
                  key={g.key}
                  onClick={() => toggleGroup(g.key)}
                  className="text-left p-3 rounded-lg bg-accent/30 hover:bg-accent/50 transition-colors border border-transparent hover:border-border"
                >
                  <Badge variant={g.variant} className="mb-2">{g.label.split(' /')[0]}</Badge>
                  <div className="text-2xl font-bold text-foreground">{count}</div>
                  <div className="text-xs text-muted-foreground">{g.description}</div>
                </button>
              );
            })}
          </div>

          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : !destinataires?.length ? (
            <div className="text-center py-8 text-muted-foreground">
              <Mail className="h-10 w-10 mx-auto mb-3 opacity-50" />
              <p>Aucun destinataire configuré</p>
              <p className="text-xs mt-2">Ajoutez vos premiers destinataires pour activer la diffusion par groupe.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {GROUPS.map(g => {
                const dests = groupedDestinataires[g.key] || [];
                if (dests.length === 0) return null;
                const isOpen = openGroups[g.key] ?? false;

                return (
                  <Collapsible key={g.key} open={isOpen} onOpenChange={() => toggleGroup(g.key)}>
                    <CollapsibleTrigger className="w-full flex items-center justify-between p-3 rounded-lg bg-muted/40 hover:bg-muted/60 transition-colors">
                      <div className="flex items-center gap-3">
                        <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? '' : '-rotate-90'}`} />
                        <Badge variant={g.variant}>{g.label}</Badge>
                        <span className="text-sm text-muted-foreground">{dests.length} destinataire{dests.length > 1 ? 's' : ''}</span>
                      </div>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="mt-2 space-y-2 pl-7">
                      {dests.map(dest => (
                        <div 
                          key={dest.id} 
                          className="flex items-center justify-between p-3 bg-accent/20 rounded-lg"
                        >
                          <div>
                            <div className="font-medium text-sm">{dest.nom || dest.email}</div>
                            {dest.nom && <div className="text-xs text-muted-foreground">{dest.email}</div>}
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => deleteDestinataire.mutate(dest.id)}
                            className="text-destructive hover:text-destructive h-8 w-8"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </CollapsibleContent>
                  </Collapsible>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
