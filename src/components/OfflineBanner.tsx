import useOnlineStatus from '@/lib/hooks/useOnlineStatus';

export default function OfflineBanner() {
  const online = useOnlineStatus();
  if (online) return null;
  return (
    <div style={{ background: '#fffae6', color: '#7a5900', padding: 10, textAlign: 'center', fontWeight: 600 }}>
      Offline: Finalize is disabled until you're online.
    </div>
  );
}
