import { useState } from "react";
import { ArrowLeft, Plus, Globe, Radar, Eye, Image, Users, Trash2, MapPin, Hash, Linkedin, Twitter, Search, Zap } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import {
  useTerritoires, useCreateTerritoire, useDeleteTerritoire,
  useInfluenceurs, useCreateInfluenceur, useDeleteInfluenceur,
  useAnalysesVisuelles, useAnalyserImage,
  useRadarProximite, useLancerRadarProximite,
} from "@/hooks/useVeilleSemantique";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";

export default function VeilleSemantiquePage() {
  const { data: territoires } = useTerritoires();
  const { data: influenceurs } = useInfluenceurs();
  const { data: analyses } = useAnalysesVisuelles();
  const { data: proximite } = useRadarProximite();
  const createTerritoire = useCreateTerritoire();
  const deleteTerritoire = useDeleteTerritoire();
  const createInfluenceur = useCreateInfluenceur();
  const deleteInfluenceur = useDeleteInfluenceur();
  const analyserImage = useAnalyserImage();
  const lancerProximite = useLancerRadarProximite();

  const [showAddTerritoire, setShowAddTerritoire] = useState(false);
  const [showAddInfluenceur, setShowAddInfluenceur] = useState(false);
  const [showAnalyseImage, setShowAnalyseImage] = useState(false);

  const [tForm, setTForm] = useState({ nom: "", description: "", conceptsStr: "", motsClesStr: "", hashtagsStr: "", priorite: 50 });
  const [iForm, setIForm] = useState({ nom: "", fonction: "", organisation: "", pays: "International", plateforme: "linkedin", identifiant: "", categorie: "expert", score_pertinence: 50 });
  const [imageUrl, setImageUrl] = useState("");

  const handleAddTerritoire = () => {
    createTerritoire.mutate({
      nom: tForm.nom, description: tForm.description, priorite: tForm.priorite,
      concepts: tForm.conceptsStr.split(",").map(s => s.trim()).filter(Boolean),
      mots_cles_associes: tForm.motsClesStr.split(",").map(s => s.trim()).filter(Boolean),
      hashtags: tForm.hashtagsStr.split(",").map(s => s.trim()).filter(Boolean),
    }, { onSuccess: () => setShowAddTerritoire(false) });
  };

  const handleAddInfluenceur = () => {
    createInfluenceur.mutate(iForm, { onSuccess: () => setShowAddInfluenceur(false) });
  };

  return (
    <div className="w-full space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link to="/admin"><Button variant="ghost" size="icon"><ArrowLeft size={20} /></Button></Link>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2"><Radar size={24} /> Veille Sémantique</h1>
            <p className="text-muted-foreground">Territoires d'expression, influenceurs métier, analyse visuelle et radar de proximité</p>
          </div>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardContent className="pt-4 text-center">
          <p className="text-3xl font-bold">{territoires?.length || 0}</p>
          <p className="text-sm text-muted-foreground">Territoires actifs</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4 text-center">
          <p className="text-3xl font-bold">{influenceurs?.length || 0}</p>
          <p className="text-sm text-muted-foreground">Influenceurs suivis</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4 text-center">
          <p className="text-3xl font-bold">{analyses?.filter(a => (a as any).pertinence_ansut).length || 0}</p>
          <p className="text-sm text-muted-foreground">Images ANSUT détectées</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4 text-center">
          <p className="text-3xl font-bold">{proximite?.length || 0}</p>
          <p className="text-sm text-muted-foreground">Projets voisins</p>
        </CardContent></Card>
      </div>

      <Tabs defaultValue="territoires">
        <TabsList className="grid grid-cols-4 w-full">
          <TabsTrigger value="territoires"><Globe size={14} className="mr-1" />Territoires</TabsTrigger>
          <TabsTrigger value="influenceurs"><Users size={14} className="mr-1" />Influenceurs</TabsTrigger>
          <TabsTrigger value="visuel"><Image size={14} className="mr-1" />Analyse Visuelle</TabsTrigger>
          <TabsTrigger value="proximite"><MapPin size={14} className="mr-1" />Radar Proximité</TabsTrigger>
        </TabsList>

        {/* TERRITOIRES */}
        <TabsContent value="territoires" className="space-y-4 mt-4">
          <div className="flex justify-end">
            <Dialog open={showAddTerritoire} onOpenChange={setShowAddTerritoire}>
              <DialogTrigger asChild><Button><Plus size={16} className="mr-2" />Nouveau territoire</Button></DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Créer un territoire d'expression</DialogTitle></DialogHeader>
                <div className="space-y-3">
                  <Input placeholder="Nom (ex: Service Universel)" value={tForm.nom} onChange={e => setTForm(p => ({ ...p, nom: e.target.value }))} />
                  <Textarea placeholder="Description" value={tForm.description} onChange={e => setTForm(p => ({ ...p, description: e.target.value }))} rows={2} />
                  <Textarea placeholder="Concepts (séparés par virgules)" value={tForm.conceptsStr} onChange={e => setTForm(p => ({ ...p, conceptsStr: e.target.value }))} rows={2} />
                  <Input placeholder="Mots-clés associés (séparés par virgules)" value={tForm.motsClesStr} onChange={e => setTForm(p => ({ ...p, motsClesStr: e.target.value }))} />
                  <Input placeholder="Hashtags (séparés par virgules)" value={tForm.hashtagsStr} onChange={e => setTForm(p => ({ ...p, hashtagsStr: e.target.value }))} />
                  <Button onClick={handleAddTerritoire} disabled={createTerritoire.isPending || !tForm.nom} className="w-full">
                    {createTerritoire.isPending ? "Création..." : "Créer"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {territoires?.map(t => (
              <Card key={t.id} className="hover:border-primary/30 transition-colors">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-base">{t.nom}</CardTitle>
                    <Badge variant="outline">Priorité {t.priorite}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  {t.description && <p className="text-sm text-muted-foreground">{t.description}</p>}
                  <div>
                    <p className="text-xs font-semibold mb-1">Concepts:</p>
                    <div className="flex flex-wrap gap-1">{(t.concepts as string[] || []).map((c, i) => <Badge key={i} variant="secondary" className="text-xs">{c}</Badge>)}</div>
                  </div>
                  <div>
                    <p className="text-xs font-semibold mb-1">Hashtags:</p>
                    <div className="flex flex-wrap gap-1">{(t.hashtags as string[] || []).map((h, i) => <Badge key={i} variant="outline" className="text-xs"><Hash size={10} className="mr-0.5" />{h}</Badge>)}</div>
                  </div>
                  <div className="flex justify-between items-center pt-2">
                    <span className="text-xs text-muted-foreground">Pays: {(t.pays_cibles as string[] || []).join(", ")}</span>
                    <Button size="sm" variant="ghost" className="text-destructive" onClick={() => deleteTerritoire.mutate(t.id)}><Trash2 size={14} /></Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* INFLUENCEURS */}
        <TabsContent value="influenceurs" className="space-y-4 mt-4">
          <div className="flex justify-end">
            <Dialog open={showAddInfluenceur} onOpenChange={setShowAddInfluenceur}>
              <DialogTrigger asChild><Button><Plus size={16} className="mr-2" />Nouvel influenceur</Button></DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Ajouter un influenceur métier</DialogTitle></DialogHeader>
                <div className="space-y-3">
                  <Input placeholder="Nom" value={iForm.nom} onChange={e => setIForm(p => ({ ...p, nom: e.target.value }))} />
                  <Input placeholder="Fonction" value={iForm.fonction} onChange={e => setIForm(p => ({ ...p, fonction: e.target.value }))} />
                  <Input placeholder="Organisation" value={iForm.organisation} onChange={e => setIForm(p => ({ ...p, organisation: e.target.value }))} />
                  <Input placeholder="Pays" value={iForm.pays} onChange={e => setIForm(p => ({ ...p, pays: e.target.value }))} />
                  <Select value={iForm.plateforme} onValueChange={v => setIForm(p => ({ ...p, plateforme: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="linkedin">LinkedIn</SelectItem>
                      <SelectItem value="twitter">X (Twitter)</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input placeholder="Identifiant (@nom)" value={iForm.identifiant} onChange={e => setIForm(p => ({ ...p, identifiant: e.target.value }))} />
                  <Select value={iForm.categorie} onValueChange={v => setIForm(p => ({ ...p, categorie: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="expert">Expert sectoriel</SelectItem>
                      <SelectItem value="decideur">Décideur politique</SelectItem>
                      <SelectItem value="operateur">DG Opérateur</SelectItem>
                      <SelectItem value="journaliste">Journaliste tech</SelectItem>
                      <SelectItem value="institution">Institution (BM/BAD)</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button onClick={handleAddInfluenceur} disabled={createInfluenceur.isPending || !iForm.nom || !iForm.identifiant} className="w-full">
                    {createInfluenceur.isPending ? "Ajout..." : "Ajouter"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {influenceurs?.map(inf => (
              <Card key={inf.id}>
                <CardContent className="pt-4 space-y-2">
                  <div className="flex items-center gap-2">
                    {inf.plateforme === "linkedin" ? <Linkedin size={16} className="text-blue-400" /> : <Twitter size={16} />}
                    <span className="font-semibold">{inf.nom}</span>
                  </div>
                  {inf.fonction && <p className="text-sm text-muted-foreground">{inf.fonction}</p>}
                  {inf.organisation && <p className="text-sm">{inf.organisation}</p>}
                  <div className="flex gap-2">
                    <Badge variant="outline">{inf.categorie}</Badge>
                    <Badge variant="secondary">{inf.pays}</Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">Pertinence:</span>
                    <Progress value={inf.score_pertinence || 0} className="h-2 flex-1" />
                    <span className="text-xs font-bold">{inf.score_pertinence}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-xs text-muted-foreground">{inf.identifiant}</span>
                    <Button size="sm" variant="ghost" className="text-destructive" onClick={() => deleteInfluenceur.mutate(inf.id)}><Trash2 size={14} /></Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* ANALYSE VISUELLE */}
        <TabsContent value="visuel" className="space-y-4 mt-4">
          <div className="flex justify-end">
            <Dialog open={showAnalyseImage} onOpenChange={setShowAnalyseImage}>
              <DialogTrigger asChild><Button><Eye size={16} className="mr-2" />Analyser une image</Button></DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Analyse visuelle multimodale</DialogTitle></DialogHeader>
                <div className="space-y-3">
                  <Input placeholder="URL de l'image" value={imageUrl} onChange={e => setImageUrl(e.target.value)} />
                  <Button onClick={() => { analyserImage.mutate({ image_url: imageUrl }); setShowAnalyseImage(false); }} disabled={analyserImage.isPending || !imageUrl} className="w-full">
                    {analyserImage.isPending ? "Analyse Gemini en cours..." : "Analyser avec Gemini Vision"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {analyses?.map(a => {
              const result = a.resultat_analyse as any;
              return (
                <Card key={a.id} className={(a as any).pertinence_ansut ? "border-primary/30" : ""}>
                  <CardContent className="pt-4 space-y-2">
                    <div className="flex items-start gap-3">
                      <img src={a.image_url} alt="Analyse" className="w-20 h-20 rounded object-cover" onError={e => (e.target as HTMLImageElement).style.display = "none"} />
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          {(a as any).pertinence_ansut && <Badge className="bg-primary text-primary-foreground">ANSUT Pertinent</Badge>}
                          <Badge variant="outline">Score: {a.score_pertinence}/100</Badge>
                        </div>
                        <p className="text-sm">{result?.contexte || "Analyse en cours..."}</p>
                        {(a.logos_detectes as string[])?.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {(a.logos_detectes as string[]).map((l, i) => <Badge key={i} variant="secondary" className="text-xs">{l}</Badge>)}
                          </div>
                        )}
                      </div>
                    </div>
                    {result?.recommandation_com && (
                      <p className="text-sm bg-primary/5 p-2 rounded text-primary">💡 {result.recommandation_com}</p>
                    )}
                    <p className="text-xs text-muted-foreground">{a.created_at ? formatDistanceToNow(new Date(a.created_at), { addSuffix: true, locale: fr }) : ""}</p>
                  </CardContent>
                </Card>
              );
            })}
            {(!analyses || analyses.length === 0) && (
              <Card className="col-span-2"><CardContent className="py-8 text-center text-muted-foreground">
                <Image size={48} className="mx-auto mb-4 opacity-30" />
                <p>Soumettez une URL d'image pour l'analyser avec Gemini Vision.</p>
              </CardContent></Card>
            )}
          </div>
        </TabsContent>

        {/* RADAR DE PROXIMITÉ */}
        <TabsContent value="proximite" className="space-y-4 mt-4">
          <div className="flex justify-end">
            <Button onClick={() => lancerProximite.mutate()} disabled={lancerProximite.isPending}>
              <Search size={16} className="mr-2" />
              {lancerProximite.isPending ? "Scan en cours..." : "Scanner les projets voisins"}
            </Button>
          </div>
          <div className="space-y-4">
            {proximite?.map(p => (
              <Card key={p.id} className="hover:border-primary/30 transition-colors">
                <CardContent className="pt-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline"><MapPin size={12} className="mr-1" />{p.pays}</Badge>
                        <Badge variant="secondary">{p.organisme}</Badge>
                        <Badge className={p.similitude_score > 70 ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}>
                          Similitude: {p.similitude_score}%
                        </Badge>
                      </div>
                      <h3 className="font-semibold">{p.titre}</h3>
                      <p className="text-sm text-muted-foreground mt-1">{p.description}</p>
                      {p.projet_ansut_equivalent && (
                        <p className="text-sm mt-2"><Zap size={14} className="inline mr-1 text-primary" /><span className="font-semibold">Équivalent ANSUT:</span> {p.projet_ansut_equivalent}</p>
                      )}
                      {p.recommandation_com && (
                        <p className="text-sm bg-primary/5 p-2 rounded mt-2">💡 {p.recommandation_com}</p>
                      )}
                    </div>
                    <div className="text-right">
                      <Progress value={p.similitude_score} className="h-2 w-20" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
            {(!proximite || proximite.length === 0) && (
              <Card><CardContent className="py-8 text-center text-muted-foreground">
                <MapPin size={48} className="mx-auto mb-4 opacity-30" />
                <p>Lancez un scan pour détecter les projets similaires chez les voisins (Sénégal, Ghana, Nigeria, Kenya, Rwanda).</p>
              </CardContent></Card>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
