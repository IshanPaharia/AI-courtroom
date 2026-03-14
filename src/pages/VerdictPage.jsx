import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Gavel,
  ArrowLeft,
  Trophy,
  Quote,
  Star,
  Share2,
  Check,
  RotateCcw,
  Loader2,
} from 'lucide-react';
import { JUDGE_PERSONAS } from '../lib/mockData';
import { formatDate } from '../lib/utils';
import { api } from '../services/api';

function GavelAnimation() {
  return (
    <motion.div
      className="flex h-24 w-24 items-center justify-center rounded-2xl border-2 border-court-ink bg-court-ink shadow-brutal-lg md:h-32 md:w-32"
      initial={{ rotate: -30, scale: 0 }}
      animate={{ rotate: 0, scale: 1 }}
      transition={{
        type: 'spring',
        stiffness: 300,
        damping: 15,
        delay: 0.3,
      }}
    >
      <motion.div
        animate={{ rotate: [0, -15, 0] }}
        transition={{ delay: 0.8, duration: 0.4, ease: 'easeInOut' }}
      >
        <Gavel className="h-12 w-12 text-court-gold md:h-16 md:w-16" />
      </motion.div>
    </motion.div>
  );
}

function DramaScoreBar({ score }) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex gap-0.5">
        {Array.from({ length: 10 }).map((_, i) => (
          <motion.div
            key={i}
            initial={{ scaleY: 0 }}
            animate={{ scaleY: 1 }}
            transition={{ delay: 1.2 + i * 0.05 }}
            className={`h-6 w-2 rounded-sm border border-court-dark ${
              i < score ? 'bg-court-gold' : 'bg-gray-100'
            }`}
          />
        ))}
      </div>
      <span className="text-sm font-bold">{score}/10</span>
    </div>
  );
}

export default function VerdictPage() {
  const { caseId } = useParams();
  const navigate = useNavigate();
  const [caseData, setCaseData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [appealCase, setAppealCase] = useState(null);
  const [appealing, setAppealing] = useState(false);
  const [shared, setShared] = useState(false);

  useEffect(() => {
    Promise.all([
      api.getCase(caseId),
      api.getAppeal(caseId).catch(() => ({ appeal: null })),
    ])
      .then(([c, a]) => {
        setCaseData(c);
        setAppealCase(a.appeal);
      })
      .catch(() => setCaseData(null))
      .finally(() => setLoading(false));
  }, [caseId]);

  const handleAppeal = async () => {
    setAppealing(true);
    try {
      const appeal = await api.appealCase(caseId);
      navigate(`/case/${appeal.id}`);
    } catch (err) {
      alert(err.message);
    } finally {
      setAppealing(false);
    }
  };

  const persona = caseData
    ? JUDGE_PERSONAS.find((p) => p.id === caseData.judgePersona)
    : null;

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-court-dark/40" />
      </div>
    );
  }

  if (!caseData || caseData.status !== 'verdict_delivered') {
    return (
      <div className="card-brutal mx-auto max-w-md py-16 text-center">
        <Gavel className="mx-auto mb-3 h-10 w-10 text-court-dark/30" />
        <h2 className="text-lg font-bold">No Verdict Yet</h2>
        <p className="mt-1 text-sm text-court-dark/50">
          This case hasn&apos;t been decided yet, or doesn&apos;t exist.
        </p>
        <Link to="/dashboard" className="btn-brutal mt-4 bg-court-gold text-sm">
          Back to Cases
        </Link>
      </div>
    );
  }

  const winnerMap = {
    plaintiff_wins: caseData.plaintiff?.username,
    defendant_wins: caseData.defendant?.username,
    compromise: 'Compromise',
  };
  const winnerName = winnerMap[caseData.verdictWinner] || 'Unknown';
  const winnerLabel = caseData.verdictWinner === 'compromise' ? 'Both Sides' : caseData.verdictWinner?.replace('_wins', '');

  const handleShare = async () => {
    const text = `AI Courtroom Verdict: "${caseData.title}" — ${winnerName} wins! Drama score: ${caseData.dramaScore}/10. "${caseData.notableQuote}"`;
    const url = window.location.href;

    try {
      if (navigator.share) {
        await navigator.share({ title: 'AI Courtroom Verdict', text, url });
      } else {
        await navigator.clipboard.writeText(`${text}\n${url}`);
        setShared(true);
        setTimeout(() => setShared(false), 2000);
      }
    } catch {
      // User cancelled share dialog
    }
  };

  return (
    <div className="mx-auto max-w-2xl">
      <button
        onClick={() => navigate('/dashboard')}
        className="btn-brutal mb-6 bg-court-card py-2 px-4 text-sm"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Cases
      </button>

      {/* Gavel + Title */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="mb-6 flex flex-col items-center text-center"
      >
        <GavelAnimation />
        <motion.h1
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="mt-4 text-2xl font-black md:text-4xl"
        >
          Verdict Delivered
        </motion.h1>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="mt-1 text-sm text-court-dark/60"
        >
          {caseData.title} &middot; {formatDate(caseData.createdAt)}
        </motion.p>
      </motion.div>

      {/* Winner card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.9 }}
        className="card-brutal mb-4 bg-court-gold text-center text-court-ink border-court-ink"
      >
        <div className="mb-2 flex items-center justify-center gap-2">
          <Trophy className="h-6 w-6" />
          <span className="text-sm font-bold uppercase tracking-wide">Winner</span>
        </div>
        <p className="text-3xl font-black md:text-4xl">{winnerName}</p>
        <p className="mt-1 text-sm font-medium text-court-dark/70 capitalize">
          ({winnerLabel})
        </p>
      </motion.div>

      {/* Reasoning */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.0 }}
        className="card-brutal mb-4"
      >
        <div className="mb-2 flex items-center gap-2">
          <span className="text-xl">{persona?.emoji}</span>
          <h3 className="font-bold">Judge&apos;s Reasoning</h3>
        </div>
        <p className="text-sm leading-relaxed text-court-dark/80">{caseData.verdictText}</p>
      </motion.div>

      {/* Compensation */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.1 }}
        className="card-brutal mb-4 border-court-gold bg-court-gold-light"
      >
        <h3 className="mb-2 font-bold flex items-center gap-2">
          <Star className="h-4 w-4" />
          Ordered Compensation
        </h3>
        <p className="text-base font-semibold">{caseData.finalCompensation}</p>
      </motion.div>

      {/* Notable quote */}
      {caseData.notableQuote && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.15 }}
          className="card-brutal mb-4 bg-court-ink text-white border-court-ink"
        >
          <Quote className="mb-2 h-6 w-6 text-court-gold" />
          <p className="text-base italic leading-relaxed">
            &ldquo;{caseData.notableQuote}&rdquo;
          </p>
          <p className="mt-2 text-xs text-white/50">
            — {persona?.name}
          </p>
        </motion.div>
      )}

      {/* Drama Score */}
      {caseData.dramaScore && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.2 }}
          className="card-brutal mb-6"
        >
          <h3 className="mb-2 font-bold">Drama Score</h3>
          <DramaScoreBar score={caseData.dramaScore} />
        </motion.div>
      )}

      {/* Appeal status */}
      {appealCase && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.3 }}
          className="card-brutal mb-4 border-court-red bg-court-red/10"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="font-bold text-sm">This case has been appealed</p>
              <p className="text-xs text-court-dark/60">
                {appealCase.status === 'verdict_delivered' ? 'Appeal verdict delivered' : 'Appeal in progress'}
              </p>
            </div>
            <Link
              to={appealCase.status === 'verdict_delivered' ? `/case/${appealCase.id}/verdict` : `/case/${appealCase.id}`}
              className="btn-brutal bg-court-card text-sm py-1.5 px-3"
            >
              View Appeal <ArrowLeft className="h-3 w-3 rotate-180" />
            </Link>
          </div>
        </motion.div>
      )}

      {/* Original case link for appeals */}
      {caseData.appealedFromId && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.3 }}
          className="card-brutal mb-4 border-court-blue bg-court-blue/10"
        >
          <div className="flex items-center justify-between">
            <p className="font-bold text-sm">This is an appeal case</p>
            <Link
              to={`/case/${caseData.appealedFromId}/verdict`}
              className="btn-brutal bg-court-card text-sm py-1.5 px-3"
            >
              View Original
            </Link>
          </div>
        </motion.div>
      )}

      {/* Actions */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.4 }}
        className="flex flex-col gap-3 sm:flex-row"
      >
        <button onClick={handleShare} className="btn-brutal flex-1 bg-court-gold text-sm">
          {shared ? <Check className="h-4 w-4" /> : <Share2 className="h-4 w-4" />}
          {shared ? 'Copied!' : 'Share Verdict'}
        </button>
        {!appealCase && !caseData.isAppeal && (
          <button
            onClick={handleAppeal}
            disabled={appealing}
            className="btn-brutal flex-1 bg-court-card text-sm"
          >
            {appealing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
            File Appeal
          </button>
        )}
        <Link
          to="/dashboard"
          className="btn-brutal flex-1 bg-court-ink text-court-gold text-sm text-center border-court-ink"
        >
          Back to Cases
        </Link>
      </motion.div>
    </div>
  );
}
