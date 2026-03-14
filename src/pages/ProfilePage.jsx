import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useUser } from '@clerk/react';
import { motion } from 'framer-motion';
import {
  User,
  Trophy,
  XCircle,
  TrendingUp,
  MessageSquare,
  AlertTriangle,
  Gavel,
  Calendar,
  Pencil,
  Check,
  X,
  Loader2,
  LogIn,
  ArrowRight,
} from 'lucide-react';
import { api } from '../services/api';
import { CASE_STATUSES, JUDGE_PERSONAS } from '../lib/mockData';
import { formatDate, getStatusColor } from '../lib/utils';

function StatCard({ label, value, icon: Icon, color = 'bg-court-gold-light' }) {
  return (
    <div className="card-brutal flex items-center gap-3">
      <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border-2 border-court-dark ${color} shadow-brutal-sm`}>
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <p className="text-2xl font-black">{value}</p>
        <p className="text-xs font-semibold uppercase tracking-wide text-court-dark/50">{label}</p>
      </div>
    </div>
  );
}

function CaseHistoryItem({ caseData }) {
  const status = CASE_STATUSES[caseData.status];
  const persona = JUDGE_PERSONAS.find((p) => p.id === caseData.judgePersona);
  const isResolved = caseData.status === 'verdict_delivered';
  const linkTo = isResolved ? `/case/${caseData.id}/verdict` : `/case/${caseData.id}`;

  const outcomeStyles = {
    won: 'bg-court-green text-white',
    lost: 'bg-court-red text-white',
    compromise: 'bg-court-gold text-court-dark',
  };

  return (
    <Link
      to={linkTo}
      className="flex items-center gap-4 rounded-xl border-b border-court-dark/10 px-4 py-3 transition-colors hover:bg-court-gold-light/50"
    >
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-2 mb-1">
          <span className={`badge-brutal ${getStatusColor(caseData.status)}`}>
            {status?.label}
          </span>
          {caseData.outcome && (
            <span className={`badge-brutal ${outcomeStyles[caseData.outcome]}`}>
              {caseData.outcome.toUpperCase()}
            </span>
          )}
          <span className="badge-brutal bg-court-gold-light text-[10px]">
            {persona?.emoji} {caseData.role}
          </span>
        </div>
        <h4 className="font-bold text-sm truncate">{caseData.title}</h4>
        <p className="text-xs text-court-dark/40 mt-0.5">
          {caseData.plaintiff?.username || '...'} vs {caseData.defendant?.username || 'Waiting...'}
          {' '}&middot;{' '}{formatDate(caseData.createdAt)}
        </p>
      </div>
      <ArrowRight className="h-4 w-4 shrink-0 text-court-dark/30" />
    </Link>
  );
}

export default function ProfilePage() {
  const { isSignedIn, user: clerkUser } = useUser();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [editingName, setEditingName] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isSignedIn) {
      setLoading(false);
      return;
    }
    // Fix cached win/loss counters, then fetch fresh stats
    api.recalcStats().catch(() => {});
    api
      .getMyStats()
      .then((d) => {
        setData(d);
        setNewUsername(d.user.username);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [isSignedIn]);

  const handleSaveUsername = async () => {
    if (!newUsername.trim() || newUsername.trim().length < 2) return;
    setSaving(true);
    try {
      const updated = await api.updateMe({ username: newUsername.trim() });
      setData((prev) => ({ ...prev, user: updated }));
      setEditingName(false);
    } catch (err) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (!isSignedIn) {
    return (
      <div className="card-brutal mx-auto max-w-md py-16 text-center">
        <LogIn className="mx-auto mb-3 h-10 w-10 text-court-dark/30" />
        <h2 className="text-lg font-bold">Sign in to view your profile</h2>
        <Link to="/sign-in" className="btn-brutal mt-4 bg-court-gold text-sm">
          <LogIn className="h-4 w-4" />
          Sign In
        </Link>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-court-dark/40" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="card-brutal mx-auto max-w-md border-court-red bg-red-50 py-8 text-center">
        <p className="font-bold text-court-red">{error}</p>
      </div>
    );
  }

  const { user, stats, cases: userCases } = data;

  return (
    <div className="mx-auto max-w-3xl">
      {/* Profile header */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="card-brutal mb-6 bg-court-gold text-court-ink border-court-ink"
      >
        <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
          {/* Avatar */}
          <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl border-2 border-court-ink bg-court-ink shadow-brutal">
            {user.avatarUrl ? (
              <img
                src={user.avatarUrl}
                alt=""
                className="h-full w-full rounded-2xl object-cover"
              />
            ) : (
              <User className="h-10 w-10 text-court-gold" />
            )}
          </div>

          {/* Name + email */}
          <div className="flex-1 text-center sm:text-left">
            {editingName ? (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  className="input-brutal text-lg font-black"
                  maxLength={50}
                  autoFocus
                />
                <button
                  onClick={handleSaveUsername}
                  disabled={saving}
                  className="btn-brutal bg-court-ink text-court-gold p-2 border-court-ink"
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                </button>
                <button
                  onClick={() => { setEditingName(false); setNewUsername(user.username); }}
                  className="btn-brutal bg-court-card p-2"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-center gap-2 sm:justify-start">
                <h1 className="text-2xl font-black md:text-3xl">{user.username}</h1>
                <button
                  onClick={() => setEditingName(true)}
                  className="btn-brutal bg-court-card p-1.5"
                  title="Edit username"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
            <p className="mt-1 text-sm font-medium text-court-dark/60">
              {clerkUser?.primaryEmailAddress?.emailAddress}
            </p>
            <div className="mt-2 flex items-center justify-center gap-1.5 text-xs text-court-dark/50 sm:justify-start">
              <Calendar className="h-3.5 w-3.5" />
              Member since {formatDate(user.createdAt)}
            </div>
          </div>
        </div>
      </motion.div>

      {/* Stats grid */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="mb-6 grid gap-3 grid-cols-2 lg:grid-cols-4"
      >
        <StatCard label="Wins" value={stats.wins} icon={Trophy} color="bg-court-green/20" />
        <StatCard label="Losses" value={stats.losses} icon={XCircle} color="bg-court-red/20" />
        <StatCard label="Win Rate" value={`${stats.winRate}%`} icon={TrendingUp} />
        <StatCard label="Total Cases" value={stats.totalCases} icon={Gavel} />
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="mb-6 grid gap-3 grid-cols-2 lg:grid-cols-3"
      >
        <StatCard label="Active Cases" value={stats.activeCases} icon={Gavel} color="bg-court-blue/20" />
        <StatCard label="Arguments Made" value={stats.totalArguments} icon={MessageSquare} />
        <StatCard label="Objections Used" value={stats.objectionsUsed} icon={AlertTriangle} color="bg-court-gold" />
      </motion.div>

      {/* Case history */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <h2 className="mb-3 text-xl font-black">Case History</h2>

        {userCases.length > 0 ? (
          <div className="card-brutal p-0 overflow-hidden">
            {userCases.map((c) => (
              <CaseHistoryItem key={c.id} caseData={c} />
            ))}
          </div>
        ) : (
          <div className="card-brutal flex flex-col items-center justify-center py-12 text-center">
            <Gavel className="mb-3 h-10 w-10 text-court-dark/20" />
            <h3 className="text-lg font-bold">No cases yet</h3>
            <p className="mt-1 text-sm text-court-dark/50">
              File your first case to get started!
            </p>
            <Link to="/new-case" className="btn-brutal mt-4 bg-court-gold text-sm">
              File a Case
            </Link>
          </div>
        )}
      </motion.div>
    </div>
  );
}
