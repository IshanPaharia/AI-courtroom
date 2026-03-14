const BASE = '/api';

async function request(path, options = {}) {
  const token = await window.Clerk?.session?.getToken();

  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Request failed: ${res.status}`);
  }

  return res.json();
}

export const api = {
  getMe: () => request('/users/me'),
  updateMe: (data) => request('/users/me', { method: 'PATCH', body: JSON.stringify(data) }),
  getMyStats: () => request('/users/me/stats'),
  recalcStats: () => request('/users/me/recalc', { method: 'POST' }),
  getLeaderboard: () => request('/users/leaderboard/rankings'),

  getCases: () => request('/cases'),
  getCase: (id) => request(`/cases/${id}`),
  createCase: (data) => request('/cases', { method: 'POST', body: JSON.stringify(data) }),
  joinCase: (inviteCode) => request(`/cases/join/${inviteCode}`, { method: 'POST' }),
  requestVerdict: (caseId) => request(`/cases/${caseId}/verdict`, { method: 'POST' }),
  resetCase: (caseId) => request(`/cases/${caseId}/reset`, { method: 'POST' }),

  appealCase: (caseId) => request(`/cases/${caseId}/appeal`, { method: 'POST' }),
  getAppeal: (caseId) => request(`/cases/${caseId}/appeal`),

  submitArgument: (caseId, data) =>
    request(`/arguments/${caseId}`, { method: 'POST', body: JSON.stringify(data) }),
  getArguments: (caseId) => request(`/arguments/${caseId}`),

  getCourtroom: (caseId) => request(`/courtroom/${caseId}`),
  pollCourtroom: (caseId, after) =>
    request(`/courtroom/${caseId}/poll${after ? `?after=${encodeURIComponent(after)}` : ''}`),
  sendCourtroomMessage: (caseId, data) =>
    request(`/courtroom/${caseId}/message`, { method: 'POST', body: JSON.stringify(data) }),
  forceVerdict: (caseId) =>
    request(`/courtroom/${caseId}/force-verdict`, { method: 'POST' }),

  getAuthToken: async () => window.Clerk?.session?.getToken(),
};
