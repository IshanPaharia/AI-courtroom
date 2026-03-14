import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '@clerk/react';
import { motion } from 'framer-motion';
import { Gavel, Send, Sparkles, ArrowLeft, Loader2, Copy, Check, LogIn, Link as LinkIcon } from 'lucide-react';
import { JUDGE_PERSONAS } from '../lib/mockData';
import { api } from '../services/api';

export default function NewCasePage() {
  const navigate = useNavigate();
  const { isSignedIn } = useUser();
  const [form, setForm] = useState({
    title: '',
    description: '',
    compensation: '',
    judgePersona: 'strict',
  });
  const [submitting, setSubmitting] = useState(false);
  const [created, setCreated] = useState(null);
  const [copied, setCopied] = useState(false);

  const updateField = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isSignedIn) return navigate('/sign-in');

    setSubmitting(true);
    try {
      const newCase = await api.createCase({
        title: form.title,
        description: form.description,
        requestedCompensation: form.compensation,
        judgePersona: form.judgePersona,
      });
      setCreated(newCase);
    } catch (err) {
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const copyInviteLink = () => {
    const link = `${window.location.origin}/join/${created.inviteCode}`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isValid = form.title && form.description && form.compensation;

  if (!isSignedIn) {
    return (
      <div className="card-brutal mx-auto max-w-md py-16 text-center">
        <LogIn className="mx-auto mb-3 h-10 w-10 text-court-dark/30" />
        <h2 className="text-lg font-bold">Sign in to file a case</h2>
        <Link to="/sign-in" className="btn-brutal mt-4 bg-court-gold text-sm">
          Sign In
        </Link>
      </div>
    );
  }

  // Success screen with invite link
  if (created) {
    const inviteLink = `${window.location.origin}/join/${created.inviteCode}`;
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="mx-auto max-w-lg"
      >
        <div className="card-brutal bg-court-gold text-center">
          <Gavel className="mx-auto mb-3 h-12 w-12" />
          <h2 className="text-2xl font-black">Case Filed!</h2>
          <p className="mt-1 text-sm font-medium text-court-dark/70">
            Share the invite link with the defendant
          </p>
        </div>

        <div className="card-brutal mt-4">
          <p className="mb-2 text-sm font-bold uppercase tracking-wide text-court-dark/50">
            Invite Link
          </p>
          <div className="flex items-center gap-2">
            <div className="input-brutal flex-1 flex items-center gap-2 text-sm">
              <LinkIcon className="h-4 w-4 shrink-0 text-court-dark/40" />
              <span className="truncate">{inviteLink}</span>
            </div>
            <button onClick={copyInviteLink} className="btn-brutal bg-court-gold py-3 px-4">
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            </button>
          </div>
          <p className="mt-2 text-xs text-court-dark/40">
            The defendant will join when they open this link.
          </p>
        </div>

        <div className="mt-4 flex gap-3">
          <button
            onClick={() => navigate(`/case/${created.id}`)}
            className="btn-brutal flex-1 bg-court-ink text-court-gold text-sm border-court-ink"
          >
            Go to Courtroom
          </button>
          <button
            onClick={() => navigate('/dashboard')}
            className="btn-brutal flex-1 bg-court-card text-sm"
          >
            Dashboard
          </button>
        </div>
      </motion.div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl">
      <button
        onClick={() => navigate(-1)}
        className="btn-brutal mb-6 bg-court-card py-2 px-4 text-sm"
      >
        <ArrowLeft className="h-4 w-4" />
        Back
      </button>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="card-brutal bg-court-gold mb-6">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl border-2 border-court-ink bg-court-ink shadow-brutal-sm">
              <Gavel className="h-6 w-6 text-court-gold" />
            </div>
            <div>
              <h1 className="text-2xl font-black">File a Case</h1>
              <p className="text-sm font-medium text-court-dark/70">
                State your grievance and demand justice
              </p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          {/* Case Title */}
          <div className="card-brutal">
            <label className="mb-2 block text-sm font-bold uppercase tracking-wide text-court-dark/60">
              Case Title
            </label>
            <input
              type="text"
              placeholder='e.g., "The Case of the Stolen Leftovers"'
              value={form.title}
              onChange={(e) => updateField('title', e.target.value)}
              className="input-brutal"
              maxLength={100}
            />
            <p className="mt-1.5 text-xs text-court-dark/40 text-right">
              {form.title.length}/100
            </p>
          </div>

          {/* Description */}
          <div className="card-brutal">
            <label className="mb-2 block text-sm font-bold uppercase tracking-wide text-court-dark/60">
              What Happened?
            </label>
            <textarea
              placeholder="Describe the conflict in detail. What did the defendant do? When did it happen? Why is it unjust?"
              value={form.description}
              onChange={(e) => updateField('description', e.target.value)}
              className="textarea-brutal"
              rows={4}
              maxLength={1000}
            />
            <p className="mt-1.5 text-xs text-court-dark/40 text-right">
              {form.description.length}/1000
            </p>
          </div>

          {/* Compensation */}
          <div className="card-brutal">
            <label className="mb-2 block text-sm font-bold uppercase tracking-wide text-court-dark/60">
              Demanded Compensation
            </label>
            <textarea
              placeholder="What do you want? Be specific — snacks, favors, public apologies, literally anything."
              value={form.compensation}
              onChange={(e) => updateField('compensation', e.target.value)}
              className="textarea-brutal"
              rows={2}
              maxLength={500}
            />
            <div className="mt-2 flex items-start gap-2 rounded-lg border border-court-dark/20 bg-court-gold-light px-3 py-2">
              <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-court-gold-dark" />
              <p className="text-xs text-court-dark/60">
                The AI Judge may adjust the final compensation based on the arguments presented. Dream big.
              </p>
            </div>
          </div>

          {/* Judge Persona */}
          <div className="card-brutal">
            <label className="mb-3 block text-sm font-bold uppercase tracking-wide text-court-dark/60">
              Choose Your Judge
            </label>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {JUDGE_PERSONAS.map((persona) => {
                const selected = form.judgePersona === persona.id;
                return (
                  <button
                    key={persona.id}
                    type="button"
                    onClick={() => updateField('judgePersona', persona.id)}
                    className={`flex flex-col items-center gap-1.5 rounded-xl border-2 border-court-dark p-3 text-center transition-all cursor-pointer ${
                      selected
                        ? 'bg-court-gold shadow-brutal'
                        : 'bg-court-card shadow-brutal-sm hover:shadow-brutal'
                    }`}
                  >
                    <span className="text-2xl">{persona.emoji}</span>
                    <span className="text-xs font-bold leading-tight">{persona.name}</span>
                    <span className="text-[10px] text-court-dark/50 leading-tight">
                      {persona.description}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={!isValid || submitting}
            className={`btn-brutal w-full py-3 text-base ${
              isValid && !submitting
                ? 'bg-court-ink text-court-gold border-court-ink'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed shadow-none border-gray-300'
            }`}
          >
            {submitting ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Send className="h-5 w-5" />
            )}
            {submitting ? 'Filing...' : 'File Case & Get Invite Link'}
          </button>
        </form>
      </motion.div>
    </div>
  );
}
