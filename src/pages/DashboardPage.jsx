import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useUser } from '@clerk/react';
import { motion } from 'framer-motion';
import { PlusCircle, Filter, Search, Loader2, LogIn } from 'lucide-react';
import CaseCard from '../components/cases/CaseCard';
import { api } from '../services/api';

const STATUS_FILTERS = [
  { value: 'all', label: 'All Cases' },
  { value: 'active', label: 'Active' },
  { value: 'verdict_delivered', label: 'Resolved' },
  { value: 'pending_defendant', label: 'Pending' },
];

export default function DashboardPage() {
  const { isSignedIn } = useUser();
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isSignedIn) {
      setLoading(false);
      return;
    }

    api
      .getCases()
      .then(setCases)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [isSignedIn]);

  if (!isSignedIn) {
    return (
      <div className="card-brutal mx-auto max-w-md py-16 text-center">
        <LogIn className="mx-auto mb-3 h-10 w-10 text-court-dark/30" />
        <h2 className="text-lg font-bold">Sign in to view your cases</h2>
        <p className="mt-1 text-sm text-court-dark/50">
          You need an account to file and track cases.
        </p>
        <Link to="/sign-in" className="btn-brutal mt-4 bg-court-gold text-sm">
          <LogIn className="h-4 w-4" />
          Sign In
        </Link>
      </div>
    );
  }

  const filtered = cases
    .filter((c) => {
      if (filter === 'active') {
        return !['verdict_delivered', 'pending_defendant'].includes(c.status);
      }
      if (filter !== 'all') {
        return c.status === filter;
      }
      return true;
    })
    .filter((c) => c.title.toLowerCase().includes(search.toLowerCase()));

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-black md:text-3xl">Your Cases</h1>
          <p className="text-sm text-court-dark/60 font-medium">
            {cases.length} total cases
          </p>
        </div>
        <Link
          to="/new-case"
          className="btn-brutal bg-court-gold text-sm w-full sm:w-auto"
        >
          <PlusCircle className="h-4 w-4" />
          File New Case
        </Link>
      </div>

      {/* Filters */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-court-dark/40" />
          <input
            type="text"
            placeholder="Search cases..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-brutal pl-10 text-sm"
          />
        </div>
        <div className="flex gap-2 overflow-x-auto p-1">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={`btn-brutal whitespace-nowrap py-2 px-4 text-xs ${
                filter === f.value
                  ? 'bg-court-ink text-court-gold border-court-ink'
                  : 'bg-court-card'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Loading state */}
      {loading && (
        <div className="card-brutal flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-court-dark/40" />
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="card-brutal border-court-red bg-red-50 py-8 text-center">
          <p className="font-bold text-court-red">{error}</p>
        </div>
      )}

      {/* Case grid */}
      {!loading && !error && filtered.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((c, i) => (
            <motion.div
              key={c.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
            >
              <CaseCard caseData={c} />
            </motion.div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && filtered.length === 0 && (
        <div className="card-brutal flex flex-col items-center justify-center py-16 text-center">
          <Filter className="mb-3 h-10 w-10 text-court-dark/30" />
          <h3 className="text-lg font-bold">No cases found</h3>
          <p className="mt-1 text-sm text-court-dark/50">
            {search ? 'Try a different search term.' : 'File your first case to get started!'}
          </p>
        </div>
      )}
    </div>
  );
}
