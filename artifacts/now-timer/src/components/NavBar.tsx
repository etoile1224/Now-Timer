import { Link, useLocation } from 'wouter';
import { Timer, Settings, Users } from 'lucide-react';
import { useSocial } from '@/context/SocialContext';

const NAV_ITEMS = [
  { href: '/', label: '몰입', icon: Timer },
  { href: '/social', label: '소셜', icon: Users },
  { href: '/settings', label: '설정', icon: Settings },
];

export function NavBar() {
  const [location] = useLocation();
  const { pokeFrom, teamCode } = useSocial();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-card border-t border-border">
      <div className="max-w-md mx-auto flex">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const isActive =
            href === '/' ? location === '/' : location.startsWith(href);
          const showDot =
            href === '/social' && !!pokeFrom && !isActive;
          const showTeamDot =
            href === '/social' && !!teamCode && !isActive && !pokeFrom;

          return (
            <Link
              key={href}
              href={href}
              className={`flex-1 flex flex-col items-center justify-center gap-1 py-3 text-xs font-medium transition-colors relative ${
                isActive
                  ? 'text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <div className="relative">
                <Icon size={22} strokeWidth={isActive ? 2.2 : 1.8} />
                {showDot && (
                  <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-orange-500 rounded-full" />
                )}
                {showTeamDot && (
                  <span className="absolute -top-1 -right-1 w-2 h-2 bg-primary rounded-full" />
                )}
              </div>
              <span>{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
