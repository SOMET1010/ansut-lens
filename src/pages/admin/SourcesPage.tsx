import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, Pencil, Trash2, Search, Globe, Rss, Code, Share2, Database, Zap } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  useSourcesMedia,
  useCreateSource,
  useUpdateSource,
  useDeleteSource,
  type SourceMedia,
  type SourceMediaInsert,
} from '@/hooks/useSourcesMedia';

const SOURCE_TYPES = [
  { value: 'site_web', label: 'Site web', icon: Globe, color: 'text-blue-500' },
  { value: 'flux_rss', label: 'Flux RSS', icon: Rss, color: 'text-orange-500' },
  { value: 'api', label: 'API', icon: Code, color: 'text-purple-500' },
  { value: 'reseau_social', label: 'Réseau social', icon: Share2, color: 'text-pink-500' },
];

const FREQUENCES = [
  { value: '1h', label: 'Toutes les heures' },
  { value: '6h', label: 'Toutes les 6 heures' },
  { value: '12h', label: 'Toutes les 12 heures' },
  { value: '24h', label: 'Une fois par jour' },
];

function getTypeConfig(type: string) {
  return SOURCE_TYPES.find((t) => t.value === type) || SOURCE_TYPES[0];
}

export default function SourcesPage() {
  const { data: sources, isLoading } = useSourcesMedia();
  const createSource = useCreateSource();
  const updateSource = useUpdateSource();
  const deleteSource = useDeleteSource();

  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterActif, setFilterActif] = useState(false);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSource, setEditingSource] = useState<SourceMedia | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingSource, setDeletingSource] = useState<SourceMedia | null>(null);

  // Form state
  const [formNom, setFormNom] = useState('');
  const [formType, setFormType] = useState('site_web');
  const [formUrl, setFormUrl] = useState('');
  const [formFrequence, setFormFrequence] = useState('1h');
  const [formActif, setFormActif] = useState(true);

  const filteredSources = sources?.filter((source) => {
    const matchSearch = source.nom.toLowerCase().includes(search.toLowerCase()) ||
      source.url?.toLowerCase().includes(search.toLowerCase());
    const matchType = filterType === 'all' || source.type === filterType;
    const matchActif = !filterActif || source.actif;
    return matchSearch && matchType && matchActif;
  });

  const stats = {
    total: sources?.length ?? 0,
    actives: sources?.filter((s) => s.actif).length ?? 0,
    sites: sources?.filter((s) => s.type === 'site_web').length ?? 0,
    rss: sources?.filter((s) => s.type === 'flux_rss').length ?? 0,
  };

  const openCreateDialog = () => {
    setEditingSource(null);
    setFormNom('');
    setFormType('site_web');
    setFormUrl('');
    setFormFrequence('1h');
    setFormActif(true);
    setDialogOpen(true);
  };

  const openEditDialog = (source: SourceMedia) => {
    setEditingSource(source);
    setFormNom(source.nom);
    setFormType(source.type);
    setFormUrl(source.url ?? '');
    setFormFrequence(source.frequence_scan ?? '1h');
    setFormActif(source.actif ?? true);
    setDialogOpen(true);
  };

  const handleSubmit = () => {
    const data: SourceMediaInsert = {
      nom: formNom,
      type: formType,
      url: formUrl || null,
      frequence_scan: formFrequence,
      actif: formActif,
    };

    if (editingSource) {
      updateSource.mutate({ id: editingSource.id, ...data }, {
        onSuccess: () => setDialogOpen(false),
      });
    } else {
      createSource.mutate(data, {
        onSuccess: () => setDialogOpen(false),
      });
    }
  };

  const handleDelete = () => {
    if (deletingSource) {
      deleteSource.mutate(deletingSource.id, {
        onSuccess: () => {
          setDeleteDialogOpen(false);
          setDeletingSource(null);
        },
      });
    }
  };

  const handleToggleActif = (source: SourceMedia) => {
    updateSource.mutate({ id: source.id, actif: !source.actif });
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Sources Média</h1>
          <p className="text-muted-foreground">
            Gérer les {stats.total} sources de veille ANSUT RADAR
          </p>
        </div>
        <Button onClick={openCreateDialog}>
          <Plus className="h-4 w-4 mr-2" />
          Ajouter
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
        <Card className="glass">
          <CardContent className="pt-4 flex items-center gap-3">
            <Database className="h-8 w-8 text-muted-foreground" />
            <div>
              <p className="text-2xl font-bold">{stats.total}</p>
              <p className="text-xs text-muted-foreground">Total</p>
            </div>
          </CardContent>
        </Card>
        <Card className="glass">
          <CardContent className="pt-4 flex items-center gap-3">
            <Zap className="h-8 w-8 text-emerald-500" />
            <div>
              <p className="text-2xl font-bold">{stats.actives}</p>
              <p className="text-xs text-muted-foreground">Actives</p>
            </div>
          </CardContent>
        </Card>
        <Card className="glass">
          <CardContent className="pt-4 flex items-center gap-3">
            <Globe className="h-8 w-8 text-blue-500" />
            <div>
              <p className="text-2xl font-bold">{stats.sites}</p>
              <p className="text-xs text-muted-foreground">Sites web</p>
            </div>
          </CardContent>
        </Card>
        <Card className="glass">
          <CardContent className="pt-4 flex items-center gap-3">
            <Rss className="h-8 w-8 text-orange-500" />
            <div>
              <p className="text-2xl font-bold">{stats.rss}</p>
              <p className="text-xs text-muted-foreground">Flux RSS</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="glass">
        <CardContent className="pt-4">
          <div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les types</SelectItem>
                {SOURCE_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex items-center gap-2">
              <Switch
                id="filter-actif"
                checked={filterActif}
                onCheckedChange={setFilterActif}
              />
              <Label htmlFor="filter-actif" className="text-sm">
                Actives uniquement
              </Label>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="glass">
        <CardHeader>
          <CardTitle>Liste des sources</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nom</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="hidden md:table-cell">URL</TableHead>
                  <TableHead>Fréquence</TableHead>
                  <TableHead className="hidden md:table-cell">Dernière collecte</TableHead>
                  <TableHead>Actif</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSources?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                      Aucune source trouvée
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredSources?.map((source) => {
                    const typeConfig = getTypeConfig(source.type);
                    const TypeIcon = typeConfig.icon;
                    return (
                      <TableRow key={source.id}>
                        <TableCell className="font-medium">{source.nom}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="gap-1">
                            <TypeIcon className={`h-3 w-3 ${typeConfig.color}`} />
                            {typeConfig.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="hidden md:table-cell max-w-[200px] truncate">
                          {source.url ? (
                            <a
                              href={source.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-primary hover:underline"
                            >
                              {source.url}
                            </a>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">
                            {FREQUENCES.find((f) => f.value === source.frequence_scan)?.label ?? source.frequence_scan}
                          </Badge>
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-muted-foreground">
                          {source.derniere_collecte
                            ? formatDistanceToNow(new Date(source.derniere_collecte), {
                                addSuffix: true,
                                locale: fr,
                              })
                            : 'Jamais'}
                        </TableCell>
                        <TableCell>
                          <Switch
                            checked={source.actif ?? false}
                            onCheckedChange={() => handleToggleActif(source)}
                          />
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openEditDialog(source)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                setDeletingSource(source);
                                setDeleteDialogOpen(true);
                              }}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingSource ? 'Modifier la source' : 'Nouvelle source de veille'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="nom">Nom de la source</Label>
              <Input
                id="nom"
                value={formNom}
                onChange={(e) => setFormNom(e.target.value)}
                placeholder="Ex: Gouvernement CI"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="type">Type de source</Label>
              <Select value={formType} onValueChange={setFormType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SOURCE_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      <div className="flex items-center gap-2">
                        <type.icon className={`h-4 w-4 ${type.color}`} />
                        {type.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="url">URL</Label>
              <Input
                id="url"
                type="url"
                value={formUrl}
                onChange={(e) => setFormUrl(e.target.value)}
                placeholder="https://..."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="frequence">Fréquence de scan</Label>
              <Select value={formFrequence} onValueChange={setFormFrequence}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FREQUENCES.map((freq) => (
                    <SelectItem key={freq.value} value={freq.value}>
                      {freq.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                id="actif"
                checked={formActif}
                onCheckedChange={setFormActif}
              />
              <Label htmlFor="actif">Source active</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Annuler
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!formNom || createSource.isPending || updateSource.isPending}
            >
              {editingSource ? 'Enregistrer' : 'Créer la source'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer cette source ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. La source "{deletingSource?.nom}" sera
              définitivement supprimée.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
