import { Users, Shield, ClipboardList, Tag, Database, Bell, Mail, Presentation, GraduationCap, Clock, UserPlus } from 'lucide-react';
import { useAdminStats } from '@/hooks/useAdminStats';
import { SystemHealthWidget } from '@/components/admin/SystemHealthWidget';
import { AdminNavCard } from '@/components/admin/AdminNavCard';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

export default function AdminPage() {
  const { data: stats, isLoading } = useAdminStats();

  const collecteLabel = stats?.derniereCollecte
    ? formatDistanceToNow(new Date(stats.derniereCollecte), { addSuffix: true, locale: fr })
    : 'Jamais';

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Administration</h1>
        <p className="text-muted-foreground">
          Configuration globale, sécurité et maintenance de la plateforme.
        </p>
      </div>

      {/* System Health Widget */}
      <SystemHealthWidget
        lastCollecteTime={stats?.derniereCollecte ?? null}
        lastCollecteStatus={stats?.lastCollecteStatus ?? null}
        lastCollecteDuration={stats?.lastCollecteDuration ?? null}
        articlesLast24h={stats?.articlesLast24h ?? 0}
        isLoading={isLoading}
      />

      {/* Section: Organisation */}
      <section className="space-y-4">
        <h2 className="text-sm font-bold text-muted-foreground uppercase flex items-center gap-2">
          <Users size={16} /> Organisation
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <AdminNavCard
            color="blue"
            icon={<Users size={24} />}
            title="Utilisateurs"
            badge={stats?.usersActifs ? `${stats.usersActifs} actifs` : undefined}
            badgeVariant="success"
            subtitle="Invitez des collaborateurs et gérez les accès à la plateforme."
            to="/admin/users"
            loading={isLoading}
          />
          <AdminNavCard
            color="purple"
            icon={<Shield size={24} />}
            title="Rôles & Permissions"
            badge="RBAC"
            badgeVariant="info"
            subtitle="Définissez finement qui peut voir, éditer ou supprimer les données."
            to="/admin/roles"
            loading={isLoading}
          />
          <AdminNavCard
            color="blue"
            icon={<ClipboardList size={24} />}
            title="Audit Logs"
            badge={stats?.actionsAudit24h ? `${stats.actionsAudit24h}/24h` : undefined}
            badgeVariant="default"
            subtitle="Traçabilité complète des actions effectuées sur le système."
            to="/admin/audit-logs"
            loading={isLoading}
          />
        </div>
      </section>

      {/* Section: Moteur de Veille */}
      <section className="space-y-4">
        <h2 className="text-sm font-bold text-muted-foreground uppercase flex items-center gap-2">
          <Database size={16} /> Moteur de Veille
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <AdminNavCard
            color="orange"
            icon={<Tag size={24} />}
            title="Mots-clés & Thèmes"
            badge={stats?.motsClesActifs ? `${stats.motsClesActifs} actifs` : undefined}
            badgeVariant="info"
            subtitle="Gérez le dictionnaire sémantique utilisé par l'IA."
            to="/admin/mots-cles"
            loading={isLoading}
          />
          <AdminNavCard
            color="emerald"
            icon={<Database size={24} />}
            title="Sources & Médias"
            badge={stats?.sourcesActives ? `${stats.sourcesActives} actives` : undefined}
            badgeVariant="success"
            subtitle="Configurez les URLs cibles, flux RSS et comptes sociaux."
            to="/admin/sources"
            loading={isLoading}
          />
          <AdminNavCard
            color="orange"
            icon={<Bell size={24} />}
            title="Alertes"
            badge={stats?.alertesNonLues ? `${stats.alertesNonLues} non lues` : undefined}
            badgeVariant={stats?.alertesNonLues && stats.alertesNonLues > 0 ? 'warning' : 'default'}
            subtitle="Définissez la sensibilité de détection des crises."
            to="/alertes"
            loading={isLoading}
          />
          <AdminNavCard
            color="emerald"
            icon={<UserPlus size={24} />}
            title="Import Acteurs"
            badge={stats?.totalActeurs ? `${stats.totalActeurs} acteurs` : undefined}
            badgeVariant="info"
            subtitle="Import et génération d'acteurs via Perplexity IA."
            to="/admin/import-acteurs"
            loading={isLoading}
          />
        </div>
      </section>

      {/* Section: Communication */}
      <section className="space-y-4">
        <h2 className="text-sm font-bold text-muted-foreground uppercase flex items-center gap-2">
          <Mail size={16} /> Communication
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <AdminNavCard
            color="blue"
            icon={<Mail size={24} />}
            title="Newsletters"
            badge={stats?.newslettersEnAttente ? `${stats.newslettersEnAttente} en attente` : undefined}
            badgeVariant={stats?.newslettersEnAttente && stats.newslettersEnAttente > 0 ? 'warning' : 'default'}
            subtitle="Génération IA de newsletters à partir des actualités."
            to="/admin/newsletters"
            loading={isLoading}
          />
          <AdminNavCard
            color="emerald"
            icon={<GraduationCap size={24} />}
            title="Formation"
            badge="2 guides"
            badgeVariant="info"
            subtitle="Guides PDF pour les différents profils utilisateurs."
            to="/admin/formation"
            loading={isLoading}
          />
          <AdminNavCard
            color="purple"
            icon={<Presentation size={24} />}
            title="Présentation"
            badge="11 slides"
            badgeVariant="info"
            subtitle="Slides PDF pour présenter le projet ANSUT Radar."
            to="/admin/presentation"
            loading={isLoading}
          />
        </div>
      </section>

      {/* Section: Supervision Technique */}
      <section className="space-y-4">
        <h2 className="text-sm font-bold text-muted-foreground uppercase flex items-center gap-2">
          <Clock size={16} /> Supervision Technique
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <AdminNavCard
            color="slate"
            icon={<Clock size={24} />}
            title="Tâches CRON"
            badge={collecteLabel}
            badgeVariant="default"
            subtitle="Collecte automatisée et planification des tâches système."
            to="/admin/cron-jobs"
            loading={isLoading}
          />
        </div>
      </section>

      {/* Footer Technique */}
      <footer className="pt-8 border-t border-border text-center">
        <p className="text-xs text-muted-foreground">
          ANSUT RADAR v2.1.0 • Hébergé sur Lovable Cloud •{' '}
          <a href="/docs" className="hover:text-primary hover:underline transition-colors">
            Documentation Technique
          </a>
        </p>
      </footer>
    </div>
  );
}
