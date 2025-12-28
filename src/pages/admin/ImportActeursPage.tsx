import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Loader2, Download, RefreshCw, ExternalLink, AlertTriangle, CheckCircle2, Users } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

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

  const handleGenerate = async () => {
    if (!selectedCategorie) {
      toast({ title: 'Sélectionnez une catégorie', variant: 'destructive' });
      return;
    }

    setIsGenerating(true);
    setActeurs([]);
    setActeursAVerifier([]);

    try {
      const { data, error } = await supabase.functions.invoke('generer-acteurs', {
        body: { categorie: selectedCategorie }
      });

      if (error) throw error;

      const acteursWithSelection = (data.acteurs || []).map((a: ActeurGenere) => ({
        ...a,
        selected: true // Pré-sélectionner tous les acteurs vérifiés
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

  const handleImport = async () => {
    const selectedActeurs = acteurs.filter(a => a.selected);
    
    if (selectedActeurs.length === 0) {
      toast({ title: 'Aucun acteur sélectionné', variant: 'destructive' });
      return;
    }

    setIsImporting(true);

    try {
      // Préparer les données pour l'insertion
      const personnalites = selectedActeurs.map(acteur => {
        // Séparer nom et prénom
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

      // Réinitialiser après import
      setActeurs([]);
      setActeursAVerifier([]);
      setCitations([]);

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

  const selectedCount = acteurs.filter(a => a.selected).length;
  const spdiCount = acteurs.filter(a => a.selected && a.suivi_spdi_actif).length;

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold">Import Acteurs (Perplexity)</h1>
        <p className="text-muted-foreground">
          Génération et import d'acteurs clés avec sources vérifiées
        </p>
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

      {/* Résultats */}
      {acteurs.length > 0 && (
        <Card className="glass">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Acteurs trouvés ({acteurs.length})
                </CardTitle>
                <CardDescription>
                  {selectedCount} sélectionnés · {spdiCount} avec suivi SPDI actif
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
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <Checkbox 
                        checked={acteurs.every(a => a.selected)}
                        onCheckedChange={(checked) => {
                          setActeurs(prev => prev.map(a => ({ ...a, selected: !!checked })));
                        }}
                      />
                    </TableHead>
                    <TableHead>Nom</TableHead>
                    <TableHead>Fonction</TableHead>
                    <TableHead>Organisation</TableHead>
                    <TableHead className="w-20">Cercle</TableHead>
                    <TableHead className="w-24">Score</TableHead>
                    <TableHead className="w-24">SPDI</TableHead>
                    <TableHead>Sources</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {acteurs.map((acteur, index) => (
                    <TableRow key={index} className={acteur.selected ? '' : 'opacity-50'}>
                      <TableCell>
                        <Checkbox 
                          checked={acteur.selected}
                          onCheckedChange={() => toggleActeurSelection(index)}
                        />
                      </TableCell>
                      <TableCell className="font-medium">
                        {acteur.nom_complet}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {acteur.fonction}
                      </TableCell>
                      <TableCell>{acteur.organisation}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={CERCLE_COLORS[acteur.cercle]}>
                          C{acteur.cercle}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{acteur.score_influence}</Badge>
                      </TableCell>
                      <TableCell>
                        <Switch 
                          checked={acteur.suivi_spdi_actif}
                          onCheckedChange={() => toggleActeurSPDI(index)}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          {acteur.statut === 'verifie' ? (
                            <CheckCircle2 className="h-4 w-4 text-green-500" />
                          ) : (
                            <AlertTriangle className="h-4 w-4 text-yellow-500" />
                          )}
                          {acteur.sources.slice(0, 2).map((url, i) => (
                            <a 
                              key={i}
                              href={url} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-primary hover:underline"
                            >
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          ))}
                          {acteur.sources.length > 2 && (
                            <span className="text-xs text-muted-foreground">
                              +{acteur.sources.length - 2}
                            </span>
                          )}
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

      {/* Acteurs sans sources (avertissement) */}
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
                <a 
                  key={i}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-primary hover:underline flex items-center gap-1"
                >
                  <ExternalLink className="h-3 w-3" />
                  {new URL(url).hostname}
                </a>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
