import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useUser } from '@clerk/react';
import { motion } from 'framer-motion';
import { Gavel, Loader2 } from 'lucide-react';
import { api } from '../services/api';

export default function JoinCasePage() {
  const { inviteCode } = useParams();
  const navigate = useNavigate();
  const { isLoaded, isSignedIn } = useUser();
  const [status, setStatus] = useState('loading');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isLoaded) return;

    if (!isSignedIn) {
      navigate(`/sign-in?redirect_url=${encodeURIComponent(`/join/${inviteCode}`)}`);
      return;
    }

    api
      .joinCase(inviteCode)
      .then((caseData) => {
        setStatus('success');
        setTimeout(() => navigate(`/case/${caseData.id}`), 1500);
      })
      .catch((err) => {
        setError(err.message);
        setStatus('error');
      });
  }, [inviteCode, isLoaded, isSignedIn, navigate]);

  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="card-brutal max-w-md text-center"
      >
        {status === 'loading' && (
          <>
            <Loader2 className="mx-auto mb-3 h-10 w-10 animate-spin text-court-dark/40" />
            <h2 className="text-lg font-bold">Joining Case...</h2>
            <p className="mt-1 text-sm text-court-dark/50">Summoning you to the courtroom</p>
          </>
        )}
        {status === 'success' && (
          <>
            <Gavel className="mx-auto mb-3 h-10 w-10 text-court-gold" />
            <h2 className="text-lg font-bold">You&apos;ve Joined!</h2>
            <p className="mt-1 text-sm text-court-dark/50">Redirecting to the courtroom...</p>
          </>
        )}
        {status === 'error' && (
          <>
            <Gavel className="mx-auto mb-3 h-10 w-10 text-court-red" />
            <h2 className="text-lg font-bold">Couldn&apos;t Join</h2>
            <p className="mt-2 text-sm text-court-dark/70">{error}</p>
            <button
              onClick={() => navigate('/dashboard')}
              className="btn-brutal mt-4 bg-court-gold text-sm"
            >
              Go to Dashboard
            </button>
          </>
        )}
      </motion.div>
    </div>
  );
}
