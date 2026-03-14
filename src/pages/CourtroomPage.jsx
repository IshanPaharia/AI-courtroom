import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useUser } from '@clerk/react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Send,
  Gavel,
  AlertTriangle,
  Loader2,
  Clock,
  ArrowRight,
  Paperclip,
  X as XIcon,
  Image,
  RefreshCw,
} from 'lucide-react';
import { api } from '../services/api';
import { JUDGE_PERSONAS } from '../lib/mockData';

const POLL_INTERVAL = 3000;

function JudgeTypingIndicator() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="flex justify-center my-3"
    >
      <div className="flex items-center gap-2 rounded-xl border-2 border-court-dark bg-court-gold px-4 py-2 shadow-brutal-sm">
        <Gavel className="h-4 w-4 animate-bounce" />
        <span className="text-sm font-bold">Judge is deliberating</span>
        <span className="flex gap-0.5">
          <span className="h-1.5 w-1.5 rounded-full bg-court-dark animate-bounce" style={{ animationDelay: '0ms' }} />
          <span className="h-1.5 w-1.5 rounded-full bg-court-dark animate-bounce" style={{ animationDelay: '150ms' }} />
          <span className="h-1.5 w-1.5 rounded-full bg-court-dark animate-bounce" style={{ animationDelay: '300ms' }} />
        </span>
      </div>
    </motion.div>
  );
}

function TimeoutBanner({ timeout, side }) {
  const [remaining, setRemaining] = useState(timeout.remaining);

  useEffect(() => {
    const interval = setInterval(() => {
      setRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  if (remaining <= 0) return null;

  const isYou = timeout.target === side;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0 }}
      className={`mx-4 my-2 flex items-center gap-3 rounded-xl border-2 border-court-dark p-3 shadow-brutal-sm ${
        isYou ? 'bg-court-red/20' : 'bg-court-gold-light'
      }`}
    >
      <Clock className="h-5 w-5 shrink-0" />
      <div className="flex-1">
        <p className="text-sm font-bold">
          {isYou ? 'You have been muted!' : `${timeout.target} has been muted`}
        </p>
        <p className="text-xs text-court-dark/60">{timeout.reason}</p>
      </div>
      <div className="flex h-10 w-10 items-center justify-center rounded-lg border-2 border-court-dark bg-court-card font-black text-lg shadow-brutal-sm">
        {remaining}s
      </div>
    </motion.div>
  );
}

function ChatMessage({ msg, yourSide, plaintiff, defendant }) {
  const isJudge = msg.sender === 'judge';
  const isYou = msg.sender === yourSide;
  const senderName = isJudge
    ? 'Judge'
    : msg.sender === 'plaintiff'
    ? plaintiff?.username || 'Plaintiff'
    : defendant?.username || 'Defendant';

  // Hide system-only messages from the chat
  if (msg.type === 'force_verdict_vote') return null;

  const metadata = msg.metadata ? (typeof msg.metadata === 'string' ? JSON.parse(msg.metadata) : msg.metadata) : {};

  if (isJudge) {
    const isWarning = msg.type === 'warning';
    const isTimeout = msg.type === 'timeout';
    const isVerdict = msg.type === 'verdict';

    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex justify-center my-2 px-4"
      >
        <div
          className={`max-w-lg w-full rounded-xl border-2 border-court-dark p-3 shadow-brutal-sm text-center ${
            isVerdict
              ? 'bg-court-gold'
              : isWarning
              ? 'bg-orange-100'
              : isTimeout
              ? 'bg-court-red/10'
              : 'bg-court-gold-light'
          }`}
        >
          <div className="flex items-center justify-center gap-1.5 mb-1">
            <Gavel className="h-3.5 w-3.5" />
            <span className="text-xs font-black uppercase tracking-wide">
              {isVerdict ? 'VERDICT' : isWarning ? 'WARNING' : isTimeout ? 'ORDER' : 'JUDGE'}
            </span>
            {(isWarning || isTimeout) && metadata.target && (
              <span className="text-xs font-bold text-court-dark/60">
                to {metadata.target}
              </span>
            )}
          </div>
          <p className="text-sm font-medium">{msg.content}</p>
          {isVerdict && (
            <div className="mt-2 text-xs font-bold text-court-dark/70">
              The court has reached a decision.
            </div>
          )}
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex px-4 my-1 ${isYou ? 'justify-end' : 'justify-start'}`}
    >
      <div className={`max-w-[75%] ${isYou ? 'items-end' : 'items-start'}`}>
        <p className={`text-[10px] font-bold mb-0.5 px-1 ${isYou ? 'text-right' : 'text-left'} text-court-dark/50`}>
          {senderName}
          <span className="font-normal ml-1">
            {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        </p>
        <div
          className={`rounded-xl border-2 border-court-dark px-3 py-2 shadow-brutal-sm ${
            isYou
              ? msg.sender === 'plaintiff'
                ? 'bg-court-blue/20'
                : 'bg-court-green/20'
              : msg.sender === 'plaintiff'
              ? 'bg-blue-50'
              : 'bg-green-50'
          }`}
        >
          <p className="text-sm whitespace-pre-wrap wrap-break-word">{msg.content}</p>
          {msg.attachmentUrl && (
            <div className="mt-2">
              {msg.attachmentType?.startsWith('image') ? (
                <img
                  src={msg.attachmentUrl}
                  alt="Evidence"
                  className="max-w-full rounded-lg border border-court-dark/20 cursor-pointer"
                  onClick={() => window.open(msg.attachmentUrl, '_blank')}
                />
              ) : (
                <a
                  href={msg.attachmentUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-xs font-bold text-court-blue underline"
                >
                  View Evidence <ArrowRight className="h-3 w-3" />
                </a>
              )}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

export default function CourtroomPage() {
  const { caseId } = useParams();
  const navigate = useNavigate();
  const { user: clerkUser } = useUser();

  const [caseData, setCaseData] = useState(null);
  const [chatMessages, setChatMessages] = useState([]);
  const [yourSide, setYourSide] = useState(null);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [judgeThinking, setJudgeThinking] = useState(false);
  const [activeTimeout, setActiveTimeout] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [pendingAttachment, setPendingAttachment] = useState(null);
  const [forceVerdictVotes, setForceVerdictVotes] = useState({ plaintiff: false, defendant: false });
  const [myForceVote, setMyForceVote] = useState(false);
  const [verdictData, setVerdictData] = useState(null);

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const fileInputRef = useRef(null);
  const lastPollTimeRef = useRef(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [chatMessages, judgeThinking, scrollToBottom]);

  // Initial load
  useEffect(() => {
    let cancelled = false;

    async function loadCourtroom() {
      try {
        const data = await api.getCourtroom(caseId);
        if (cancelled) return;

        setCaseData(data.caseData);
        setChatMessages(data.messages);
        setYourSide(data.yourSide);
        setForceVerdictVotes(data.forceVerdictVotes || { plaintiff: false, defendant: false });
        setMyForceVote(data.forceVerdictVotes?.[data.yourSide] || false);

        if (data.activeTimeout) {
          setActiveTimeout(data.activeTimeout);
        }

        if (data.messages.length > 0) {
          lastPollTimeRef.current = data.messages[data.messages.length - 1].createdAt;
        }

        // Check if verdict was already delivered
        const verdictMsg = data.messages.find((m) => m.type === 'verdict');
        if (verdictMsg) {
          const meta = typeof verdictMsg.metadata === 'string' ? JSON.parse(verdictMsg.metadata) : verdictMsg.metadata;
          setVerdictData(meta);
        }
      } catch (err) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadCourtroom();
    return () => { cancelled = true; };
  }, [caseId]);

  // Polling for new messages
  useEffect(() => {
    if (loading || !caseData || caseData.status === 'verdict_delivered') return;

    const interval = setInterval(async () => {
      try {
        const data = await api.pollCourtroom(caseId, lastPollTimeRef.current);

        if (data.messages.length > 0) {
          setChatMessages((prev) => {
            const newMsgs = data.messages.filter((m) => !prev.some((p) => p.id === m.id));
            if (newMsgs.length === 0) return prev;
            return [...prev, ...newMsgs];
          });
          lastPollTimeRef.current = data.messages[data.messages.length - 1].createdAt;

          // Check for verdict in new messages
          const verdictMsg = data.messages.find((m) => m.type === 'verdict');
          if (verdictMsg) {
            const meta = typeof verdictMsg.metadata === 'string' ? JSON.parse(verdictMsg.metadata) : verdictMsg.metadata;
            setVerdictData(meta);
          }
        }

        if (data.caseStatus && data.caseStatus !== caseData.status) {
          setCaseData((prev) => prev ? { ...prev, status: data.caseStatus } : prev);
        }

        if (data.forceVerdictVotes) {
          setForceVerdictVotes(data.forceVerdictVotes);
        }

        if (data.activeTimeout) {
          setActiveTimeout(data.activeTimeout);
        } else {
          setActiveTimeout(null);
        }
      } catch {
        // Silently handle poll errors
      }
    }, POLL_INTERVAL);

    return () => clearInterval(interval);
  }, [caseId, loading, caseData?.status]);

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 3 * 1024 * 1024) {
      setError('File too large. Maximum size is 3MB.');
      setTimeout(() => setError(''), 4000);
      return;
    }

    setUploading(true);
    try {
      const token = await api.getAuthToken();
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/upload', {
        method: 'POST',
        headers: { ...(token && { Authorization: `Bearer ${token}` }) },
        body: formData,
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || 'Upload failed');
      }

      const data = await res.json();
      setPendingAttachment({ url: data.url, type: data.type, name: data.name });
    } catch (err) {
      setError(err.message);
      setTimeout(() => setError(''), 4000);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSend = async () => {
    if (!newMessage.trim() && !pendingAttachment) return;
    if (sending) return;

    setSending(true);
    const thinkingTimer = setTimeout(() => setJudgeThinking(true), 1500);

    try {
      const data = await api.sendCourtroomMessage(caseId, {
        content: newMessage.trim() || (pendingAttachment ? `[Evidence: ${pendingAttachment.name}]` : ''),
        attachmentUrl: pendingAttachment?.url || null,
        attachmentType: pendingAttachment?.type || null,
      });

      // Add user message
      setChatMessages((prev) => {
        if (prev.some((m) => m.id === data.message.id)) return prev;
        return [...prev, data.message];
      });
      lastPollTimeRef.current = data.message.createdAt;

      // Add judge messages if any
      if (data.judgeMessages?.length > 0) {
        setChatMessages((prev) => {
          const newMsgs = data.judgeMessages.filter((m) => !prev.some((p) => p.id === m.id));
          return [...prev, ...newMsgs];
        });
        const lastJudge = data.judgeMessages[data.judgeMessages.length - 1];
        lastPollTimeRef.current = lastJudge.createdAt;

        const verdictMsg = data.judgeMessages.find((m) => m.type === 'verdict');
        if (verdictMsg) {
          const meta = typeof verdictMsg.metadata === 'string' ? JSON.parse(verdictMsg.metadata) : verdictMsg.metadata;
          setVerdictData(meta);
          setCaseData((prev) => prev ? { ...prev, status: 'verdict_delivered' } : prev);
        }
      }

      setNewMessage('');
      setPendingAttachment(null);
    } catch (err) {
      setError(err.message);
      setTimeout(() => setError(''), 5000);
    } finally {
      clearTimeout(thinkingTimer);
      setSending(false);
      setJudgeThinking(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleForceVerdict = async () => {
    if (myForceVote) return;

    try {
      const data = await api.forceVerdict(caseId);
      setForceVerdictVotes(data.votes);
      setMyForceVote(true);

      if (data.judgeMessages?.length > 0) {
        setChatMessages((prev) => {
          const newMsgs = data.judgeMessages.filter((m) => !prev.some((p) => p.id === m.id));
          return [...prev, ...newMsgs];
        });
        const last = data.judgeMessages[data.judgeMessages.length - 1];
        lastPollTimeRef.current = last.createdAt;

        const verdictMsg = data.judgeMessages.find((m) => m.type === 'verdict');
        if (verdictMsg) {
          const meta = typeof verdictMsg.metadata === 'string' ? JSON.parse(verdictMsg.metadata) : verdictMsg.metadata;
          setVerdictData(meta);
          setCaseData((prev) => prev ? { ...prev, status: 'verdict_delivered' } : prev);
        }
      }
    } catch (err) {
      setError(err.message);
      setTimeout(() => setError(''), 5000);
    }
  };

  const persona = JUDGE_PERSONAS.find((p) => p.id === caseData?.judgePersona);
  const isTimedOut = activeTimeout?.target === yourSide && activeTimeout?.remaining > 0;
  const isVerdictDelivered = caseData?.status === 'verdict_delivered';
  const canSend = !isTimedOut && !isVerdictDelivered && !sending && caseData?.status === 'in_session';

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-court-dark/40" />
          <p className="text-sm font-medium text-court-dark/50">Entering courtroom...</p>
        </div>
      </div>
    );
  }

  if (error && !caseData) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="card-brutal max-w-md text-center">
          <AlertTriangle className="mx-auto mb-3 h-10 w-10 text-court-red" />
          <h2 className="text-lg font-black">Failed to enter courtroom</h2>
          <p className="mt-2 text-sm text-court-dark/60">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="btn-brutal mt-4 bg-court-gold text-sm"
          >
            <RefreshCw className="h-4 w-4" /> Retry
          </button>
        </div>
      </div>
    );
  }

  if (!caseData) return null;

  return (
    <div className="mx-auto flex h-[calc(100vh-5rem)] max-w-4xl flex-col">
      {/* Header */}
      <div className="card-brutal mb-2 flex items-center justify-between gap-3 p-3">
        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-black truncate">{caseData.title}</h1>
          <div className="flex flex-wrap items-center gap-2 mt-1">
            <span className="text-xs font-bold text-court-dark/50">
              {persona?.emoji} {persona?.name}
            </span>
            {caseData.isAppeal && (
              <span className="rounded-lg border border-court-red bg-court-red/10 px-2 py-0.5 text-[10px] font-black text-court-red">
                APPEAL
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <div className="flex items-center gap-1.5">
            <div className="flex items-center gap-1 rounded-lg border border-court-dark/20 px-2 py-1">
              <span className="text-[10px] font-bold">{caseData.plaintiff?.username}</span>
            </div>
            <span className="text-xs font-bold text-court-dark/30">vs</span>
            <div className="flex items-center gap-1 rounded-lg border border-court-dark/20 px-2 py-1">
              <span className="text-[10px] font-bold">{caseData.defendant?.username}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Case description bar */}
      <div className="mx-1 mb-2 rounded-lg border border-court-dark/10 bg-court-gold-light/50 px-3 py-2">
        <p className="text-xs">
          <span className="font-bold">Complaint:</span> {caseData.description}
        </p>
        <p className="text-xs mt-0.5">
          <span className="font-bold">Seeks:</span> {caseData.requestedCompensation}
        </p>
      </div>

      {/* Chat messages */}
      <div className="flex-1 overflow-y-auto rounded-xl border-2 border-court-dark bg-court-card shadow-brutal">
        <div className="py-3">
          {chatMessages.length === 0 && !judgeThinking && (
            <div className="flex flex-col items-center justify-center py-16 text-center text-court-dark/30">
              <Gavel className="h-10 w-10 mb-2" />
              <p className="text-sm font-bold">Waiting for the session to begin...</p>
              <p className="text-xs mt-1">Both parties must be present for the trial to start.</p>
            </div>
          )}

          {chatMessages.map((msg) => (
            <ChatMessage
              key={msg.id}
              msg={msg}
              yourSide={yourSide}
              plaintiff={caseData.plaintiff}
              defendant={caseData.defendant}
            />
          ))}

          <AnimatePresence>
            {activeTimeout && activeTimeout.remaining > 0 && (
              <TimeoutBanner timeout={activeTimeout} side={yourSide} />
            )}
          </AnimatePresence>

          <AnimatePresence>
            {judgeThinking && <JudgeTypingIndicator />}
          </AnimatePresence>

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Verdict banner */}
      <AnimatePresence>
        {verdictData && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-2"
          >
            <Link
              to={`/case/${caseId}/verdict`}
              className="card-brutal flex items-center justify-between bg-court-gold p-4 card-hover"
            >
              <div className="flex items-center gap-3">
                <Gavel className="h-6 w-6" />
                <div>
                  <p className="font-black">The Verdict is In!</p>
                  <p className="text-sm text-court-dark/70">Click to see the full ruling</p>
                </div>
              </div>
              <ArrowRight className="h-5 w-5" />
            </Link>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error bar */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="mx-1 mt-1 flex items-center gap-2 rounded-lg bg-court-red/10 px-3 py-1.5 text-xs font-bold text-court-red"
          >
            <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
            {error}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Force verdict vote */}
      {!isVerdictDelivered && caseData?.status === 'in_session' && (
        <div className="mt-2 mx-1 flex items-center justify-between rounded-xl border-2 border-court-dark/20 bg-court-gold-light/50 px-3 py-2">
          <div className="flex items-center gap-2 text-xs">
            <Gavel className="h-3.5 w-3.5 shrink-0" />
            <span className="font-bold">Force Verdict</span>
            <span className="text-court-dark/50">
              ({[forceVerdictVotes.plaintiff && 'Plaintiff', forceVerdictVotes.defendant && 'Defendant'].filter(Boolean).join(', ') || 'No votes'})
            </span>
          </div>
          <button
            onClick={handleForceVerdict}
            disabled={myForceVote}
            className={`btn-brutal text-xs py-1 px-3 ${
              myForceVote
                ? 'bg-court-gold border-court-gold-dark opacity-70 cursor-not-allowed'
                : 'bg-court-card'
            }`}
          >
            {myForceVote ? 'Voted' : 'Vote'}
          </button>
        </div>
      )}

      {/* Pending attachment preview */}
      {pendingAttachment && (
        <div className="mt-2 mx-1 flex items-center gap-2 rounded-lg border border-court-dark/20 bg-court-gold-light/50 px-3 py-1.5">
          <Image className="h-4 w-4 shrink-0" />
          <span className="text-xs font-medium truncate flex-1">{pendingAttachment.name}</span>
          <button onClick={() => setPendingAttachment(null)} className="p-0.5 hover:bg-court-dark/10 rounded">
            <XIcon className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Input area */}
      {!isVerdictDelivered && (
        <div className="mt-2 flex items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/gif,image/webp,application/pdf"
            onChange={handleFileSelect}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={!canSend || uploading}
            className="btn-brutal bg-court-card p-2.5 disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
            title="Attach evidence (max 3MB)"
          >
            {uploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Paperclip className="h-5 w-5" />}
          </button>
          <div className="relative flex-1">
            <input
              ref={inputRef}
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={
                isTimedOut
                  ? 'You are muted by the judge...'
                  : sending
                  ? 'Sending...'
                  : caseData?.status !== 'in_session'
                  ? 'Waiting for both parties...'
                  : 'Present your argument...'
              }
              disabled={!canSend}
              maxLength={2000}
              className="input-brutal pr-16 disabled:opacity-50 disabled:cursor-not-allowed"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-court-dark/30">
              {newMessage.length}/2000
            </span>
          </div>
          <button
            onClick={handleSend}
            disabled={!canSend || (!newMessage.trim() && !pendingAttachment)}
            className="btn-brutal bg-court-gold p-2.5 disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
          >
            {sending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
          </button>
        </div>
      )}

      {/* Already delivered - go to verdict */}
      {isVerdictDelivered && !verdictData && (
        <div className="mt-2">
          <Link
            to={`/case/${caseId}/verdict`}
            className="btn-brutal w-full justify-center bg-court-gold py-3"
          >
            <Gavel className="h-5 w-5" />
            View Verdict
          </Link>
        </div>
      )}
    </div>
  );
}
