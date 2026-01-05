import { useState, useEffect, useMemo } from 'react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Loader2, Download, RefreshCw, AlertTriangle, CheckCircle2, Users, Copy, Database, UserPlus, Search } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useDeduplicationActeurs } from '@/hooks/useDeduplicationActeurs';
import { SourceBadge } from '@/components/import-acteurs/SourceBadge';
import { EditableCell } from '@/components/import-acteurs/EditableCell';
import { StatsPanel } from '@/components/import-acteurs/StatsPanel';

interface ActeurGenere {
  nom_complet: string;
  fonction: string;
  organisation: string;
  pays: string;
  sources: string[];
  notes?: string;
  cercle: number;
  categorie: string;
  sous_categorie: string;
  suivi_spdi_actif: boolean;
  score_influence: number;
  statut: 'verifie' | 'a_verifier';
  selected?: boolean;
  doublon?: boolean;
  doublonId?: string;
}

const CATEGORIES = [
  { value: 'institutionnels', label: 'Institutionnels (MTND, ARTCI, ANSUT)', cercle: 1 },
  { value: 'operateurs', label: 'Opérateurs Télécoms', cercle: 2 },
  { value: 'fai', label: 'FAI & Connectivité', cercle: 2 },
  { value: 'fintech', label: 'Fintech & Mobile Money', cercle: 2 },
  { value: 'bailleurs', label: 'Bailleurs & Organisations Internationales', cercle: 3 },
  { value: 'experts', label: 'Experts, Médias & Académiques', cercle: 4 },
];

const CERCLE_COLORS: Record<number, string> = {
  1: 'bg-red-500/20 text-red-400 border-red-500/30',
  2: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  3: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  4: 'bg-green-500/20 text-green-400 border-green-500/30',
};

export default function ImportActeursPage() {
  const { toast } = useToast();
  const [selectedCategorie, setSelectedCategorie] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [acteurs, setActeurs] = useState<ActeurGenere[]>([]);
  const [acteursAVerifier, setActeursAVerifier] = useState<ActeurGenere[]>([]);
  const [citations, setCitations] = useState<string[]>([]);
  
  // État pour l'ajout manuel
  const [manualName, setManualName] = useState('');
  const [isSearchingManual, setIsSearchingManual] = useState(false);
  const [manualCercle, setManualCercle] = useState<number>(3);
  const [manualCategorie, setManualCategorie] = useState<string>('autre');

  const { chargerActeursExistants, verifierDoublon, nombreActeursExistants, isLoading: isLoadingExistants } = useDeduplicationActeurs();

  // Charger les acteurs existants au montage
  useEffect(() => {
    chargerActeursExistants();
  }, [chargerActeursExistants]);

  // Vérifier les doublons quand les acteurs changent
  const acteursAvecDoublons = useMemo(() => {
    return acteurs.map(acteur => {
      const doublon = verifierDoublon(acteur.nom_complet, acteur.organisation);
      return {
        ...acteur,
        doublon: !!doublon,
        doublonId: doublon?.id,
        selected: acteur.selected && !doublon // Désélectionner les doublons
      };
    });
  }, [acteurs, verifierDoublon]);

  const doublonsCount = acteursAvecDoublons.filter(a => a.doublon).length;

  const handleGenerate = async () => {
    if (!selectedCategorie) {
      toast({ title: 'Sélectionnez une catégorie', variant: 'destructive' });
      return;
    }

    setIsGenerating(true);
    setActeurs([]);
    setActeursAVerifier([]);

    try {
      // Recharger les acteurs existants pour la déduplication
      await chargerActeursExistants();

      const { data, error } = await supabase.functions.invoke('generer-acteurs', {
        body: { categorie: selectedCategorie }
      });

      if (error) throw error;

      const acteursWithSelection = (data.acteurs || []).map((a: ActeurGenere) => ({
        ...a,
        selected: true
      }));

      setActeurs(acteursWithSelection);
      setActeursAVerifier(data.acteurs_a_verifier || []);
      setCitations(data.citations_globales || []);

      toast({
        title: 'Génération terminée',
        description: `${acteursWithSelection.length} acteurs trouvés avec sources`
      });

    } catch (error) {
      console.error('Erreur génération:', error);
      toast({
        title: 'Erreur de génération',
        description: error instanceof Error ? error.message : 'Erreur inconnue',
        variant: 'destructive'
      });
    } finally {
      setIsGenerating(false);
    }
  };

  // Recherche manuelle d'un acteur par son nom
  const handleManualSearch = async () => {
    const trimmedName = manualName.trim();
    if (!trimmedName) {
      toast({ title: 'Entrez un nom', variant: 'destructive' });
      return;
    }

    setIsSearchingManual(true);

    try {
      // Vérifier d'abord si l'acteur existe déjà
      const existingDoublon = verifierDoublon(trimmedName, '');
      if (existingDoublon) {
        toast({
          title: 'Acteur déjà en base',
          description: `${existingDoublon.nom} ${existingDoublon.prenom || ''} existe déjà.`,
          variant: 'destructive'
        });
        setIsSearchingManual(false);
        return;
      }

      // Appeler Perplexity pour enrichir les informations
      const { data, error } = await supabase.functions.invoke('generer-acteurs', {
        body: { 
          categorie: 'recherche_individuelle',
          nom_recherche: trimmedName,
          cercle_force: manualCercle,
          categorie_force: manualCategorie
        }
      });

      if (error) throw error;

      if (data.acteurs && data.acteurs.length > 0) {
        const newActeurs = data.acteurs.map((a: ActeurGenere) => ({
          ...a,
          selected: true
        }));
        
        setActeurs(prev => [...newActeurs, ...prev]);
        setCitations(prev => [...(data.citations_globales || []), ...prev]);
        setManualName('');
        
        toast({
          title: 'Acteur trouvé',
          description: `${newActeurs[0].nom_complet} ajouté à la liste`
        });
      } else {
        toast({
          title: 'Acteur non trouvé',
          description: `Aucune information trouvée pour "${trimmedName}"`,
          variant: 'destructive'
        });
      }

    } catch (error) {
      console.error('Erreur recherche manuelle:', error);
      toast({
        title: 'Erreur de recherche',
        description: error instanceof Error ? error.message : 'Erreur inconnue',
        variant: 'destructive'
      });
    } finally {
      setIsSearchingManual(false);
    }
  };

  const toggleActeurSelection = (index: number) => {
    setActeurs(prev => prev.map((a, i) => 
      i === index ? { ...a, selected: !a.selected } : a
    ));
  };

  const toggleActeurSPDI = (index: number) => {
    setActeurs(prev => prev.map((a, i) => 
      i === index ? { ...a, suivi_spdi_actif: !a.suivi_spdi_actif } : a
    ));
  };

  const updateActeurField = (index: number, field: 'fonction' | 'organisation', value: string) => {
    setActeurs(prev => prev.map((a, i) => 
      i === index ? { ...a, [field]: value } : a
    ));
  };

  const handleImport = async () => {
    const selectedActeurs = acteursAvecDoublons.filter(a => a.selected && !a.doublon);
    
    if (selectedActeurs.length === 0) {
      toast({ title: 'Aucun acteur sélectionné (hors doublons)', variant: 'destructive' });
      return;
    }

    setIsImporting(true);

    try {
      const personnalites = selectedActeurs.map(acteur => {
        const parts = acteur.nom_complet.trim().split(' ');
        const prenom = parts[0] || '';
        const nom = parts.slice(1).join(' ') || parts[0] || '';

        return {
          nom,
          prenom,
          fonction: acteur.fonction,
          organisation: acteur.organisation,
          pays: acteur.pays || 'Côte d\'Ivoire',
          categorie: acteur.categorie,
          cercle: acteur.cercle,
          sous_categorie: acteur.sous_categorie,
          score_influence: acteur.score_influence,
          suivi_spdi_actif: acteur.suivi_spdi_actif,
          zone: 'Afrique de l\'Ouest',
          actif: true,
          notes: `Sources: ${acteur.sources.join(' | ')}${acteur.notes ? '\n' + acteur.notes : ''}`
        };
      });

      const { error } = await supabase
        .from('personnalites')
        .insert(personnalites);

      if (error) throw error;

      toast({
        title: 'Import réussi',
        description: `${personnalites.length} acteurs importés dans la base`
      });

      setActeurs([]);
      setActeursAVerifier([]);
      setCitations([]);
      
      // Recharger pour la prochaine déduplication
      await chargerActeursExistants();

    } catch (error) {
      console.error('Erreur import:', error);
      toast({
        title: 'Erreur d\'import',
        description: error instanceof Error ? error.message : 'Erreur inconnue',
        variant: 'destructive'
      });
    } finally {
      setIsImporting(false);
    }
  };

  const selectedCount = acteursAvecDoublons.filter(a => a.selected && !a.doublon).length;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Import Acteurs (Perplexity)</h1>
          <p className="text-muted-foreground">
            Génération et import d'acteurs clés avec sources vérifiées
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Database className="h-4 w-4" />
          <span>{nombreActeursExistants} acteurs en base</span>
          {isLoadingExistants && <Loader2 className="h-3 w-3 animate-spin" />}
        </div>
      </div>

      {/* Sélection catégorie et génération */}
      <Card className="glass">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5" />
            Générer des acteurs
          </CardTitle>
          <CardDescription>
            Sélectionnez une catégorie pour rechercher les acteurs via Perplexity
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4 items-end">
            <div className="flex-1">
              <Select value={selectedCategorie} onValueChange={setSelectedCategorie}>
                <SelectTrigger>
                  <SelectValue placeholder="Choisir une catégorie..." />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map(cat => (
                    <SelectItem key={cat.value} value={cat.value}>
                      <span className="flex items-center gap-2">
                        <Badge variant="outline" className={CERCLE_COLORS[cat.cercle]}>
                          C{cat.cercle}
                        </Badge>
                        {cat.label}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button 
              onClick={handleGenerate} 
              disabled={isGenerating || !selectedCategorie}
            >
              {isGenerating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Recherche...
                </>
              ) : (
                <>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Générer
                </>
              )}
            </Button>
          </div>

          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <AlertTriangle className="h-4 w-4 text-yellow-500" />
            Seuls les acteurs avec sources vérifiables seront proposés
          </div>
        </CardContent>
      </Card>

      {/* Ajout manuel par nom */}
      <Card className="glass">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Ajouter manuellement
          </CardTitle>
          <CardDescription>
            Recherchez un acteur par son nom pour l'ajouter avec enrichissement automatique
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <div className="flex-1">
              <Input
                placeholder="Ex: Amadou Coulibaly, Roger Adom..."
                value={manualName}
                onChange={(e) => setManualName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !isSearchingManual) {
                    handleManualSearch();
                  }
                }}
              />
            </div>
          </div>
          <div className="flex gap-4 items-end">
            <div className="flex-1">
              <label className="text-sm font-medium mb-2 block text-muted-foreground">Cercle</label>
              <Select value={String(manualCercle)} onValueChange={(v) => setManualCercle(Number(v))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">
                    <span className="flex items-center gap-2">
                      <Badge variant="outline" className={CERCLE_COLORS[1]}>C1</Badge>
                      Institutionnels Nationaux
                    </span>
                  </SelectItem>
                  <SelectItem value="2">
                    <span className="flex items-center gap-2">
                      <Badge variant="outline" className={CERCLE_COLORS[2]}>C2</Badge>
                      Opérateurs & Connectivité
                    </span>
                  </SelectItem>
                  <SelectItem value="3">
                    <span className="flex items-center gap-2">
                      <Badge variant="outline" className={CERCLE_COLORS[3]}>C3</Badge>
                      Bailleurs & Internationaux
                    </span>
                  </SelectItem>
                  <SelectItem value="4">
                    <span className="flex items-center gap-2">
                      <Badge variant="outline" className={CERCLE_COLORS[4]}>C4</Badge>
                      Experts & Médias
                    </span>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1">
              <label className="text-sm font-medium mb-2 block text-muted-foreground">Catégorie</label>
              <Select value={manualCategorie} onValueChange={setManualCategorie}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="regulateur">Régulateur</SelectItem>
                  <SelectItem value="operateur">Opérateur</SelectItem>
                  <SelectItem value="fai">FAI</SelectItem>
                  <SelectItem value="fintech">Fintech</SelectItem>
                  <SelectItem value="bailleur">Bailleur</SelectItem>
                  <SelectItem value="expert">Expert</SelectItem>
                  <SelectItem value="media">Média</SelectItem>
                  <SelectItem value="politique">Politique</SelectItem>
                  <SelectItem value="autre">Autre</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button 
              onClick={handleManualSearch} 
              disabled={isSearchingManual || !manualName.trim()}
              variant="secondary"
            >
              {isSearchingManual ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Recherche...
                </>
              ) : (
                <>
                  <Search className="mr-2 h-4 w-4" />
                  Rechercher
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Statistiques temps réel */}
      {acteursAvecDoublons.length > 0 && (
        <StatsPanel acteurs={acteursAvecDoublons} doublonsCount={doublonsCount} />
      )}

      {/* Résultats */}
      {acteursAvecDoublons.length > 0 && (
        <Card className="glass">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Acteurs trouvés ({acteursAvecDoublons.length})
                </CardTitle>
                <CardDescription>
                  {selectedCount} à importer · Double-cliquez pour modifier
                </CardDescription>
              </div>
              <Button 
                onClick={handleImport} 
                disabled={isImporting || selectedCount === 0}
              >
                {isImporting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Import...
                  </>
                ) : (
                  <>
                    <Download className="mr-2 h-4 w-4" />
                    Importer ({selectedCount})
                  </>
                )}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <Checkbox 
                        checked={acteursAvecDoublons.filter(a => !a.doublon).every(a => a.selected)}
                        onCheckedChange={(checked) => {
                          setActeurs(prev => prev.map(a => ({ ...a, selected: !!checked })));
                        }}
                      />
                    </TableHead>
                    <TableHead>Nom</TableHead>
                    <TableHead>Fonction</TableHead>
                    <TableHead>Organisation</TableHead>
                    <TableHead className="w-20">Cercle</TableHead>
                    <TableHead className="w-20">SPDI</TableHead>
                    <TableHead className="min-w-[200px]">Sources</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {acteursAvecDoublons.map((acteur, index) => (
                    <TableRow 
                      key={index} 
                      className={
                        acteur.doublon 
                          ? 'opacity-50 bg-yellow-500/5' 
                          : acteur.selected ? '' : 'opacity-50'
                      }
                    >
                      <TableCell>
                        {acteur.doublon ? (
                          <Badge variant="outline" className="text-xs bg-yellow-500/20 text-yellow-400 border-yellow-500/30">
                            <Copy className="h-3 w-3 mr-1" />
                            Doublon
                          </Badge>
                        ) : (
                          <Checkbox 
                            checked={acteur.selected}
                            onCheckedChange={() => toggleActeurSelection(index)}
                          />
                        )}
                      </TableCell>
                      <TableCell className="font-medium">
                        {acteur.nom_complet}
                        {acteur.statut === 'verifie' && (
                          <CheckCircle2 className="h-3 w-3 text-green-500 inline ml-1" />
                        )}
                      </TableCell>
                      <TableCell>
                        <EditableCell 
                          value={acteur.fonction}
                          onChange={(val) => updateActeurField(index, 'fonction', val)}
                          className="text-sm text-muted-foreground"
                        />
                      </TableCell>
                      <TableCell>
                        <EditableCell 
                          value={acteur.organisation}
                          onChange={(val) => updateActeurField(index, 'organisation', val)}
                        />
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={CERCLE_COLORS[acteur.cercle]}>
                          C{acteur.cercle}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Switch 
                          checked={acteur.suivi_spdi_actif}
                          onCheckedChange={() => toggleActeurSPDI(index)}
                          disabled={acteur.doublon}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {acteur.sources.map((url, i) => (
                            <SourceBadge key={i} url={url} />
                          ))}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Acteurs sans sources */}
      {acteursAVerifier.length > 0 && (
        <Card className="glass border-yellow-500/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-yellow-500">
              <AlertTriangle className="h-5 w-5" />
              Acteurs sans sources ({acteursAVerifier.length})
            </CardTitle>
            <CardDescription>
              Ces acteurs n'ont pas pu être vérifiés et ne seront pas importés
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-muted-foreground space-y-1">
              {acteursAVerifier.map((acteur, i) => (
                <div key={i}>
                  {acteur.nom_complet} - {acteur.fonction} ({acteur.organisation})
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Citations globales */}
      {citations.length > 0 && (
        <Card className="glass">
          <CardHeader>
            <CardTitle className="text-sm">Sources utilisées par Perplexity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {citations.map((url, i) => (
                <SourceBadge key={i} url={url} />
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
