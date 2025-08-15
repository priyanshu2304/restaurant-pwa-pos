import { Route, Routes, Navigate } from "react-router-dom";
import Login from "./routes/Login";
import Dashboard from "./routes/Dashboard";
import Billing from "./routes/Billing";
import CsvUpload from "./routes/CsvUpload";
import Settings from "./routes/Settings";
import Exports from "./routes/Exports";
import CreditNotes from "./routes/CreditNotes";
import PrintPreview from "./routes/PrintPreview";
import Guard from "./components/Guard";
import NavBar from "./components/NavBar";
import OfflineBanner from "./components/OfflineBanner";
import MenuPage from "./routes/Menu";

export default function App() {
  return (
    <div style={{ maxWidth: 640, margin: "0 auto", paddingBottom: 72 }}>
      <OfflineBanner />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route element={<Guard />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/billing" element={<Billing />} />
          <Route path="/menu" element={<MenuPage />} />
          <Route path="/upload" element={<CsvUpload />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/exports" element={<Exports />} />
          <Route path="/credit-notes" element={<CreditNotes />} />
          <Route path="/print" element={<PrintPreview />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <NavBar />
    </div>
  );
}
