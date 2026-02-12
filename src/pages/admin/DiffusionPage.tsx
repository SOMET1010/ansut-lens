import { ArrowLeft, Send, MessageSquare, Mail, Phone, MessageCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { useDiffusionProgrammations, useDiffusionLogs, useUpdateDiffusionConfig, useDiffuserResume } from '@/hooks/useDiffusionScheduler';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';

const CANAL_CONFIG = {
  sms: { label: 'SMS', icon: Phone, color: 'text-blue-500', destLabel: 'Numéro', placeholder: '225XXXXXXXXXX' },
  telegram: { label: 'Telegram', icon: Send, color: 'text-sky-400', destLabel: 'Chat ID', placeholder: '2250505XXXXXX' },
  email: { label: 'Email', icon: Mail, color: 'text-emerald-500', destLabel: 'Email', placeholder: 'nom@domaine.com' },
  whatsapp: { label: 'WhatsApp', icon: MessageCircle, color: 'text-green-500', destLabel: 'Numéro', placeholder: '' },
};

export default function DiffusionPage() {
  const navigate = useNavigate();
  const { data: configs, isLoading } = useDiffusionProgrammations();
  const { data: logs, isLoading: logsLoading } = useDiffusionLogs();
  const updateConfig = useUpdateDiffusionConfig();
  const diffuser = useDiffuserResume();

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/admin')}>
          <ArrowLeft size={20} />
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Diffusion Multicanale</h1>
          <p className="text-muted-foreground">Programmez l'envoi automatique des résumés par SMS, Telegram et Email.</p>
        </div>
      </div>

      {/* Channel Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}><CardContent className="p-6"><Skeleton className="h-32" /></CardContent></Card>
          ))
        ) : (
          configs?.map((config) => {
            const canal = config.canal as keyof typeof CANAL_CONFIG;
            const meta = CANAL_CONFIG[canal];
            if (!meta) return null;
            const Icon = meta.icon;
            const isWhatsapp = canal === 'whatsapp';
            const destCount = (config.destinataires || []).length;

            return (
              <ChannelCard
                key={config.id}
                config={config}
                meta={meta}
                Icon={Icon}
                isWhatsapp={isWhatsapp}
                destCount={destCount}
                onToggle={(actif) => updateConfig.mutate({ id: config.id, updates: { actif } })}
                onUpdateFrequence={(frequence) => updateConfig.mutate({ id: config.id, updates: { frequence } })}
                onUpdateHeure={(heure_envoi) => updateConfig.mutate({ id: config.id, updates: { heure_envoi } })}
                onUpdateDestinataires={(destinataires) => updateConfig.mutate({ id: config.id, updates: { destinataires } as any })}
                onSendNow={() => diffuser.mutate({ canal })}
                isSending={diffuser.isPending}
              />
            );
          })
        )}
      </div>

      {/* History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare size={20} /> Historique des envois
          </CardTitle>
        </CardHeader>
        <CardContent>
          {logsLoading ? (
            <Skeleton className="h-48" />
          ) : !logs?.length ? (
            <p className="text-muted-foreground text-sm text-center py-8">Aucun envoi enregistré.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Canal</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Destinataires</TableHead>
                  <TableHead>Succès</TableHead>
                  <TableHead>Échecs</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log) => {
                  const canalMeta = CANAL_CONFIG[log.canal as keyof typeof CANAL_CONFIG];
                  return (
                    <TableRow key={log.id}>
                      <TableCell>
                        <Badge variant="outline">{canalMeta?.label || log.canal}</Badge>
                      </TableCell>
                      <TableCell className="text-sm">
                        {formatDistanceToNow(new Date(log.created_at), { addSuffix: true, locale: fr })}
                      </TableCell>
                      <TableCell>{log.destinataires_count}</TableCell>
                      <TableCell className="text-emerald-500 font-medium">{log.succes_count}</TableCell>
                      <TableCell className="text-red-500 font-medium">{log.echec_count}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// --- ChannelCard component ---
interface ChannelCardProps {
  config: any;
  meta: any;
  Icon: any;
  isWhatsapp: boolean;
  destCount: number;
  onToggle: (actif: boolean) => void;
  onUpdateFrequence: (f: string) => void;
  onUpdateHeure: (h: string) => void;
  onUpdateDestinataires: (d: any[]) => void;
  onSendNow: () => void;
  isSending: boolean;
}

function ChannelCard({ config, meta, Icon, isWhatsapp, destCount, onToggle, onUpdateFrequence, onUpdateHeure, onUpdateDestinataires, onSendNow, isSending }: ChannelCardProps) {
  const [destDialogOpen, setDestDialogOpen] = useState(false);
  const [newDest, setNewDest] = useState('');
  const [destName, setDestName] = useState('');

  const addDestinataire = () => {
    if (!newDest.trim()) return;
    const canal = config.canal;
    const entry = canal === 'sms' || canal === 'whatsapp'
      ? { nom: destName || newDest, numero: newDest }
      : canal === 'telegram'
        ? { nom: destName || newDest, chat_id: newDest }
        : { nom: destName || newDest, email: newDest };

    const updated = [...(config.destinataires || []), entry];
    onUpdateDestinataires(updated);
    setNewDest('');
    setDestName('');
    toast.success('Destinataire ajouté');
  };

  const removeDestinataire = (index: number) => {
    const updated = [...(config.destinataires || [])];
    updated.splice(index, 1);
    onUpdateDestinataires(updated);
  };

  return (
    <Card className={isWhatsapp ? 'opacity-60' : ''}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Icon size={24} className={meta.color} />
            <CardTitle className="text-lg">{meta.label}</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            {isWhatsapp ? (
              <Badge variant="outline" className="text-xs">Bientôt</Badge>
            ) : (
              <>
                <Badge variant={config.actif ? 'default' : 'secondary'} className="text-xs">
                  {config.actif ? 'Actif' : 'Inactif'}
                </Badge>
                <Switch checked={config.actif} onCheckedChange={onToggle} />
              </>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {isWhatsapp ? (
          <p className="text-sm text-muted-foreground">Ce canal sera disponible prochainement.</p>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground">Fréquence</label>
                <Select value={config.frequence} onValueChange={onUpdateFrequence}>
                  <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="quotidien">Quotidien</SelectItem>
                    <SelectItem value="hebdo">Hebdomadaire</SelectItem>
                    <SelectItem value="mensuel">Mensuel</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Heure</label>
                <Input type="time" value={config.heure_envoi} onChange={(e) => onUpdateHeure(e.target.value)} className="h-8 text-sm" />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">{destCount} destinataire{destCount > 1 ? 's' : ''}</span>
              {config.dernier_envoi && (
                <span className="text-xs text-muted-foreground">
                  Dernier envoi : {formatDistanceToNow(new Date(config.dernier_envoi), { addSuffix: true, locale: fr })}
                </span>
              )}
            </div>

            <div className="flex gap-2">
              <Dialog open={destDialogOpen} onOpenChange={setDestDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" className="flex-1">Destinataires</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Destinataires {meta.label}</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      {(config.destinataires || []).map((d: any, i: number) => (
                        <div key={i} className="flex items-center justify-between p-2 bg-muted rounded-md text-sm">
                          <span>{d.nom || d.email || d.numero || d.chat_id}</span>
                          <span className="text-muted-foreground text-xs">{d.email || d.numero || d.chat_id}</span>
                          <Button variant="ghost" size="sm" onClick={() => removeDestinataire(i)} className="text-destructive h-6">×</Button>
                        </div>
                      ))}
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <Input placeholder="Nom" value={destName} onChange={(e) => setDestName(e.target.value)} className="text-sm" />
                      <Input placeholder={meta.placeholder} value={newDest} onChange={(e) => setNewDest(e.target.value)} className="text-sm" />
                    </div>
                    <Button onClick={addDestinataire} size="sm" className="w-full">Ajouter</Button>
                  </div>
                </DialogContent>
              </Dialog>
              <Button size="sm" onClick={onSendNow} disabled={isSending || destCount === 0} className="flex-1">
                <Send size={14} className="mr-1" /> Envoyer maintenant
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
