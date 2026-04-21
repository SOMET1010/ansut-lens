import { useState } from "react";
import { ArrowLeft, Plus, Copy, Trash2, FileText, Linkedin, Hash, CheckCircle } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useContenusValides, useCreateContenuValide, useDeleteContenuValide } from "@/hooks/useGouvernanceCom";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";

export default function CoffreContenuPage() {
  const { data: contenus, isLoading } = useContenusValides();
  const createContenu = useCreateContenuValide();
  const deleteContenu = useDeleteContenuValide();
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ titre: "", contenu: "", type: "linkedin_post", categorie: "general", hashtagsStr: "" });
  const [filter, setFilter] = useState("all");

  const handleAdd = () => {
    createContenu.mutate(
      { ...form, hashtags: form.hashtagsStr.split(",").map(h => h.trim()).filter(Boolean) },
      { onSuccess: () => { setShowAdd(false); setForm({ titre: "", contenu: "", type: "linkedin_post", categorie: "general", hashtagsStr: "" }); } }
    );
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copié dans le presse-papier !");
  };

  const filtered = filter === "all" ? contenus : contenus?.filter(c => c.categorie === filter);

  return (
    <div className="w-full space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link to="/admin"><Button variant="ghost" size="icon"><ArrowLeft size={20} /></Button></Link>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2"><FileText size={24} /> Coffre-fort à Contenus</h1>
            <p className="text-muted-foreground">Bibliothèque de posts pré-validés par la Communication</p>
          </div>
        </div>
        <Dialog open={showAdd} onOpenChange={setShowAdd}>
          <DialogTrigger asChild><Button><Plus size={16} className="mr-2" />Nouveau contenu</Button></DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>Créer un contenu validé</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <Input placeholder="Titre (ex: Post MWC Jour 1)" value={form.titre} onChange={e => setForm(p => ({ ...p, titre: e.target.value }))} />
              <Select value={form.type} onValueChange={v => setForm(p => ({ ...p, type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="linkedin_post">Post LinkedIn</SelectItem>
                  <SelectItem value="twitter_post">Post X (Twitter)</SelectItem>
                  <SelectItem value="communique">Communiqué</SelectItem>
                  <SelectItem value="element_langage">Élément de langage</SelectItem>
                </SelectContent>
              </Select>
              <Select value={form.categorie} onValueChange={v => setForm(p => ({ ...p, categorie: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="general">Général</SelectItem>
                  <SelectItem value="evenement">Événement</SelectItem>
                  <SelectItem value="crise">Crise</SelectItem>
                  <SelectItem value="institutionnel">Institutionnel</SelectItem>
                  <SelectItem value="technique">Technique</SelectItem>
                </SelectContent>
              </Select>
              <Textarea placeholder="Contenu du post, prêt à copier-coller..." value={form.contenu} onChange={e => setForm(p => ({ ...p, contenu: e.target.value }))} rows={6} />
              <Input placeholder="Hashtags (séparés par des virgules)" value={form.hashtagsStr} onChange={e => setForm(p => ({ ...p, hashtagsStr: e.target.value }))} />
              <Button onClick={handleAdd} disabled={createContenu.isPending || !form.titre || !form.contenu} className="w-full">
                {createContenu.isPending ? "Création..." : "Ajouter à la bibliothèque"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card><CardContent className="pt-4 text-center">
          <p className="text-3xl font-bold">{contenus?.length || 0}</p>
          <p className="text-sm text-muted-foreground">Contenus validés</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4 text-center">
          <p className="text-3xl font-bold">{contenus?.filter(c => c.type === "linkedin_post").length || 0}</p>
          <p className="text-sm text-muted-foreground">Posts LinkedIn</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4 text-center">
          <p className="text-3xl font-bold">{contenus?.filter(c => c.type === "element_langage").length || 0}</p>
          <p className="text-sm text-muted-foreground">Éléments de langage</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4 text-center">
          <p className="text-3xl font-bold">{contenus?.reduce((acc, c) => acc + (c.utilise_count || 0), 0) || 0}</p>
          <p className="text-sm text-muted-foreground">Utilisations totales</p>
        </CardContent></Card>
      </div>

      {/* Filter */}
      <div className="flex gap-2">
        {["all", "general", "evenement", "crise", "institutionnel", "technique"].map(f => (
          <Button key={f} variant={filter === f ? "default" : "outline"} size="sm" onClick={() => setFilter(f)}>
            {f === "all" ? "Tous" : f.charAt(0).toUpperCase() + f.slice(1)}
          </Button>
        ))}
      </div>

      {/* Content grid */}
      {isLoading ? (
        <p className="text-muted-foreground">Chargement...</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered?.map(contenu => (
            <Card key={contenu.id} className="group hover:border-primary/30 transition-colors">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    {contenu.type === "linkedin_post" ? <Linkedin size={16} className="text-blue-400" /> : <FileText size={16} />}
                    {contenu.titre}
                  </CardTitle>
                  <div className="flex gap-1">
                    <Badge variant="outline">{contenu.type?.replace("_", " ")}</Badge>
                    <Badge variant="secondary">{contenu.categorie}</Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm bg-muted/50 p-3 rounded-lg whitespace-pre-wrap">{contenu.contenu}</p>
                {contenu.hashtags && contenu.hashtags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {contenu.hashtags.map((h: string, i: number) => (
                      <Badge key={i} variant="outline" className="text-xs"><Hash size={10} className="mr-0.5" />{h}</Badge>
                    ))}
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">
                    {contenu.created_at ? formatDistanceToNow(new Date(contenu.created_at), { addSuffix: true, locale: fr }) : ""}
                    {contenu.utilise_count ? ` • ${contenu.utilise_count} utilisations` : ""}
                  </span>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button size="sm" variant="outline" onClick={() => copyToClipboard(contenu.contenu)}>
                      <Copy size={14} className="mr-1" />Copier
                    </Button>
                    <Button size="sm" variant="ghost" className="text-red-400" onClick={() => deleteContenu.mutate(contenu.id)}>
                      <Trash2 size={14} />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {filtered?.length === 0 && !isLoading && (
        <Card><CardContent className="py-8 text-center text-muted-foreground">
          <FileText size={48} className="mx-auto mb-4 opacity-30" />
          <p>Aucun contenu validé. Créez des posts prêts-à-l'emploi pour vos directeurs.</p>
        </CardContent></Card>
      )}
    </div>
  );
}
