import { Link } from 'react-router-dom';

export default function Dashboard() {
  return (
    <div style={{ padding: 16 }}>
      <h2>Dashboard</h2>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <Link to="/billing"><button style={{ width: '100%', padding: 16, fontSize: 16 }}>Billing</button></Link>
        <Link to="/upload"><button style={{ width: '100%', padding: 16, fontSize: 16 }}>CSV Upload</button></Link>
        <Link to="/exports"><button style={{ width: '100%', padding: 16, fontSize: 16 }}>Exports</button></Link>
        <Link to="/settings"><button style={{ width: '100%', padding: 16, fontSize: 16 }}>Settings</button></Link>
        <Link to="/credit-notes"><button style={{ width: '100%', padding: 16, fontSize: 16 }}>Credit Notes</button></Link>
      </div>
    </div>
  );
}
