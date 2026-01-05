import { useState } from 'react';
import { ArrowLeft, Save, Plus, Trash2, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useUpdateNewsletter } from '@/hooks/useNewsletters';
import type { Newsletter, NewsletterContenu, NewsletterEssentiel, NewsletterAVenir } from '@/types/newsletter';

interface NewsletterEditorProps {
  newsletter: Newsletter;
  onBack: () => void;
  onSaved: () => void;
}

export function NewsletterEditor({ newsletter, onBack, onSaved }: NewsletterEditorProps) {
  const [contenu, setContenu] = useState<NewsletterContenu>(newsletter.contenu);
  const updateNewsletter = useUpdateNewsletter();

  const handleSave = async () => {
    await updateNewsletter.mutateAsync({
      id: newsletter.id,
      contenu,
    });
    onSaved();
  };

  const updateEdito = (texte: string) => {
    setContenu(prev => ({
      ...prev,
      edito: { ...prev.edito, texte, genere_par_ia: false }
    }));
  };

  const updateEssentiel = (index: number, field: keyof NewsletterEssentiel, value: string) => {
    setContenu(prev => ({
      ...prev,
      essentiel_ansut: prev.essentiel_ansut.map((item, i) => 
        i === index ? { ...item, [field]: value } : item
      )
    }));
  };

  const addEssentiel = () => {
    setContenu(prev => ({
      ...prev,
      essentiel_ansut: [...prev.essentiel_ansut, { titre: '', pourquoi: '', impact: '' }]
    }));
  };

  const removeEssentiel = (index: number) => {
    setContenu(prev => ({
      ...prev,
      essentiel_ansut: prev.essentiel_ansut.filter((_, i) => i !== index)
    }));
  };

  const updateTendance = (field: 'titre' | 'contenu' | 'lien_ansut', value: string) => {
    setContenu(prev => ({
      ...prev,
      tendance_tech: { ...prev.tendance_tech, [field]: value }
    }));
  };

  const updateDecryptage = (field: 'titre' | 'contenu', value: string) => {
    setContenu(prev => ({
      ...prev,
      decryptage: { ...prev.decryptage, [field]: value }
    }));
  };

  const updateChiffre = (field: 'valeur' | 'unite' | 'contexte', value: string) => {
    setContenu(prev => ({
      ...prev,
      chiffre_marquant: { ...prev.chiffre_marquant, [field]: value }
    }));
  };

  const updateAVenir = (index: number, field: keyof NewsletterAVenir, value: string) => {
    setContenu(prev => ({
      ...prev,
      a_venir: prev.a_venir.map((item, i) => 
        i === index ? { ...item, [field]: value } : item
      )
    }));
  };

  const addAVenir = () => {
    setContenu(prev => ({
      ...prev,
      a_venir: [...prev.a_venir, { type: 'evenement', titre: '' }]
    }));
  };

  const removeAVenir = (index: number) => {
    setContenu(prev => ({
      ...prev,
      a_venir: prev.a_venir.filter((_, i) => i !== index)
    }));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={onBack} className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Retour
        </Button>

        <Button 
          onClick={handleSave}
          disabled={updateNewsletter.isPending}
        >
          {updateNewsletter.isPending ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Save className="h-4 w-4 mr-2" />
          )}
          Enregistrer
        </Button>
      </div>

      {/* Édito */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">📝 Édito</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            value={contenu.edito?.texte || ''}
            onChange={(e) => updateEdito(e.target.value)}
            placeholder="3-4 lignes situant le contexte..."
            rows={3}
          />
        </CardContent>
      </Card>

      {/* Essentiel ANSUT */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg">🎯 L'essentiel ANSUT</CardTitle>
          <Button variant="outline" size="sm" onClick={addEssentiel}>
            <Plus className="h-4 w-4 mr-1" />
            Ajouter
          </Button>
        </CardHeader>
        <CardContent className="space-y-6">
          {contenu.essentiel_ansut?.map((item, index) => (
            <div key={index} className="p-4 border rounded-lg space-y-3">
              <div className="flex items-center justify-between">
                <Label>Élément {index + 1}</Label>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => removeEssentiel(index)}
                  className="text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
              <Input
                value={item.titre}
                onChange={(e) => updateEssentiel(index, 'titre', e.target.value)}
                placeholder="Titre orienté impact"
              />
              <Textarea
                value={item.pourquoi}
                onChange={(e) => updateEssentiel(index, 'pourquoi', e.target.value)}
                placeholder="Pourquoi c'est important..."
                rows={2}
              />
              <Textarea
                value={item.impact}
                onChange={(e) => updateEssentiel(index, 'impact', e.target.value)}
                placeholder="Impact concret..."
                rows={2}
              />
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Tendance Tech */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">🔬 Tendance tech du mois</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Titre</Label>
            <Input
              value={contenu.tendance_tech?.titre || ''}
              onChange={(e) => updateTendance('titre', e.target.value)}
              placeholder="Pourquoi tout le monde parle de..."
            />
          </div>
          <div>
            <Label>Contenu</Label>
            <Textarea
              value={contenu.tendance_tech?.contenu || ''}
              onChange={(e) => updateTendance('contenu', e.target.value)}
              placeholder="Explication de la tendance..."
              rows={3}
            />
          </div>
          <div>
            <Label>Lien avec l'ANSUT</Label>
            <Textarea
              value={contenu.tendance_tech?.lien_ansut || ''}
              onChange={(e) => updateTendance('lien_ansut', e.target.value)}
              placeholder="Comment ça concerne l'ANSUT..."
              rows={2}
            />
          </div>
        </CardContent>
      </Card>

      {/* Décryptage */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">📚 En 2 minutes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Titre</Label>
            <Input
              value={contenu.decryptage?.titre || ''}
              onChange={(e) => updateDecryptage('titre', e.target.value)}
              placeholder="C'est quoi vraiment..."
            />
          </div>
          <div>
            <Label>Contenu</Label>
            <Textarea
              value={contenu.decryptage?.contenu || ''}
              onChange={(e) => updateDecryptage('contenu', e.target.value)}
              placeholder="Explication simple..."
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      {/* Chiffre marquant */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">📊 Le chiffre</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-3 gap-4">
          <div>
            <Label>Valeur</Label>
            <Input
              value={contenu.chiffre_marquant?.valeur || ''}
              onChange={(e) => updateChiffre('valeur', e.target.value)}
              placeholder="210"
            />
          </div>
          <div>
            <Label>Unité</Label>
            <Input
              value={contenu.chiffre_marquant?.unite || ''}
              onChange={(e) => updateChiffre('unite', e.target.value)}
              placeholder="localités"
            />
          </div>
          <div className="col-span-3">
            <Label>Contexte</Label>
            <Input
              value={contenu.chiffre_marquant?.contexte || ''}
              onChange={(e) => updateChiffre('contexte', e.target.value)}
              placeholder="Contexte du chiffre..."
            />
          </div>
        </CardContent>
      </Card>

      {/* À venir */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg">📅 À venir</CardTitle>
          <Button variant="outline" size="sm" onClick={addAVenir}>
            <Plus className="h-4 w-4 mr-1" />
            Ajouter
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {contenu.a_venir?.map((item, index) => (
            <div key={index} className="flex items-center gap-3">
              <Select
                value={item.type}
                onValueChange={(v) => updateAVenir(index, 'type', v)}
              >
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="evenement">📆 Événement</SelectItem>
                  <SelectItem value="appel_projets">📢 Appel à projets</SelectItem>
                  <SelectItem value="deploiement">🚀 Déploiement</SelectItem>
                  <SelectItem value="decision">⚖️ Décision</SelectItem>
                </SelectContent>
              </Select>
              <Input
                value={item.titre}
                onChange={(e) => updateAVenir(index, 'titre', e.target.value)}
                placeholder="Titre"
                className="flex-1"
              />
              <Input
                value={item.date || ''}
                onChange={(e) => updateAVenir(index, 'date', e.target.value)}
                placeholder="Date"
                className="w-32"
              />
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => removeAVenir(index)}
                className="text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
