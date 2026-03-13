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

  getCases: () => request('/cases'),
  getCase: (id) => request(`/cases/${id}`),
  createCase: (data) => request('/cases', { method: 'POST', body: JSON.stringify(data) }),
  joinCase: (inviteCode) => request(`/cases/join/${inviteCode}`, { method: 'POST' }),
  requestVerdict: (caseId) => request(`/cases/${caseId}/verdict`, { method: 'POST' }),
  resetCase: (caseId) => request(`/cases/${caseId}/reset`, { method: 'POST' }),

  submitArgument: (caseId, data) =>
    request(`/arguments/${caseId}`, { method: 'POST', body: JSON.stringify(data) }),
  getArguments: (caseId) => request(`/arguments/${caseId}`),
};
