import { Link, useLocation } from 'react-router-dom';
import { useUser, useClerk } from '@clerk/react';
import { Gavel, LayoutDashboard, PlusCircle, Trophy, Menu, X, LogIn, LogOut, User, Sun, Moon } from 'lucide-react';
import { useState } from 'react';
import { useTheme } from '../../context/ThemeContext';

const NAV_LINKS = [
  { to: '/dashboard', label: 'Cases', icon: LayoutDashboard },
  { to: '/new-case', label: 'File Case', icon: PlusCircle },
  { to: '/leaderboard', label: 'Leaderboard', icon: Trophy },
];

const navBtn = 'btn-brutal text-sm border-court-ink';
const navBtnLight = `${navBtn} bg-court-card text-court-dark`;
const navBtnDark = `${navBtn} bg-court-ink text-court-gold`;

export default function Navbar() {
  const location = useLocation();
  const { isSignedIn, user } = useUser();
  const { signOut } = useClerk();
  const { theme, toggleTheme } = useTheme();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <nav className="sticky top-0 z-50 border-b-2 border-court-ink bg-court-gold text-court-ink">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 lg:px-8">
        <Link to="/" className="flex items-center gap-2.5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl border-2 border-court-ink bg-court-ink shadow-brutal-sm">
            <Gavel className="h-5 w-5 text-court-gold" />
          </div>
          <div>
            <h1 className="text-lg font-black leading-tight tracking-tight">AI Courtroom</h1>
            <p className="text-xs font-medium text-court-ink/70 hidden sm:block">Justice, but make it fun</p>
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
                className={active ? navBtnDark : `${navBtnLight} hover:bg-court-ink hover:text-court-gold`}
              >
                <Icon className="h-4 w-4" />
                {label}
              </Link>
            );
          })}

          <button
            onClick={toggleTheme}
            className={`${navBtnLight} py-2 px-3`}
            title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>

          {isSignedIn ? (
            <div className="flex items-center gap-2 ml-1">
              <Link
                to="/profile"
                className="flex items-center gap-2 rounded-xl border-2 border-court-ink bg-court-card text-court-dark px-3 py-1.5 shadow-brutal-sm hover:shadow-brutal transition-shadow"
              >
                {user?.imageUrl && (
                  <img src={user.imageUrl} alt="" className="h-6 w-6 rounded-full border border-court-ink" />
                )}
                <span className="text-sm font-bold">{user?.firstName || user?.username || 'User'}</span>
              </Link>
              <button
                onClick={() => signOut()}
                className={`${navBtnLight} py-2 px-3`}
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <Link to="/sign-in" className={navBtnDark}>
              <LogIn className="h-4 w-4" />
              Sign In
            </Link>
          )}
        </div>

        {/* Mobile toggle */}
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className={`${navBtnLight} p-2 md:hidden`}
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Mobile Nav */}
      {mobileOpen && (
        <div className="border-t-2 border-court-ink bg-court-gold px-4 pb-4 md:hidden">
          <div className="flex flex-col gap-2 pt-2">
            {isSignedIn && NAV_LINKS.map(({ to, label, icon: Icon }) => {
              const active = location.pathname === to;
              return (
                <Link
                  key={to}
                  to={to}
                  onClick={() => setMobileOpen(false)}
                  className={`${active ? navBtnDark : navBtnLight} w-full`}
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </Link>
              );
            })}

            <button
              onClick={toggleTheme}
              className={`${navBtnLight} w-full`}
            >
              {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
            </button>

            {isSignedIn ? (
              <>
                <Link
                  to="/profile"
                  onClick={() => setMobileOpen(false)}
                  className={`${location.pathname === '/profile' ? navBtnDark : navBtnLight} w-full`}
                >
                  <User className="h-4 w-4" />
                  Profile
                </Link>
                <button
                  onClick={() => { signOut(); setMobileOpen(false); }}
                  className={`${navBtnLight} w-full`}
                >
                  <LogOut className="h-4 w-4" />
                  Sign Out
                </button>
              </>
            ) : (
              <Link
                to="/sign-in"
                onClick={() => setMobileOpen(false)}
                className={`${navBtnDark} w-full`}
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
