import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Trophy, Medal, Crown, TrendingUp, Loader2, Users } from 'lucide-react';
import { api } from '../services/api';

function RankBadge({ rank }) {
  if (rank === 1) {
    return (
      <div className="flex h-10 w-10 items-center justify-center rounded-xl border-2 border-court-dark bg-court-gold shadow-brutal-sm">
        <Crown className="h-5 w-5" />
      </div>
    );
  }
  if (rank === 2) {
    return (
      <div className="flex h-10 w-10 items-center justify-center rounded-xl border-2 border-court-dark bg-gray-200 shadow-brutal-sm">
        <Medal className="h-5 w-5" />
      </div>
    );
  }
  if (rank === 3) {
    return (
      <div className="flex h-10 w-10 items-center justify-center rounded-xl border-2 border-court-dark bg-amber-600 text-white shadow-brutal-sm">
        <Medal className="h-5 w-5" />
      </div>
    );
  }
  return (
    <div className="flex h-10 w-10 items-center justify-center rounded-xl border-2 border-court-dark bg-court-card font-black text-sm shadow-brutal-sm">
      {rank}
    </div>
  );
}

function StatCard({ label, value, icon: Icon }) {
  return (
    <div className="card-brutal flex items-center gap-3">
      <div className="flex h-11 w-11 items-center justify-center rounded-xl border-2 border-court-dark bg-court-gold-light shadow-brutal-sm">
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <p className="text-2xl font-black">{value}</p>
        <p className="text-xs font-semibold uppercase tracking-wide text-court-dark/50">{label}</p>
      </div>
    </div>
  );
}

export default function LeaderboardPage() {
  const [rankings, setRankings] = useState([]);
  const [totalResolvedCases, setTotalResolvedCases] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .getLeaderboard()
      .then((data) => {
        setRankings(data.rankings || []);
        setTotalResolvedCases(data.totalResolvedCases || 0);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const topWinner = rankings[0];

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl border-2 border-court-dark bg-court-gold shadow-brutal-sm">
            <Trophy className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-black md:text-3xl">Leaderboard</h1>
            <p className="text-sm font-medium text-court-dark/60">
              The most convincing arguers in the courtroom
            </p>
          </div>
        </div>
      </div>

      {/* Stats row */}
      {rankings.length > 0 && (
        <div className="mb-6 grid gap-4 sm:grid-cols-3">
          <StatCard label="Total Players" value={rankings.length} icon={Users} />
          <StatCard label="Cases Resolved" value={totalResolvedCases} icon={TrendingUp} />
          <StatCard
            label="Top Arguer"
            value={topWinner?.username || '-'}
            icon={Crown}
          />
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="card-brutal flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-court-dark/40" />
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="card-brutal border-court-red bg-red-50 py-8 text-center">
          <p className="font-bold text-court-red">{error}</p>
        </div>
      )}

      {/* Empty */}
      {!loading && !error && rankings.length === 0 && (
        <div className="card-brutal flex flex-col items-center justify-center py-16 text-center">
          <Trophy className="mb-3 h-10 w-10 text-court-dark/20" />
          <h3 className="text-lg font-bold">No rankings yet</h3>
          <p className="mt-1 text-sm text-court-dark/50">
            Complete some cases to appear on the leaderboard!
          </p>
        </div>
      )}

      {/* Rankings table */}
      {!loading && !error && rankings.length > 0 && (
        <div className="card-brutal overflow-hidden p-0">
          {/* Table header */}
          <div className="hidden sm:grid sm:grid-cols-12 gap-4 border-b-2 border-court-dark bg-court-gold-light px-5 py-3">
            <div className="col-span-1 text-xs font-bold uppercase tracking-wide text-court-dark/50">
              Rank
            </div>
            <div className="col-span-5 text-xs font-bold uppercase tracking-wide text-court-dark/50">
              Player
            </div>
            <div className="col-span-2 text-center text-xs font-bold uppercase tracking-wide text-court-dark/50">
              Wins
            </div>
            <div className="col-span-2 text-center text-xs font-bold uppercase tracking-wide text-court-dark/50">
              Losses
            </div>
            <div className="col-span-2 text-center text-xs font-bold uppercase tracking-wide text-court-dark/50">
              Win Rate
            </div>
          </div>

          {/* Rows */}
          {rankings.map((user, i) => {
            const rank = i + 1;
            const isTop3 = rank <= 3;
            return (
              <motion.div
                key={user.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className={`flex flex-col gap-2 sm:grid sm:grid-cols-12 sm:items-center gap-x-4 px-5 py-4 ${
                  i < rankings.length - 1 ? 'border-b border-court-dark/10' : ''
                } ${isTop3 ? 'bg-court-gold-light/50' : ''}`}
              >
                {/* Rank */}
                <div className="col-span-1 flex items-center">
                  <RankBadge rank={rank} />
                </div>

                {/* Player */}
                <div className="col-span-5 flex items-center gap-3">
                  {user.avatarUrl ? (
                    <img
                      src={user.avatarUrl}
                      alt=""
                      className="h-9 w-9 rounded-lg border-2 border-court-dark object-cover"
                    />
                  ) : (
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg border-2 border-court-dark bg-court-gold-light font-bold text-sm">
                      {user.username?.[0]?.toUpperCase() || '?'}
                    </div>
                  )}
                  <div>
                    <p className={`font-bold ${isTop3 ? 'text-base' : 'text-sm'}`}>
                      {user.username}
                    </p>
                    <p className="text-[10px] text-court-dark/40 sm:hidden">
                      {user.wins}W / {user.losses}L &middot; {user.winRate}%
                    </p>
                  </div>
                </div>

                {/* Stats - hidden on mobile (shown inline above) */}
                <div className="col-span-2 hidden text-center sm:block">
                  <span className="badge-brutal bg-court-green text-white">
                    {user.wins}
                  </span>
                </div>
                <div className="col-span-2 hidden text-center sm:block">
                  <span className="badge-brutal bg-court-red text-white">
                    {user.losses}
                  </span>
                </div>
                <div className="col-span-2 hidden text-center sm:block">
                  <div className="flex items-center justify-center gap-2">
                    <div className="h-2 flex-1 max-w-16 rounded-full border border-court-dark bg-gray-100 overflow-hidden">
                      <div
                        className="h-full bg-court-gold rounded-full"
                        style={{ width: `${user.winRate}%` }}
                      />
                    </div>
                    <span className="text-sm font-bold">{user.winRate}%</span>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
