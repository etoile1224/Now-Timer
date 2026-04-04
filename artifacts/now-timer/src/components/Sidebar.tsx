import { Link, useLocation } from 'wouter';
import { Timer, Settings, Users, BarChart2 } from 'lucide-react';
import { useSocial } from '@/context/SocialContext';

const NAV_ITEMS = [
  { href: '/', label: '몰입', icon: Timer },
  { href: '/social', label: '소셜', icon: Users },
  { href: '/stats', label: '통계', icon: BarChart2 },
  { href: '/settings', label: '설정', icon: Settings },
];

export function Sidebar() {
  const [location] = useLocation();
  const { pokeFrom, activeTeamCode } = useSocial();

  return (
    <aside className="hidden lg:flex fixed top-0 left-0 h-full w-56 flex-col bg-card border-r border-border z-40">
      <div className="px-5 pt-8 pb-6">
        <div className="text-2xl font-black tracking-tight text-foreground">NOW!</div>
        <div className="text-xs text-muted-foreground mt-0.5">팀과 함께 집중해요</div>
      </div>

      <nav className="flex-1 px-3 space-y-1">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const isActive =
            href === '/' ? location === '/' : location.startsWith(href);
          const showDot = href === '/social' && !!pokeFrom && !isActive;
          const showTeamDot =
            href === '/social' && !!activeTeamCode && !isActive && !pokeFrom;

          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors relative ${
                isActive
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}
            >
              <div className="relative">
                <Icon size={20} strokeWidth={isActive ? 2.2 : 1.8} />
                {showDot && (
                  <span className="absolute -top-1 -right-1 w-2 h-2 bg-orange-500 rounded-full" />
                )}
                {showTeamDot && (
                  <span className="absolute -top-1 -right-1 w-2 h-2 bg-primary rounded-full" />
                )}
              </div>
              <span>{label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="px-5 pb-6 text-xs text-muted-foreground">
        NOW! Timer
      </div>
    </aside>
  );
}
