import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Copy, Check, Mail, MessageSquare, Send } from "lucide-react";
import { toast } from "sonner";

interface MessageGeneratorProps {
  network: string;
  defaultContact: string;
  template: string;
  asks: { label: string; required?: boolean; hint?: string }[];
}

type Channel = "email" | "whatsapp" | "slack";

export function MessageGenerator({ network, defaultContact, template, asks }: MessageGeneratorProps) {
  const [channel, setChannel] = useState<Channel>("email");
  const [recipientName, setRecipientName] = useState("");
  const [recipientEmail, setRecipientEmail] = useState("");
  const [recipientPhone, setRecipientPhone] = useState("");
  const [senderName, setSenderName] = useState("");
  const [deadline, setDeadline] = useState("");
  const [copied, setCopied] = useState(false);

  const requiredAsks = asks.filter((a) => a.required).map((a) => a.label);

  const message = useMemo(() => {
    const greeting = recipientName ? `Bonjour ${recipientName},` : "Bonjour,";
    const intro = `Dans le cadre de la mise en place de la veille ANSUT RADAR sur ${network}, j'aurais besoin de ton aide pour récupérer les paramètres techniques d'accès à l'API.`;
    const list = requiredAsks.map((l, i) => `${i + 1}. ${l}`).join("\n");
    const deadlineLine = deadline ? `\n\n📅 Idéalement avant le ${deadline}.` : "";
    const security =
      "\n\n🔒 Important : merci de ne PAS envoyer ces informations par WhatsApp ou SMS. Saisis-les directement dans l'admin RADAR (ANSUT) ou transmets-les via un gestionnaire de mots de passe sécurisé.";
    const signature = senderName
      ? `\n\nMerci par avance,\n${senderName}\nÉquipe ANSUT RADAR`
      : "\n\nMerci par avance,\nÉquipe ANSUT RADAR";
    const ctx = `\n\nContexte rapide : ${template}`;

    if (channel === "whatsapp") {
      return `${greeting}\n\n${intro}\n\n*Éléments nécessaires :*\n${list}${deadlineLine}${security}${signature}`;
    }
    if (channel === "slack") {
      return `${greeting}\n\n${intro}\n\n*Éléments nécessaires :*\n${list}${deadlineLine}${security}${signature}`;
    }
    return `${greeting}\n\n${intro}${ctx}\n\nÉléments nécessaires :\n${list}${deadlineLine}${security}${signature}`;
  }, [channel, recipientName, senderName, deadline, network, template, requiredAsks]);

  const subject = `[ANSUT RADAR] Demande paramètres API ${network}`;

  const copy = async () => {
    await navigator.clipboard.writeText(message);
    setCopied(true);
    toast.success("Message copié dans le presse-papiers");
    setTimeout(() => setCopied(false), 2000);
  };

  const openMail = () => {
    const to = encodeURIComponent(recipientEmail);
    const sub = encodeURIComponent(subject);
    const body = encodeURIComponent(message);
    window.location.href = `mailto:${to}?subject=${sub}&body=${body}`;
  };

  const openWhatsApp = () => {
    const phone = recipientPhone.replace(/[^\d]/g, "");
    const body = encodeURIComponent(message);
    const url = phone ? `https://wa.me/${phone}?text=${body}` : `https://wa.me/?text=${body}`;
    window.open(url, "_blank");
  };

  return (
    <div className="space-y-3 print:hidden">
      <Tabs value={channel} onValueChange={(v) => setChannel(v as Channel)}>
        <TabsList className="grid grid-cols-3 w-full">
          <TabsTrigger value="email"><Mail className="h-3.5 w-3.5 mr-1.5" /> Email</TabsTrigger>
          <TabsTrigger value="whatsapp"><MessageSquare className="h-3.5 w-3.5 mr-1.5" /> WhatsApp</TabsTrigger>
          <TabsTrigger value="slack"><Send className="h-3.5 w-3.5 mr-1.5" /> Slack/Teams</TabsTrigger>
        </TabsList>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
          <div className="space-y-1.5">
            <Label htmlFor={`rname-${network}`} className="text-xs">Destinataire (prénom)</Label>
            <Input
              id={`rname-${network}`}
              value={recipientName}
              onChange={(e) => setRecipientName(e.target.value)}
              placeholder={defaultContact.split(" ")[0] || "Aïcha"}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={`sname-${network}`} className="text-xs">Votre nom (signature)</Label>
            <Input
              id={`sname-${network}`}
              value={senderName}
              onChange={(e) => setSenderName(e.target.value)}
              placeholder="Ex. Konan K."
            />
          </div>
          <TabsContent value="email" className="md:col-span-2 m-0">
            <Label htmlFor={`email-${network}`} className="text-xs">Email du destinataire (optionnel)</Label>
            <Input
              id={`email-${network}`}
              type="email"
              value={recipientEmail}
              onChange={(e) => setRecipientEmail(e.target.value)}
              placeholder="prenom.nom@ansut.ci"
            />
          </TabsContent>
          <TabsContent value="whatsapp" className="md:col-span-2 m-0">
            <Label htmlFor={`phone-${network}`} className="text-xs">Téléphone WhatsApp (format international)</Label>
            <Input
              id={`phone-${network}`}
              value={recipientPhone}
              onChange={(e) => setRecipientPhone(e.target.value)}
              placeholder="+225 07 00 00 00 00"
            />
          </TabsContent>
          <div className="space-y-1.5">
            <Label htmlFor={`deadline-${network}`} className="text-xs">Délai souhaité (optionnel)</Label>
            <Input
              id={`deadline-${network}`}
              type="date"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
            />
          </div>
        </div>
      </Tabs>

      <div className="space-y-1.5">
        <Label className="text-xs flex items-center justify-between">
          <span>Message généré (modifiable)</span>
          <span className="text-muted-foreground">{message.length} caractères</span>
        </Label>
        <Textarea
          value={message}
          readOnly
          rows={10}
          className="font-mono text-xs leading-relaxed"
        />
      </div>

      <div className="flex flex-wrap gap-2">
        <Button onClick={copy} size="sm" variant="default">
          {copied ? <Check className="h-4 w-4 mr-1.5" /> : <Copy className="h-4 w-4 mr-1.5" />}
          {copied ? "Copié !" : "Copier le message"}
        </Button>
        {channel === "email" && (
          <Button onClick={openMail} size="sm" variant="outline">
            <Mail className="h-4 w-4 mr-1.5" /> Ouvrir dans la messagerie
          </Button>
        )}
        {channel === "whatsapp" && (
          <Button onClick={openWhatsApp} size="sm" variant="outline">
            <MessageSquare className="h-4 w-4 mr-1.5" /> Envoyer via WhatsApp Web
          </Button>
        )}
      </div>
    </div>
  );
}
