import { useState } from "react";
import { ArrowLeft, Eye, Plus, Shield, AlertTriangle, CheckCircle, Trash2, Send, Linkedin, Twitter } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useVipComptes, useCreateVipCompte, useDeleteVipCompte, useVipAlertes, useTraiterVipAlerte, useAnalyserPostVip, useGenererChecklistCrise } from "@/hooks/useGouvernanceCom";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";

const niveauColors: Record<string, string> = {
  normal: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
  attention: "bg-amber-500/10 text-amber-400 border-amber-500/30",
  critique: "bg-red-500/10 text-red-400 border-red-500/30",
};

const platformIcons: Record<string, React.ReactNode> = {
  linkedin: <Linkedin size={16} />,
  twitter: <Twitter size={16} />,
};

export default function ShadowTrackerPage() {
  const { data: comptes, isLoading: loadingComptes } = useVipComptes();
  const { data: alertes, isLoading: loadingAlertes } = useVipAlertes();
  const createCompte = useCreateVipCompte();
  const deleteCompte = useDeleteVipCompte();
  const traiterAlerte = useTraiterVipAlerte();
  const analyser = useAnalyserPostVip();
  const genererChecklist = useGenererChecklistCrise();

  const [showAddVip, setShowAddVip] = useState(false);
  const [showScanPost, setShowScanPost] = useState(false);
  const [checklist, setChecklist] = useState<any>(null);

  // Form states
  const [vipForm, setVipForm] = useState({ nom: "", fonction: "", plateforme: "linkedin", identifiant: "", url_profil: "" });
  const [scanForm, setScanForm] = useState({ vip_compte_id: "", contenu: "", url_post: "", plateforme: "linkedin" });

  const handleAddVip = () => {
    createCompte.mutate(vipForm, { onSuccess: () => { setShowAddVip(false); setVipForm({ nom: "", fonction: "", plateforme: "linkedin", identifiant: "", url_profil: "" }); } });
  };

  const handleScanPost = () => {
    analyser.mutate(scanForm, { onSuccess: () => setShowScanPost(false) });
  };

  const handleCrisisChecklist = async (contenu: string, plateforme: string) => {
    const result = await genererChecklist.mutateAsync({ contenu, plateforme });
    setChecklist(result.checklist);
  };

  const alertesNonTraitees = alertes?.filter(a => !a.traitee) || [];
  const alertesCritiques = alertes?.filter(a => a.niveau_risque === "critique") || [];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link to="/admin"><Button variant="ghost" size="icon"><ArrowLeft size={20} /></Button></Link>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2"><Eye size={24} /> Shadow Tracker VIP</h1>
            <p className="text-muted-foreground">Surveillance des publications des directeurs et VIP internes</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Dialog open={showScanPost} onOpenChange={setShowScanPost}>
            <DialogTrigger asChild><Button variant="outline"><Send size={16} className="mr-2" />Analyser un post</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Analyser un post VIP</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <Select value={scanForm.vip_compte_id} onValueChange={v => setScanForm(p => ({ ...p, vip_compte_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Sélectionner le VIP" /></SelectTrigger>
                  <SelectContent>{comptes?.map(c => <SelectItem key={c.id} value={c.id}>{c.nom} ({c.plateforme})</SelectItem>)}</SelectContent>
                </Select>
                <Select value={scanForm.plateforme} onValueChange={v => setScanForm(p => ({ ...p, plateforme: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="linkedin">LinkedIn</SelectItem>
                    <SelectItem value="twitter">X (Twitter)</SelectItem>
                    <SelectItem value="facebook">Facebook</SelectItem>
                  </SelectContent>
                </Select>
                <Textarea placeholder="Collez le contenu du post ici..." value={scanForm.contenu} onChange={e => setScanForm(p => ({ ...p, contenu: e.target.value }))} rows={5} />
                <Input placeholder="URL du post (optionnel)" value={scanForm.url_post} onChange={e => setScanForm(p => ({ ...p, url_post: e.target.value }))} />
                <Button onClick={handleScanPost} disabled={analyser.isPending || !scanForm.contenu || !scanForm.vip_compte_id} className="w-full">
                  {analyser.isPending ? "Analyse IA en cours..." : "Lancer l'analyse de conformité"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
          <Dialog open={showAddVip} onOpenChange={setShowAddVip}>
            <DialogTrigger asChild><Button><Plus size={16} className="mr-2" />Ajouter un VIP</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Nouveau compte VIP à surveiller</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <Input placeholder="Nom complet" value={vipForm.nom} onChange={e => setVipForm(p => ({ ...p, nom: e.target.value }))} />
                <Input placeholder="Fonction (ex: Directeur Général)" value={vipForm.fonction} onChange={e => setVipForm(p => ({ ...p, fonction: e.target.value }))} />
                <Select value={vipForm.plateforme} onValueChange={v => setVipForm(p => ({ ...p, plateforme: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="linkedin">LinkedIn</SelectItem>
                    <SelectItem value="twitter">X (Twitter)</SelectItem>
                    <SelectItem value="facebook">Facebook</SelectItem>
                  </SelectContent>
                </Select>
                <Input placeholder="Identifiant (ex: @nom_profil)" value={vipForm.identifiant} onChange={e => setVipForm(p => ({ ...p, identifiant: e.target.value }))} />
                <Input placeholder="URL du profil" value={vipForm.url_profil} onChange={e => setVipForm(p => ({ ...p, url_profil: e.target.value }))} />
                <Button onClick={handleAddVip} disabled={createCompte.isPending || !vipForm.nom || !vipForm.identifiant} className="w-full">
                  {createCompte.isPending ? "Ajout..." : "Ajouter"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card><CardContent className="pt-4 text-center">
          <p className="text-3xl font-bold">{comptes?.length || 0}</p>
          <p className="text-sm text-muted-foreground">Comptes surveillés</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4 text-center">
          <p className="text-3xl font-bold">{alertes?.length || 0}</p>
          <p className="text-sm text-muted-foreground">Posts analysés</p>
        </CardContent></Card>
        <Card className={alertesNonTraitees.length > 0 ? "border-amber-500/50" : ""}><CardContent className="pt-4 text-center">
          <p className="text-3xl font-bold text-amber-400">{alertesNonTraitees.length}</p>
          <p className="text-sm text-muted-foreground">À traiter</p>
        </CardContent></Card>
        <Card className={alertesCritiques.length > 0 ? "border-red-500/50" : ""}><CardContent className="pt-4 text-center">
          <p className="text-3xl font-bold text-red-400">{alertesCritiques.length}</p>
          <p className="text-sm text-muted-foreground">Critiques</p>
        </CardContent></Card>
      </div>

      <Tabs defaultValue="alertes">
        <TabsList>
          <TabsTrigger value="alertes">Alertes Publications ({alertes?.length || 0})</TabsTrigger>
          <TabsTrigger value="comptes">Comptes VIP ({comptes?.length || 0})</TabsTrigger>
          <TabsTrigger value="crise">Checklist de Crise</TabsTrigger>
        </TabsList>

        <TabsContent value="alertes" className="space-y-4 mt-4">
          {loadingAlertes ? (
            <p className="text-muted-foreground">Chargement...</p>
          ) : alertes?.length === 0 ? (
            <Card><CardContent className="py-8 text-center text-muted-foreground">
              Aucune alerte. Utilisez "Analyser un post" pour scanner les publications VIP.
            </CardContent></Card>
          ) : (
            alertes?.map(alerte => {
              const analyse = alerte.analyse_conformite as any;
              return (
                <Card key={alerte.id} className={alerte.niveau_risque === "critique" ? "border-red-500/30" : alerte.niveau_risque === "attention" ? "border-amber-500/30" : ""}>
                  <CardContent className="pt-4 space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        {platformIcons[(alerte as any).vip_comptes?.plateforme] || <Eye size={16} />}
                        <span className="font-semibold">{(alerte as any).vip_comptes?.nom || "VIP"}</span>
                        <Badge variant="outline" className={niveauColors[alerte.niveau_risque || "normal"]}>
                          {alerte.niveau_risque === "critique" ? <AlertTriangle size={12} className="mr-1" /> : null}
                          {alerte.niveau_risque}
                        </Badge>
                        {alerte.traitee && <Badge variant="outline" className="text-emerald-400"><CheckCircle size={12} className="mr-1" />Traitée</Badge>}
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {alerte.created_at ? formatDistanceToNow(new Date(alerte.created_at), { addSuffix: true, locale: fr }) : ""}
                      </span>
                    </div>
                    <p className="text-sm bg-muted/50 p-3 rounded-lg">{alerte.contenu?.substring(0, 300)}{(alerte.contenu?.length || 0) > 300 ? "..." : ""}</p>
                    {analyse?.conformite_score !== undefined && (
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                        <div><span className="text-muted-foreground">Conformité:</span> <span className="font-bold">{analyse.conformite_score}/100</span></div>
                        <div><span className="text-muted-foreground">Alignement:</span> <span className="font-bold">{analyse.alignement_strategie}</span></div>
                        <div><span className="text-muted-foreground">Hashtags manquants:</span> <span className="text-amber-400">{analyse.hashtags_manquants?.join(", ") || "Aucun"}</span></div>
                        <div><span className="text-muted-foreground">Thèmes:</span> {analyse.themes_detectes?.join(", ")}</div>
                      </div>
                    )}
                    {analyse?.suggestion_amelioration && (
                      <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 text-sm">
                        <p className="font-semibold text-primary mb-1">💡 Suggestion pour la Com:</p>
                        <p>{analyse.suggestion_amelioration}</p>
                      </div>
                    )}
                    <div className="flex gap-2">
                      {!alerte.traitee && <Button size="sm" variant="outline" onClick={() => traiterAlerte.mutate(alerte.id)}>Marquer traitée</Button>}
                      {alerte.niveau_risque !== "normal" && (
                        <Button size="sm" variant="destructive" onClick={() => handleCrisisChecklist(alerte.contenu || "", alerte.plateforme)}>
                          <Shield size={14} className="mr-1" />Checklist de crise
                        </Button>
                      )}
                      {alerte.url_post && <Button size="sm" variant="ghost" asChild><a href={alerte.url_post} target="_blank" rel="noopener">Voir le post</a></Button>}
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </TabsContent>

        <TabsContent value="comptes" className="mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {comptes?.map(compte => (
              <Card key={compte.id}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center gap-2">
                    {platformIcons[compte.plateforme] || <Eye size={16} />}
                    {compte.nom}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {compte.fonction && <p className="text-sm text-muted-foreground">{compte.fonction}</p>}
                  <p className="text-sm"><span className="text-muted-foreground">Identifiant:</span> {compte.identifiant}</p>
                  <p className="text-sm"><span className="text-muted-foreground">Plateforme:</span> <Badge variant="outline">{compte.plateforme}</Badge></p>
                  {compte.derniere_verification && (
                    <p className="text-xs text-muted-foreground">Dernière vérification: {formatDistanceToNow(new Date(compte.derniere_verification), { addSuffix: true, locale: fr })}</p>
                  )}
                  <Button size="sm" variant="ghost" className="text-red-400" onClick={() => deleteCompte.mutate(compte.id)}>
                    <Trash2 size={14} className="mr-1" />Supprimer
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="crise" className="mt-4 space-y-4">
          {checklist ? (
            <Card className="border-red-500/30">
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Shield size={20} className="text-red-400" />Checklist de Crise Générée</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Badge variant="outline" className={checklist.urgence === "haute" ? "text-red-400" : "text-amber-400"}>Urgence: {checklist.urgence}</Badge>
                <div>
                  <p className="font-semibold mb-2">Actions immédiates:</p>
                  <ul className="space-y-1">{checklist.actions_immediates?.map((a: string, i: number) => <li key={i} className="flex items-start gap-2 text-sm"><CheckCircle size={14} className="mt-0.5 text-muted-foreground" />{a}</li>)}</ul>
                </div>
                {checklist.message_correctif_suggere && (
                  <div className="bg-muted/50 p-3 rounded-lg">
                    <p className="font-semibold mb-1">Message correctif pour le VIP:</p>
                    <p className="text-sm">{checklist.message_correctif_suggere}</p>
                  </div>
                )}
                {checklist.elements_langage && (
                  <div>
                    <p className="font-semibold mb-2">Éléments de langage:</p>
                    <div className="flex flex-wrap gap-2">{checklist.elements_langage.map((e: string, i: number) => <Badge key={i} variant="secondary">{e}</Badge>)}</div>
                  </div>
                )}
                <p className="text-sm text-muted-foreground">Délai de réaction recommandé: {checklist.delai_reaction_heures}h</p>
              </CardContent>
            </Card>
          ) : (
            <Card><CardContent className="py-8 text-center text-muted-foreground">
              <Shield size={48} className="mx-auto mb-4 opacity-30" />
              <p>Utilisez le bouton "Checklist de crise" sur une alerte critique pour générer un plan de réponse automatique.</p>
            </CardContent></Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
