import { Link, useLocation } from 'wouter';
import { Timer, Settings } from 'lucide-react';

const NAV_ITEMS = [
  { href: '/', label: '몰입', icon: Timer },
  { href: '/settings', label: '설정', icon: Settings },
];

export function NavBar() {
  const [location] = useLocation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-card border-t border-border">
      <div className="max-w-md mx-auto flex">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const isActive =
            href === '/' ? location === '/' : location.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={`flex-1 flex flex-col items-center justify-center gap-1 py-3 text-xs font-medium transition-colors ${
                isActive
                  ? 'text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Icon
                size={22}
                strokeWidth={isActive ? 2.2 : 1.8}
              />
              <span>{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
