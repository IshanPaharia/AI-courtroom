import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { CASE_STATUSES, JUDGE_PERSONAS } from '../../lib/mockData';
import { formatDate, getStatusColor } from '../../lib/utils';

export default function CaseCard({ caseData }) {
  const status = CASE_STATUSES[caseData.status];
  const persona = JUDGE_PERSONAS.find((p) => p.id === caseData.judgePersona);
  const isResolved = caseData.status === 'verdict_delivered';
  const linkTo = isResolved
    ? `/case/${caseData.id}/verdict`
    : `/case/${caseData.id}`;

  const roundsCompleted = caseData.roundsCompleted || 0;
  const totalRounds = caseData.totalRounds || 3;

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

      {/* Rounds progress */}
      <div className="flex items-center gap-2">
        <div className="flex-1 h-2 rounded-full border border-court-dark bg-gray-100 overflow-hidden">
          <div
            className="h-full bg-court-gold rounded-full transition-all"
            style={{ width: `${(roundsCompleted / totalRounds) * 100}%` }}
          />
        </div>
        <span className="text-xs font-bold text-court-dark/60">
          {roundsCompleted}/{totalRounds}
        </span>
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
