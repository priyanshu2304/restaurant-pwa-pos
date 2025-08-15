import { NavLink } from "react-router-dom";

const linkStyle: React.CSSProperties = {
  flex: 1,
  textAlign: "center",
  padding: "10px 6px",
  fontSize: 14,
};
const wrap: React.CSSProperties = {
  position: "fixed",
  bottom: 0,
  left: 0,
  right: 0,
  display: "flex",
  borderTop: "1px solid #ddd",
  background: "#fff",
};

export default function NavBar() {
  return (
    <nav style={wrap} className="noprint">
      <NavLink to="/" style={linkStyle}>
        Dashboard
      </NavLink>
      <NavLink to="/menu" style={linkStyle}>
        Menu
      </NavLink>{" "}
      {/* <-- new */}
      <NavLink to="/billing" style={linkStyle}>
        Billing
      </NavLink>
      <NavLink to="/upload" style={linkStyle}>
        CSV Upload
      </NavLink>
      <NavLink to="/exports" style={linkStyle}>
        Exports
      </NavLink>
      <NavLink to="/settings" style={linkStyle}>
        Settings
      </NavLink>
    </nav>
  );
}
