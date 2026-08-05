import { Bot } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useUserPermissions } from '@/hooks/useUserPermissions';

/**
 * Acces flottant permanent a l'assistant.
 *
 * L'assistant etait auparavant une entree de menu parmi huit autres, alors
 * qu'il s'agit d'un outil d'aide transversal : un utilisateur bloque sur
 * n'importe quel ecran doit pouvoir le solliciter sans quitter son contexte.
 * La convention etablie pour ce type de fonction est le bouton flottant
 * permanent, place en bas a droite.
 *
 * Il s'efface sur la page de l'assistant elle-meme. Sur mobile il est MASQUE :
 * l'assistant y est deja une des cinq destinations de la barre basse, si bien que
 * le bouton flottant faisait double emploi et recouvrait le coin bas du contenu
 * (constat d'audit UX). Il ne reste donc que sur desktop, ou il n'y a pas de barre
 * basse et ou la place ne manque pas.
 */
export function AssistantFlottant() {
  const location = useLocation();
  const { hasPermission } = useUserPermissions();

  if (!hasPermission('use_assistant')) return null;
  if (location.pathname.startsWith('/assistant')) return null;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Link
          to="/assistant"
          aria-label="Ouvrir l’assistant"
          className="fixed bottom-6 right-6 z-40 hidden h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/25 transition-transform hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 md:flex"
        >
          <Bot className="h-6 w-6" aria-hidden />
        </Link>
      </TooltipTrigger>
      <TooltipContent side="left">Besoin d’aide ? Demandez à l’assistant</TooltipContent>
    </Tooltip>
  );
}
