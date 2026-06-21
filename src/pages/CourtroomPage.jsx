import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { io } from 'socket.io-client';
// eslint-disable-next-line no-unused-vars
import { motion, AnimatePresence } from 'framer-motion';
import {
  Send,
  Gavel,
  AlertTriangle,
  Loader2,
  Clock,
  Shield,
  User,
  ArrowRight,
  Wifi,
  WifiOff,
  Paperclip,
  X as XIcon,
  Image,
  RefreshCw,
} from 'lucide-react';
import { api } from '../services/api';
import { JUDGE_PERSONAS } from '../lib/mockData';

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
  const [remaining, setRemaining] = useState(timeout.duration);

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

  const isObjection = msg.type === 'objection';
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
          className={`max-w-lg w-full rounded-xl border-2 p-3 shadow-brutal-sm text-center ${
            isVerdict
              ? 'border-court-ink bg-court-gold text-court-ink'
              : isWarning
              ? 'border-court-dark bg-orange-100 dark:bg-orange-950/40'
              : isTimeout
              ? 'border-court-dark bg-court-red/10'
              : 'border-court-dark bg-court-gold-light'
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
            <div className="mt-2 text-xs font-bold text-court-ink/70">
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
          className={`rounded-xl border-2 px-3 py-2 shadow-brutal-sm ${
            isObjection
              ? 'border-court-red bg-court-red/10'
              : isYou
              ? msg.sender === 'plaintiff'
                ? 'border-court-dark bg-court-blue/20'
                : 'border-court-dark bg-court-green/20'
              : msg.sender === 'plaintiff'
              ? 'border-court-dark bg-blue-50 dark:bg-blue-950/40'
              : 'border-court-dark bg-green-50 dark:bg-green-950/40'
          }`}
        >
          {isObjection && (
            <div className="flex items-center gap-1 mb-1">
              <AlertTriangle className="h-3 w-3 text-court-red" />
              <span className="text-[10px] font-black uppercase tracking-wider text-court-red">Objection!</span>
            </div>
          )}
          <p className={`text-sm whitespace-pre-wrap wrap-break-word ${isObjection ? 'font-semibold' : ''}`}>{msg.content}</p>
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

  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);
  const [caseData, setCaseData] = useState(null);
  const [chatMessages, setChatMessages] = useState([]);
  const [yourSide, setYourSide] = useState(null);
  const [newMessage, setNewMessage] = useState('');
  const [judgeTyping, setJudgeTyping] = useState(false);
  const [otherTyping, setOtherTyping] = useState(false);
  const [activeTimeout, setActiveTimeout] = useState(null);
  const [myTimeoutEnd, setMyTimeoutEnd] = useState(0);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [error, setError] = useState('');
  const [verdictData, setVerdictData] = useState(null);
  const [rateLimited, setRateLimited] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [pendingAttachment, setPendingAttachment] = useState(null);
  const [forceVerdictVotes, setForceVerdictVotes] = useState({ plaintiff: false, defendant: false });
  const [myForceVote, setMyForceVote] = useState(false);
  const [objectionCounts, setObjectionCounts] = useState({ plaintiff: 0, defendant: 0 });

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const fileInputRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [chatMessages, judgeTyping, scrollToBottom]);

  // Connect socket
  useEffect(() => {
    let s;

    async function connect() {
      try {
        const token = await api.getAuthToken();
        if (!token) {
          setError('Not authenticated');
          return;
        }

        const serverUrl = import.meta.env.DEV ? 'http://localhost:3001' : undefined;
        s = io(serverUrl || window.location.origin, {
          auth: { token },
          transports: ['websocket', 'polling'],
        });

        s.on('connect', () => setConnected(true));
        s.on('disconnect', () => setConnected(false));

        s.on('case-data', (data) => {
          setCaseData(data.caseData);
          setChatMessages(data.messages || []);
          setYourSide(data.yourSide);
          s._yourSide = data.yourSide;
          if (data.objections) setObjectionCounts(data.objections);
        });

        s.on('new-message', (msg) => {
          setChatMessages((prev) => {
            if (prev.some((m) => m.id === msg.id)) return prev;
            return [...prev, msg];
          });
        });

        s.on('judge-typing', (isTyping) => setJudgeTyping(isTyping));

        s.on('user-typing', (data) => {
          if (data.side !== s._yourSide) setOtherTyping(true);
        });
        s.on('user-stop-typing', (data) => {
          if (data.side !== s._yourSide) setOtherTyping(false);
        });

        s.on('user-timeout', (data) => {
          setActiveTimeout(data);
          if (data.target === s._yourSide) {
            setMyTimeoutEnd(Date.now() + data.duration * 1000);
          }
        });

        s.on('force-verdict-update', (data) => {
          setForceVerdictVotes(data.votes);
        });

        s.on('objection-update', (data) => {
          setObjectionCounts(data.objections);
        });

        s.on('verdict-delivered', (data) => {
          setVerdictData(data);
          setCaseData((prev) => prev ? { ...prev, status: 'verdict_delivered' } : prev);
        });

        s.on('user-presence', (data) => {
          setOnlineUsers(data.onlineUsers || []);
        });

        s.on('rate-limited', (data) => {
          setRateLimited(true);
          setError(data.message);
          setTimeout(() => {
            setRateLimited(false);
            setError('');
          }, 3000);
        });

        s.on('error', (data) => {
          setError(data.message);
          setTimeout(() => setError(''), 5000);
        });

        s.on('connect_error', async (err) => {
          console.warn('Socket connection error, refreshing token:', err.message);
          try {
            const token = await api.getAuthToken();
            if (token) {
              s.auth.token = token;
              if (
                err.message === 'Authentication failed' ||
                err.message === 'Invalid token' ||
                err.message === 'No auth token'
              ) {
                s.connect();
              }
            }
          } catch (tokenErr) {
            console.error('Failed to refresh token during reconnect:', tokenErr);
          }
        });

        setSocket(s);
        s.emit('join-courtroom', caseId);
      } catch (err) {
        setError('Failed to connect: ' + err.message);
      }
    }

    connect();

    const timeout = setTimeout(() => {
      if (!s?.connected) {
        setError('Connection timed out. The server may be waking up — try again in a moment.');
      }
    }, 15000);

    return () => {
      clearTimeout(timeout);
      if (s) s.disconnect();
    };
  }, [caseId]);

  const handleForceVerdict = () => {
    if (!socket || myForceVote) return;
    socket.emit('force-verdict-vote');
    setMyForceVote(true);
  };

  const handleObjection = () => {
    if (!socket || !newMessage.trim()) return;
    const myCount = objectionCounts[yourSide] || 0;
    if (myCount >= 2) return;

    socket.emit('send-objection', { content: newMessage.trim() });
    setNewMessage('');
    inputRef.current?.focus();

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      socket.emit('stop-typing');
    }
  };

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

  const handleSend = () => {
    if (!socket || (!newMessage.trim() && !pendingAttachment) || rateLimited) return;
    if (activeTimeout?.target === yourSide) return;

    socket.emit('send-message', {
      content: newMessage.trim() || (pendingAttachment ? `[Evidence: ${pendingAttachment.name}]` : ''),
      attachmentUrl: pendingAttachment?.url || null,
      attachmentType: pendingAttachment?.type || null,
    });
    setNewMessage('');
    setPendingAttachment(null);
    inputRef.current?.focus();

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      socket.emit('stop-typing');
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleInputChange = (e) => {
    setNewMessage(e.target.value);

    if (socket) {
      socket.emit('typing');
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        socket.emit('stop-typing');
      }, 2000);
    }
  };

  const persona = JUDGE_PERSONAS.find((p) => p.id === caseData?.judgePersona);
  const isTimedOut = myTimeoutEnd > Date.now();
  const isVerdictDelivered = caseData?.status === 'verdict_delivered';
  const isSpectator = yourSide === 'spectator';

  // Check if both plaintiff and defendant are currently connected to the socket room
  const isPlaintiffOnline = onlineUsers.includes(caseData?.plaintiff?.id);
  const isDefendantOnline = caseData?.defendant ? onlineUsers.includes(caseData?.defendant.id) : false;
  const bothOnline = isPlaintiffOnline && isDefendantOnline;

  const canSend = connected && !isTimedOut && !isVerdictDelivered && !rateLimited && caseData?.status === 'in_session' && !isSpectator && bothOnline;
  const myObjectionsLeft = isSpectator ? 0 : 2 - (objectionCounts[yourSide] || 0);

  // Tick to clear timeout display
  useEffect(() => {
    if (!myTimeoutEnd) return;
    const remaining = myTimeoutEnd - Date.now();
    if (remaining <= 0) return;
    const timer = setTimeout(() => setMyTimeoutEnd(0), remaining + 100);
    return () => clearTimeout(timer);
  }, [myTimeoutEnd]);

  if (!caseData) {
    if (error) {
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
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-court-dark/40" />
          <p className="text-sm font-medium text-court-dark/50">Entering courtroom...</p>
        </div>
      </div>
    );
  }

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
            {isSpectator && (
              <span className="rounded-lg border border-court-blue bg-court-blue/10 px-2 py-0.5 text-[10px] font-black text-court-blue">
                SPECTATOR MODE
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0 min-w-0">
          {/* Online indicators */}
          <div className="flex items-center gap-1.5 min-w-0">
            <div className="flex items-center gap-1 rounded-lg border border-court-dark/20 px-2 py-1 overflow-hidden max-w-24">
              <div className={`h-2 w-2 shrink-0 rounded-full ${onlineUsers.includes(caseData.plaintiff?.id) ? 'bg-court-green' : 'bg-gray-300'}`} />
              <span className="text-[10px] font-bold truncate">{caseData.plaintiff?.username}</span>
            </div>
            <span className="text-xs font-bold text-court-dark/30 shrink-0">vs</span>
            <div className="flex items-center gap-1 rounded-lg border border-court-dark/20 px-2 py-1 overflow-hidden max-w-24">
              <div className={`h-2 w-2 shrink-0 rounded-full ${onlineUsers.includes(caseData.defendant?.id) ? 'bg-court-green' : 'bg-gray-300'}`} />
              <span className="text-[10px] font-bold truncate">{caseData.defendant?.username}</span>
            </div>
          </div>
          {connected ? (
            <Wifi className="h-4 w-4 text-court-green" />
          ) : (
            <WifiOff className="h-4 w-4 text-court-red" />
          )}
        </div>
      </div>

      {/* Case description bar */}
      <div className="mx-1 mb-2 rounded-lg border border-court-dark/10 bg-court-gold-light/50 px-3 py-2">
        <p className="text-xs line-clamp-2">
          <span className="font-bold">Complaint:</span> {caseData.description}
        </p>
        <p className="text-xs mt-0.5 line-clamp-2">
          <span className="font-bold">Seeks:</span> {caseData.requestedCompensation}
        </p>
      </div>

      {/* Chat messages */}
      <div className="flex-1 overflow-y-auto rounded-xl border-2 border-court-dark bg-court-card shadow-brutal">
        <div className="py-3">
          {chatMessages.length === 0 && !judgeTyping && (
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
            {activeTimeout && (
              <TimeoutBanner timeout={activeTimeout} side={yourSide} />
            )}
          </AnimatePresence>

          <AnimatePresence>
            {judgeTyping && <JudgeTypingIndicator />}
          </AnimatePresence>

          {otherTyping && !judgeTyping && (
            <div className="px-4 py-1">
              <span className="text-[10px] font-medium text-court-dark/40 italic">
                {yourSide === 'plaintiff' ? caseData.defendant?.username : caseData.plaintiff?.username} is typing...
              </span>
            </div>
          )}

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
          {!isSpectator && (
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
          )}
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
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder={
                isSpectator
                  ? 'You are viewing this courtroom as a spectator...'
                  : isTimedOut
                  ? 'You are muted by the judge...'
                  : !connected
                  ? 'Reconnecting...'
                  : caseData?.status !== 'in_session'
                  ? 'Waiting for both parties...'
                  : !bothOnline
                  ? 'Waiting for both parties to connect...'
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
            onClick={handleObjection}
            disabled={!canSend || !newMessage.trim() || myObjectionsLeft <= 0}
            className="btn-brutal bg-court-red/20 border-court-red p-2.5 disabled:opacity-30 disabled:cursor-not-allowed shrink-0 relative"
            title={`Objection! (${myObjectionsLeft} left)`}
          >
            <AlertTriangle className="h-5 w-5 text-court-red" />
            <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full border border-court-red bg-court-card text-[9px] font-black text-court-red">
              {myObjectionsLeft}
            </span>
          </button>
          <button
            onClick={handleSend}
            disabled={!canSend || (!newMessage.trim() && !pendingAttachment)}
            className="btn-brutal bg-court-gold p-2.5 disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
          >
            <Send className="h-5 w-5" />
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
