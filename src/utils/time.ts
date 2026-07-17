export const getServerTime = async (): Promise<number> => {
  try {
    const res = await fetch('https://worldtimeapi.org/api/timezone/Asia/Baghdad');
    const data = await res.json();
    return new Date(data.utc_datetime).getTime();
  } catch (e) {
    return Date.now();
  }
};

export const formatDateTime = (timestamp?: number | string | Date | null) => {
  if (!timestamp) return '---';
  const d = new Date(timestamp);
  if (isNaN(d.getTime())) return '---';
  return d.toLocaleString('en-US', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
    timeZone: 'Asia/Baghdad'
  });
};

export const formatDate = (timestamp?: number | string | Date | null) => {
  if (!timestamp) return '---';
  const d = new Date(timestamp);
  if (isNaN(d.getTime())) return '---';
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    timeZone: 'Asia/Baghdad'
  });
};
