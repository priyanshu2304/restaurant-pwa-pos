export const isOnline = () => (typeof navigator !== 'undefined' ? navigator.onLine : true);
