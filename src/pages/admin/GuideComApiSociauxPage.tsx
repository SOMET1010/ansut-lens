import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Printer, ArrowLeft, ShieldAlert, Mail, KeyRound, MapPin, UserCheck, Wand2 } from "lucide-react";
import { Link } from "react-router-dom";
import { MessageGenerator } from "@/components/admin/MessageGenerator";

interface NetworkSheet {
  id: string;
  name: string;
  color: string;
  contact: string;
  portal: { label: string; url: string };
  asks: { label: string; required?: boolean; hint?: string }[];
  template: string;
}

const SHEETS: NetworkSheet[] = [
  {
    id: "linkedin",
    name: "LinkedIn",
    color: "bg-[#0A66C2]",
    contact: "Community Manager LinkedIn ANSUT (ou responsable du compte développeur LinkedIn)",
    portal: { label: "LinkedIn Developer Portal", url: "https://developer.linkedin.com" },
    asks: [
      { label: "Page ID Entreprise", required: true, hint: "Visible dans l'URL : linkedin.com/company/[ID]" },
      { label: "Access Token (OAuth)", required: true, hint: "Onglet Auth de l'application LinkedIn" },
      { label: "Date d'expiration du token", required: true },
      { label: "Refresh Token", hint: "Si disponible, pour renouvellement automatique" },
    ],
    template:
      "Bonjour, pour connecter notre outil de veille ANSUT RADAR à la page LinkedIn officielle, peux-tu me transmettre : 1) l'ID de la page entreprise ANSUT, 2) un Access Token généré depuis le LinkedIn Developer Portal, 3) la date d'expiration de ce token. Si tu n'as pas accès au Developer Portal, indique-moi qui gère le compte développeur LinkedIn d'ANSUT.",
  },
  {
    id: "facebook",
    name: "Facebook / Instagram",
    color: "bg-[#1877F2]",
    contact: "Administrateur Meta Business Suite ANSUT",
    portal: { label: "Meta Business Suite", url: "https://business.facebook.com" },
    asks: [
      { label: "Page ID Facebook ANSUT", required: true, hint: "Paramètres → À propos → ID de la Page" },
      { label: "Instagram Business Account ID", required: true, hint: "Compte Instagram lié à la page" },
      { label: "Long-lived Page Access Token", required: true, hint: "Durée 60 jours, à régénérer" },
      { label: "App ID + App Secret", hint: "Si nouvelle application Meta à créer" },
    ],
    template:
      "Bonjour, pour la veille des comptes officiels ANSUT, peux-tu générer depuis Meta Business Suite : 1) le Page ID Facebook, 2) l'Instagram Business Account ID, 3) un Long-lived Page Access Token (60 jours). Merci de ne pas les envoyer par WhatsApp / SMS — utilise le formulaire sécurisé de l'admin RADAR.",
  },
  {
    id: "x",
    name: "X (ex-Twitter)",
    color: "bg-black",
    contact: "Responsable du compte développeur X (Twitter) ANSUT",
    portal: { label: "X Developer Portal", url: "https://developer.x.com" },
    asks: [
      { label: "Bearer Token", required: true, hint: "Onglet Keys & Tokens → Bearer Token" },
      { label: "API Key + API Secret", required: true },
      { label: "Access Token + Access Token Secret", hint: "Pour publication, optionnel pour la veille" },
    ],
    template:
      "Bonjour, pour la veille du compte X ANSUT, peux-tu générer depuis le Developer Portal X : 1) un Bearer Token, 2) l'API Key et l'API Secret de l'application. Précise le plan d'API utilisé (Free, Basic, Pro) pour qu'on dimensionne la collecte.",
  },
  {
    id: "youtube",
    name: "YouTube",
    color: "bg-[#FF0000]",
    contact: "Administrateur Google Cloud du projet ANSUT",
    portal: { label: "Google Cloud Console", url: "https://console.cloud.google.com" },
    asks: [
      { label: "API Key YouTube Data API v3", required: true, hint: "APIs & Services → Credentials" },
      { label: "Channel ID de la chaîne ANSUT", required: true, hint: "URL de la chaîne ou Studio YouTube → Paramètres" },
    ],
    template:
      "Bonjour, peux-tu me transmettre depuis Google Cloud Console (projet ANSUT) : 1) une API Key avec YouTube Data API v3 activée, 2) le Channel ID officiel de la chaîne ANSUT. Restreins la clé au domaine RADAR si possible.",
  },
  {
    id: "telegram",
    name: "Telegram",
    color: "bg-[#229ED9]",
    contact: "Toi-même (création très rapide via @BotFather)",
    portal: { label: "BotFather Telegram", url: "https://t.me/BotFather" },
    asks: [
      { label: "Bot Token", required: true, hint: "Format : 123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11" },
      { label: "Channel ID / Chat ID", required: true, hint: "Ajouter le bot comme admin du canal ANSUT" },
    ],
    template:
      "Création autonome : ouvre Telegram, écris à @BotFather, commande /newbot, choisis un nom (ex. ANSUT Radar Bot). Récupère le token. Ajoute le bot comme administrateur du canal officiel ANSUT.",
  },
  {
    id: "tiktok",
    name: "TikTok",
    color: "bg-black",
    contact: "Administrateur du compte TikTok For Developers ANSUT",
    portal: { label: "TikTok For Developers", url: "https://developers.tiktok.com" },
    asks: [
      { label: "Client Key", required: true },
      { label: "Client Secret", required: true },
      { label: "Access Token", required: true, hint: "Généré après autorisation OAuth" },
    ],
    template:
      "Bonjour, pour la veille du compte TikTok ANSUT, peux-tu créer une app sur developers.tiktok.com et me transmettre : 1) Client Key, 2) Client Secret, 3) Access Token avec scopes lecture (user.info.basic, video.list).",
  },
];

export default function GuideComApiSociauxPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Toolbar — masquée à l'impression */}
      <div className="border-b bg-card print:hidden sticky top-0 z-10">
        <div className="container mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button asChild variant="ghost" size="sm">
              <Link to="/admin/connecteurs-sociaux">
                <ArrowLeft className="h-4 w-4 mr-1" />
                Retour aux connecteurs
              </Link>
            </Button>
          </div>
          <Button onClick={() => window.print()} size="sm">
            <Printer className="h-4 w-4 mr-2" />
            Imprimer / Enregistrer en PDF
          </Button>
        </div>
      </div>

      {/* Document imprimable */}
      <div className="container mx-auto px-8 py-10 max-w-4xl print:px-0 print:py-4 print:max-w-none">
        {/* En-tête */}
        <header className="mb-10 pb-6 border-b print:mb-6">
          <div className="text-xs uppercase tracking-widest text-muted-foreground mb-2">
            Agence Nationale du Service Universel des Télécommunications (ANSUT)
          </div>
          <h1 className="text-3xl font-bold mb-2">Guide Com — API des réseaux sociaux</h1>
          <p className="text-muted-foreground">
            Fiches pratiques pour l'équipe Communication. Aucune connaissance technique requise :
            chaque fiche indique <strong>qui contacter</strong>, <strong>quoi demander</strong> et{" "}
            <strong>où le trouver</strong>.
          </p>
        </header>

        {/* Règles de sécurité */}
        <Card className="mb-8 border-destructive/30 print:break-inside-avoid">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <ShieldAlert className="h-5 w-5 text-destructive" />
              Règles de sécurité — à lire avant de demander une clé
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-2">
            <p>❌ <strong>Jamais</strong> envoyer une clé par WhatsApp, SMS, ou email non chiffré.</p>
            <p>✅ Saisir les clés <strong>directement</strong> dans Admin → Connecteurs sociaux → Configurer les secrets.</p>
            <p>✅ En cas de fuite : <strong>régénérer immédiatement</strong> la clé depuis le portail concerné.</p>
            <p>✅ Préférer une session de 30 min en présence d'un référent technique pour la première saisie.</p>
          </CardContent>
        </Card>

        {/* Fiches par réseau */}
        <div className="space-y-6">
          {SHEETS.map((s) => (
            <Card key={s.id} className="overflow-hidden print:break-inside-avoid print:shadow-none print:border">
              <div className={`h-2 ${s.color}`} aria-hidden />
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center justify-between">
                  <span className="text-xl">{s.name}</span>
                  <Badge variant="outline" className="font-normal">
                    Fiche n°{SHEETS.indexOf(s) + 1}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-sm">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 print:grid-cols-2">
                  <div>
                    <div className="flex items-center gap-2 font-semibold mb-1">
                      <UserCheck className="h-4 w-4 text-primary" />
                      Qui contacter
                    </div>
                    <p className="text-muted-foreground">{s.contact}</p>
                  </div>
                  <div>
                    <div className="flex items-center gap-2 font-semibold mb-1">
                      <MapPin className="h-4 w-4 text-primary" />
                      Où le trouver
                    </div>
                    <a
                      href={s.portal.url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-primary underline underline-offset-2 break-all"
                    >
                      {s.portal.label} — {s.portal.url}
                    </a>
                  </div>
                </div>

                <div>
                  <div className="flex items-center gap-2 font-semibold mb-2">
                    <KeyRound className="h-4 w-4 text-primary" />
                    Quoi demander
                  </div>
                  <ul className="space-y-1.5">
                    {s.asks.map((a, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="text-primary mt-0.5">▸</span>
                        <div>
                          <span className="font-medium">{a.label}</span>
                          {a.required ? (
                            <Badge variant="secondary" className="ml-2 text-xs py-0">
                              Requis
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="ml-2 text-xs py-0">
                              Optionnel
                            </Badge>
                          )}
                          {a.hint && (
                            <div className="text-xs text-muted-foreground mt-0.5">{a.hint}</div>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="bg-muted/40 rounded-md p-3 border">
                  <div className="flex items-center gap-2 font-semibold mb-1 text-xs uppercase tracking-wide text-muted-foreground">
                    <Mail className="h-3.5 w-3.5" />
                    Message prêt à envoyer (version imprimable)
                  </div>
                  <p className="text-sm italic">« {s.template} »</p>
                </div>

                <div className="rounded-md border p-3 bg-card">
                  <div className="flex items-center gap-2 font-semibold mb-3 text-xs uppercase tracking-wide text-primary">
                    <Wand2 className="h-3.5 w-3.5" />
                    Générateur de message personnalisé
                  </div>
                  <MessageGenerator
                    network={s.name}
                    defaultContact={s.contact}
                    template={s.template}
                    asks={s.asks}
                  />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Pied imprimable */}
        <footer className="mt-12 pt-6 border-t text-xs text-muted-foreground text-center print:mt-8">
          Document interne ANSUT RADAR — Imprimé le {new Date().toLocaleDateString("fr-FR")} —
          À ne pas diffuser à l'extérieur de l'agence.
        </footer>
      </div>

      {/* Styles d'impression */}
      <style>{`
        @media print {
          @page { size: A4; margin: 14mm; }
          body { background: white !important; }
        }
      `}</style>
    </div>
  );
}
