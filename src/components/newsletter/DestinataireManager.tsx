import { useState } from 'react';
import { UserPlus, Trash2, Mail, Loader2 } from 'lucide-react';
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
import { Skeleton } from '@/components/ui/skeleton';
import { 
  useNewsletterDestinataires, 
  useAddDestinataire, 
  useDeleteDestinataire 
} from '@/hooks/useNewsletters';
import type { NewsletterCible } from '@/types/newsletter';

const typeLabels: Record<string, string> = {
  dg_ca: 'DG / CA',
  partenaires: 'Partenaires',
  general: 'Grand public',
  externe: 'Externe',
};

const typeColors: Record<string, 'default' | 'secondary' | 'outline'> = {
  dg_ca: 'default',
  partenaires: 'secondary',
  general: 'outline',
  externe: 'outline',
};

export function DestinataireManager() {
  const [isOpen, setIsOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [nom, setNom] = useState('');
  const [type, setType] = useState<NewsletterCible | 'externe'>('general');

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

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Destinataires</CardTitle>
          <CardDescription>
            {destinataires?.length || 0} destinataires configurés
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
                <Label>Catégorie</Label>
                <Select value={type} onValueChange={(v) => setType(v as NewsletterCible | 'externe')}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="dg_ca">DG / Conseil d'Administration</SelectItem>
                    <SelectItem value="partenaires">Partenaires</SelectItem>
                    <SelectItem value="general">Grand public</SelectItem>
                    <SelectItem value="externe">Externe</SelectItem>
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
      </CardHeader>
      
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : !destinataires?.length ? (
          <div className="text-center py-8 text-muted-foreground">
            <Mail className="h-10 w-10 mx-auto mb-3 opacity-50" />
            <p>Aucun destinataire configuré</p>
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(groupedDestinataires).map(([typeKey, dests]) => (
              <div key={typeKey}>
                <div className="flex items-center gap-2 mb-3">
                  <Badge variant={typeColors[typeKey]}>
                    {typeLabels[typeKey]}
                  </Badge>
                  <span className="text-sm text-muted-foreground">
                    ({dests?.length || 0})
                  </span>
                </div>
                <div className="space-y-2">
                  {dests?.map((dest) => (
                    <div 
                      key={dest.id} 
                      className="flex items-center justify-between p-3 bg-accent/30 rounded-lg"
                    >
                      <div>
                        <div className="font-medium">{dest.nom || dest.email}</div>
                        {dest.nom && (
                          <div className="text-sm text-muted-foreground">{dest.email}</div>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteDestinataire.mutate(dest.id)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
