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
 * Le bouton s'efface sur la page de l'assistant elle-meme, et se decale
 * au-dessus de la navigation mobile pour ne pas la recouvrir.
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
          className="fixed bottom-[4.5rem] right-4 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/25 transition-transform hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 md:bottom-6 md:right-6"
        >
          <Bot className="h-6 w-6" aria-hidden />
        </Link>
      </TooltipTrigger>
      <TooltipContent side="left">Besoin d’aide ? Demandez à l’assistant</TooltipContent>
    </Tooltip>
  );
}
