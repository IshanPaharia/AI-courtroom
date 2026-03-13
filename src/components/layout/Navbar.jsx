import { Link, useLocation } from 'react-router-dom';
import { useUser, useClerk } from '@clerk/react';
import { Gavel, LayoutDashboard, PlusCircle, Trophy, Menu, X, LogIn, LogOut } from 'lucide-react';
import { useState } from 'react';

const NAV_LINKS = [
  { to: '/dashboard', label: 'Cases', icon: LayoutDashboard },
  { to: '/new-case', label: 'File Case', icon: PlusCircle },
  { to: '/leaderboard', label: 'Leaderboard', icon: Trophy },
];

export default function Navbar() {
  const location = useLocation();
  const { isSignedIn, user } = useUser();
  const { signOut } = useClerk();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <nav className="sticky top-0 z-50 border-b-2 border-court-dark bg-court-gold">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 lg:px-8">
        <Link to="/" className="flex items-center gap-2.5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl border-2 border-court-dark bg-court-dark shadow-brutal-sm">
            <Gavel className="h-5 w-5 text-court-gold" />
          </div>
          <div>
            <h1 className="text-lg font-black leading-tight tracking-tight">AI Courtroom</h1>
            <p className="text-xs font-medium text-court-dark/70 hidden sm:block">Justice, but make it fun</p>
          </div>
        </Link>

        {/* Desktop Nav */}
        <div className="hidden md:flex items-center gap-2">
          {isSignedIn && NAV_LINKS.map(({ to, label, icon: Icon }) => {
            const active = location.pathname === to;
            return (
              <Link
                key={to}
                to={to}
                className={`btn-brutal text-sm ${
                  active
                    ? 'bg-court-dark text-court-gold'
                    : 'bg-white text-court-dark hover:bg-court-dark hover:text-court-gold'
                }`}
              >
                <Icon className="h-4 w-4" />
                {label}
              </Link>
            );
          })}

          {isSignedIn ? (
            <div className="flex items-center gap-2 ml-2">
              <div className="flex items-center gap-2 rounded-xl border-2 border-court-dark bg-white px-3 py-1.5 shadow-brutal-sm">
                {user?.imageUrl && (
                  <img src={user.imageUrl} alt="" className="h-6 w-6 rounded-full border border-court-dark" />
                )}
                <span className="text-sm font-bold">{user?.firstName || user?.username || 'User'}</span>
              </div>
              <button
                onClick={() => signOut()}
                className="btn-brutal bg-white text-sm py-2 px-3"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <Link to="/sign-in" className="btn-brutal bg-court-dark text-court-gold text-sm">
              <LogIn className="h-4 w-4" />
              Sign In
            </Link>
          )}
        </div>

        {/* Mobile toggle */}
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="btn-brutal bg-white p-2 md:hidden"
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Mobile Nav */}
      {mobileOpen && (
        <div className="border-t-2 border-court-dark bg-court-gold px-4 pb-4 md:hidden">
          <div className="flex flex-col gap-2 pt-2">
            {isSignedIn && NAV_LINKS.map(({ to, label, icon: Icon }) => {
              const active = location.pathname === to;
              return (
                <Link
                  key={to}
                  to={to}
                  onClick={() => setMobileOpen(false)}
                  className={`btn-brutal text-sm w-full ${
                    active
                      ? 'bg-court-dark text-court-gold'
                      : 'bg-white text-court-dark'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </Link>
              );
            })}

            {isSignedIn ? (
              <button
                onClick={() => { signOut(); setMobileOpen(false); }}
                className="btn-brutal bg-white text-sm w-full"
              >
                <LogOut className="h-4 w-4" />
                Sign Out
              </button>
            ) : (
              <Link
                to="/sign-in"
                onClick={() => setMobileOpen(false)}
                className="btn-brutal bg-court-dark text-court-gold text-sm w-full"
              >
                <LogIn className="h-4 w-4" />
                Sign In
              </Link>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
