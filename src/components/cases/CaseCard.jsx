import { Link } from 'react-router-dom';
import { ArrowRight, Check, Clock, Radio } from 'lucide-react';
import { CASE_STATUSES, JUDGE_PERSONAS } from '../../lib/mockData';
import { formatDate, getStatusColor } from '../../lib/utils';

export default function CaseCard({ caseData }) {
  const status = CASE_STATUSES[caseData.status];
  const persona = JUDGE_PERSONAS.find((p) => p.id === caseData.judgePersona);
  const isResolved = caseData.status === 'verdict_delivered';
  const isLive = caseData.status === 'in_session';
  const isPending = caseData.status === 'pending_defendant';
  const isLegacy = ['opening_statements', 'rebuttals', 'closing_arguments', 'judging'].includes(caseData.status);
  const linkTo = isResolved
    ? `/case/${caseData.id}/verdict`
    : `/case/${caseData.id}`;

  return (
    <div className="card-brutal card-hover flex flex-col justify-between gap-4">
      {/* Header badges */}
      <div className="flex items-center justify-between gap-2">
        <span className="badge-brutal bg-court-gold-light">
          {persona?.emoji} {persona?.name}
        </span>
        <div className="flex items-center gap-1.5">
          <span
            className={`h-2.5 w-2.5 rounded-full ${
              isResolved ? 'bg-court-green' : 'bg-court-red animate-pulse'
            }`}
          />
          <span className={`badge-brutal ${getStatusColor(caseData.status)}`}>
            {status?.label}
          </span>
        </div>
      </div>

      {/* Case title */}
      <h3 className="text-lg font-bold leading-snug">{caseData.title}</h3>

      {/* Parties */}
      <div className="flex items-center gap-3">
        <div className="flex-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-court-dark/50">Plaintiff</p>
          <p className="font-bold">{caseData.plaintiff?.username || '...'}</p>
        </div>
        <div className="flex h-8 w-8 items-center justify-center rounded-lg border-2 border-court-dark bg-court-gold-light font-black text-xs">
          VS
        </div>
        <div className="flex-1 text-right">
          <p className="text-xs font-semibold uppercase tracking-wide text-court-dark/50">Defendant</p>
          <p className="font-bold">{caseData.defendant?.username || 'Waiting...'}</p>
        </div>
      </div>

      {/* Status indicator */}
      <div className="flex items-center gap-2">
        {isLive && (
          <>
            <div className="flex items-center gap-1.5 rounded-lg border-2 border-court-green bg-court-green/10 px-2.5 py-1">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-court-green opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-court-green" />
              </span>
              <span className="text-xs font-black uppercase tracking-wide text-court-green">Live</span>
            </div>
            <span className="text-xs font-medium text-court-dark/50">Session in progress</span>
          </>
        )}
        {isPending && (
          <div className="flex items-center gap-1.5 text-court-dark/50">
            <Clock className="h-3.5 w-3.5" />
            <span className="text-xs font-medium">Waiting for defendant...</span>
          </div>
        )}
        {isResolved && (
          <>
            <div className="flex-1 h-2 rounded-full border border-court-green bg-court-green overflow-hidden" />
            <div className="flex items-center gap-1 text-court-green">
              <Check className="h-3.5 w-3.5" />
              <span className="text-xs font-bold">Done</span>
            </div>
          </>
        )}
        {isLegacy && (
          <>
            <div className="flex-1 h-2 rounded-full border border-court-dark bg-gray-100 overflow-hidden">
              <div
                className="h-full bg-court-gold rounded-full transition-all"
                style={{ width: `${((caseData.roundsCompleted || 0) / (caseData.totalRounds || 3)) * 100}%` }}
              />
            </div>
            <span className="text-xs font-bold text-court-dark/60">
              {caseData.roundsCompleted || 0}/{caseData.totalRounds || 3}
            </span>
          </>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-court-dark/50">
          {formatDate(caseData.createdAt)}
        </span>
        <Link
          to={linkTo}
          className="btn-brutal bg-court-gold py-1.5 px-4 text-sm"
        >
          {isResolved ? 'View Verdict' : 'Enter Court'}
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </div>
  );
}
