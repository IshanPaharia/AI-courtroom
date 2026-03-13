export function cn(...classes) {
  return classes.filter(Boolean).join(' ');
}

export function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function formatTime(dateString) {
  const date = new Date(dateString);
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function getInitials(name) {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export function getStatusColor(status) {
  const map = {
    pending_defendant: 'bg-court-gold text-court-dark',
    opening_statements: 'bg-court-blue text-white',
    rebuttals: 'bg-court-blue text-white',
    closing_arguments: 'bg-court-blue text-white',
    judging: 'bg-court-gold text-court-dark',
    verdict_delivered: 'bg-court-green text-white',
    appealed: 'bg-court-red text-white',
  };
  return map[status] || 'bg-gray-200 text-gray-800';
}
