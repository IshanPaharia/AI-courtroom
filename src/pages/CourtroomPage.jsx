import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useUser } from '@clerk/react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Gavel,
  Send,
  AlertTriangle,
  ArrowLeft,
  MessageCircle,
  Clock,
  User,
  Loader2,
} from 'lucide-react';
import { JUDGE_PERSONAS, CASE_STATUSES } from '../lib/mockData';
import { formatDate, formatTime, getStatusColor } from '../lib/utils';
import { api } from '../services/api';

function ArgumentBubble({ argument, isPlaintiff }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: isPlaintiff ? -20 : 20 }}
      animate={{ opacity: 1, x: 0 }}
      className={`flex gap-3 ${isPlaintiff ? '' : 'flex-row-reverse'}`}
    >
      <div
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border-2 border-court-dark font-bold text-sm shadow-brutal-sm ${
          isPlaintiff ? 'bg-court-blue text-white' : 'bg-court-red text-white'
        }`}
      >
        <User className="h-5 w-5" />
      </div>
      <div
        className={`card-brutal flex-1 ${
          isPlaintiff ? 'bg-blue-50' : 'bg-red-50'
        }`}
      >
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <span
            className={`badge-brutal text-[10px] ${
              isPlaintiff ? 'bg-court-blue text-white' : 'bg-court-red text-white'
            }`}
          >
            {argument.side}
          </span>
          <span className="badge-brutal bg-white text-[10px]">
            Round {argument.roundNumber}
          </span>
          {argument.isObjection && (
            <span className="badge-brutal bg-court-gold text-[10px]">
              OBJECTION!
            </span>
          )}
        </div>
        <p className="text-sm leading-relaxed">{argument.content}</p>
        <p className="mt-2 text-[10px] text-court-dark/40">
          {formatTime(argument.createdAt)}
        </p>
      </div>
    </motion.div>
  );
}

export default function CourtroomPage() {
  const { caseId } = useParams();
  const navigate = useNavigate();
  const { user } = useUser();
  const [caseData, setCaseData] = useState(null);
  const [args, setArgs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newArgument, setNewArgument] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showObjection, setShowObjection] = useState(false);
  const [objectionText, setObjectionText] = useState('');
  const [requestingVerdict, setRequestingVerdict] = useState(false);
  const [resetting, setResetting] = useState(false);

  const fetchCase = useCallback(async () => {
    try {
      const data = await api.getCase(caseId);
      setCaseData(data);
      setArgs(data.arguments || []);
    } catch {
      setCaseData(null);
    } finally {
      setLoading(false);
    }
  }, [caseId]);

  useEffect(() => {
    fetchCase();
  }, [fetchCase]);

  // Poll for updates every 10s
  useEffect(() => {
    const interval = setInterval(fetchCase, 10000);
    return () => clearInterval(interval);
  }, [fetchCase]);

  const status = caseData ? CASE_STATUSES[caseData.status] : null;
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

  if (!caseData) {
    return (
      <div className="card-brutal mx-auto max-w-md py-16 text-center">
        <Gavel className="mx-auto mb-3 h-10 w-10 text-court-dark/30" />
        <h2 className="text-lg font-bold">Case Not Found</h2>
        <p className="mt-1 text-sm text-court-dark/50">
          This case doesn&apos;t exist or has been dismissed.
        </p>
        <Link to="/dashboard" className="btn-brutal mt-4 bg-court-gold text-sm">
          Back to Cases
        </Link>
      </div>
    );
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!newArgument.trim() || submitting) return;

    setSubmitting(true);
    try {
      await api.submitArgument(caseId, { content: newArgument, isObjection: false });
      setNewArgument('');
      await fetchCase();
    } catch (err) {
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleObjection = async () => {
    if (!objectionText.trim() || submitting) return;

    setSubmitting(true);
    try {
      await api.submitArgument(caseId, { content: objectionText, isObjection: true });
      setObjectionText('');
      setShowObjection(false);
      await fetchCase();
    } catch (err) {
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleRequestVerdict = async () => {
    setRequestingVerdict(true);
    try {
      await api.requestVerdict(caseId);
      navigate(`/case/${caseId}/verdict`);
    } catch (err) {
      alert(err.message);
    } finally {
      setRequestingVerdict(false);
    }
  };

  const nonObjectionArgs = args.filter((a) => !a.isObjection);
  const canSubmit = caseData.status !== 'verdict_delivered' && caseData.status !== 'pending_defendant' && caseData.status !== 'judging';
  const allRoundsDone = nonObjectionArgs.length >= 6;
  const canRequestVerdict = allRoundsDone && caseData.status !== 'verdict_delivered' && caseData.status !== 'judging';

  const userObjections = args.filter((a) => a.isObjection && a.userId === caseData?.plaintiff?.id).length;
  const objectionsLeft = 2 - userObjections;

  return (
    <div className="flex flex-col gap-6 lg:flex-row">
      {/* Main courtroom area */}
      <div className="flex-1 min-w-0">
        <button
          onClick={() => navigate('/dashboard')}
          className="btn-brutal mb-4 bg-white py-2 px-4 text-sm"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Cases
        </button>

        {/* Case header */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="card-brutal mb-4 bg-court-gold"
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <span className={`badge-brutal ${getStatusColor(caseData.status)}`}>
                  {status?.label}
                </span>
                <span className="badge-brutal bg-white">
                  {persona?.emoji} {persona?.name}
                </span>
              </div>
              <h1 className="text-xl font-black leading-tight md:text-2xl">
                {caseData.title}
              </h1>
            </div>
            <div className="flex items-center gap-2 text-sm font-bold text-court-dark/60">
              <Clock className="h-4 w-4" />
              {formatDate(caseData.createdAt)}
            </div>
          </div>
        </motion.div>

        {/* Parties bar */}
        <div className="card-brutal mb-4 flex items-center gap-3 py-3">
          <div className="flex-1 text-center">
            <p className="text-[10px] font-bold uppercase tracking-widest text-court-dark/40">
              Plaintiff
            </p>
            <p className="text-base font-black text-court-blue">
              {caseData.plaintiff?.username || '...'}
            </p>
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-xl border-2 border-court-dark bg-court-gold font-black text-xs shadow-brutal-sm">
            VS
          </div>
          <div className="flex-1 text-center">
            <p className="text-[10px] font-bold uppercase tracking-widest text-court-dark/40">
              Defendant
            </p>
            <p className="text-base font-black text-court-red">
              {caseData.defendant?.username || 'Waiting...'}
            </p>
          </div>
        </div>

        {/* Round indicator */}
        <div className="mb-4 flex gap-2">
          {Array.from({ length: caseData.totalRounds || 3 }).map((_, i) => (
            <div
              key={i}
              className={`flex-1 h-2 rounded-full border border-court-dark ${
                i < (caseData.roundsCompleted || 0) ? 'bg-court-gold' : 'bg-gray-100'
              }`}
            />
          ))}
        </div>

        {/* Arguments */}
        <div className="flex flex-col gap-4 mb-4">
          {args.length > 0 ? (
            args.map((arg) => (
              <ArgumentBubble
                key={arg.id}
                argument={arg}
                isPlaintiff={arg.side === 'plaintiff'}
              />
            ))
          ) : (
            <div className="card-brutal py-12 text-center">
              <MessageCircle className="mx-auto mb-3 h-10 w-10 text-court-dark/20" />
              <p className="font-bold">No arguments yet</p>
              <p className="mt-1 text-sm text-court-dark/50">
                {caseData.status === 'pending_defendant'
                  ? 'Waiting for the defendant to join...'
                  : 'Be the first to present your case.'}
              </p>
            </div>
          )}
        </div>

        {/* Stuck judging - reset */}
        {caseData.status === 'judging' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mb-4">
            <div className="card-brutal border-court-gold bg-court-gold-light text-center">
              <Loader2 className="mx-auto mb-2 h-6 w-6 animate-spin text-court-dark/40" />
              <p className="font-bold text-sm">Judge is deliberating...</p>
              <p className="text-xs text-court-dark/50 mt-1 mb-3">If this seems stuck, you can reset and try again.</p>
              <button
                onClick={async () => {
                  setResetting(true);
                  try {
                    await api.resetCase(caseId);
                    await fetchCase();
                  } catch (err) {
                    alert(err.message);
                  } finally {
                    setResetting(false);
                  }
                }}
                disabled={resetting}
                className="btn-brutal bg-white py-2 px-4 text-xs"
              >
                {resetting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <AlertTriangle className="h-3.5 w-3.5" />}
                Reset & Retry
              </button>
            </div>
          </motion.div>
        )}

        {/* Request verdict button */}
        {canRequestVerdict && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mb-4">
            <button
              onClick={handleRequestVerdict}
              disabled={requestingVerdict}
              className="btn-brutal w-full bg-court-gold py-3 text-base"
            >
              {requestingVerdict ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Gavel className="h-5 w-5" />
              )}
              {requestingVerdict ? 'Judge is deliberating...' : 'Request Verdict from AI Judge'}
            </button>
          </motion.div>
        )}

        {/* Input area */}
        {canSubmit && !allRoundsDone && (
          <motion.form
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            onSubmit={handleSubmit}
            className="card-brutal"
          >
            <textarea
              value={newArgument}
              onChange={(e) => setNewArgument(e.target.value)}
              placeholder="Present your argument to the court..."
              className="textarea-brutal mb-3"
              rows={3}
              maxLength={2000}
            />
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <button
                type="button"
                onClick={() => setShowObjection(!showObjection)}
                disabled={objectionsLeft <= 0}
                className={`btn-brutal py-2 px-4 text-xs ${objectionsLeft > 0 ? 'bg-court-gold' : 'bg-gray-200 text-gray-400 shadow-none border-gray-300 cursor-not-allowed'}`}
              >
                <AlertTriangle className="h-3.5 w-3.5" />
                OBJECTION! ({objectionsLeft} left)
              </button>
              <div className="flex items-center gap-3">
                <span className="text-xs text-court-dark/40">
                  {newArgument.length}/2000
                </span>
                <button
                  type="submit"
                  disabled={!newArgument.trim() || submitting}
                  className={`btn-brutal py-2 px-6 text-sm ${
                    newArgument.trim() && !submitting
                      ? 'bg-court-dark text-court-gold'
                      : 'bg-gray-200 text-gray-400 shadow-none border-gray-300 cursor-not-allowed'
                  }`}
                >
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  Submit
                </button>
              </div>
            </div>
          </motion.form>
        )}

        {/* Objection panel */}
        <AnimatePresence>
          {showObjection && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-3 overflow-hidden"
            >
              <div className="card-brutal border-court-gold bg-court-gold-light">
                <h4 className="mb-2 font-bold text-sm flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" />
                  File an Objection
                </h4>
                <p className="mb-3 text-xs text-court-dark/60">
                  Objections let you counter a specific point out of turn. Use them wisely.
                </p>
                <textarea
                  value={objectionText}
                  onChange={(e) => setObjectionText(e.target.value)}
                  placeholder="State your objection..."
                  className="textarea-brutal mb-2"
                  rows={2}
                />
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowObjection(false)}
                    className="btn-brutal bg-white py-1.5 px-4 text-xs"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleObjection}
                    disabled={!objectionText.trim() || submitting}
                    className="btn-brutal bg-court-gold py-1.5 px-4 text-xs"
                  >
                    <AlertTriangle className="h-3 w-3" />
                    Submit Objection
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Verdict delivered banner */}
        {caseData.status === 'verdict_delivered' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-4">
            <Link
              to={`/case/${caseId}/verdict`}
              className="card-brutal flex items-center justify-center gap-3 bg-court-gold py-4 text-center"
            >
              <Gavel className="h-6 w-6" />
              <span className="text-lg font-black">Verdict has been delivered — View it</span>
            </Link>
          </motion.div>
        )}
      </div>

      {/* Sidebar - case details */}
      <aside className="w-full lg:w-80 shrink-0">
        <div className="card-brutal sticky top-24">
          <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-court-dark/50">
            Case Details
          </h3>

          <div className="mb-4">
            <p className="text-xs font-bold uppercase tracking-wide text-court-dark/40 mb-1">
              Description
            </p>
            <p className="text-sm leading-relaxed">{caseData.description}</p>
          </div>

          <div className="mb-4">
            <p className="text-xs font-bold uppercase tracking-wide text-court-dark/40 mb-1">
              Demanded Compensation
            </p>
            <div className="rounded-lg border-2 border-court-gold bg-court-gold-light px-3 py-2">
              <p className="text-sm font-semibold">{caseData.requestedCompensation}</p>
            </div>
          </div>

          <div className="mb-4">
            <p className="text-xs font-bold uppercase tracking-wide text-court-dark/40 mb-1">
              Judge
            </p>
            <div className="flex items-center gap-2">
              <span className="text-xl">{persona?.emoji}</span>
              <div>
                <p className="text-sm font-bold">{persona?.name}</p>
                <p className="text-xs text-court-dark/50">{persona?.description}</p>
              </div>
            </div>
          </div>

          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-court-dark/40 mb-1">
              Progress
            </p>
            <p className="text-sm">
              Round <span className="font-bold">{caseData.roundsCompleted || 0}</span> of{' '}
              <span className="font-bold">{caseData.totalRounds || 3}</span>
            </p>
          </div>

          {caseData.inviteCode && caseData.status === 'pending_defendant' && (
            <div className="mt-4 rounded-lg border-2 border-dashed border-court-dark/30 p-3 text-center">
              <p className="text-xs font-bold text-court-dark/50 mb-1">Invite Code</p>
              <p className="font-mono font-bold text-lg">{caseData.inviteCode}</p>
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}
