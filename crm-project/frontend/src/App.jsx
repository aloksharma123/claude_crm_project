import { Routes, Route, Navigate } from "react-router-dom";
import { isAuthenticated } from "./api";
import Sidebar from "./components/Sidebar.jsx";
import Login from "./pages/Login.jsx";
import Signup from "./pages/Signup.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import Contacts from "./pages/Contacts.jsx";
import ContactDetail from "./pages/ContactDetail.jsx";
import Companies from "./pages/Companies.jsx";
import Deals from "./pages/Deals.jsx";

function ProtectedLayout({ children }) {
  if (!isAuthenticated()) return <Navigate to="/login" replace />;
  return (
    <div className="app-shell">
      <Sidebar />
      <main className="main-content">{children}</main>
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/" element={<ProtectedLayout><Dashboard /></ProtectedLayout>} />
      <Route path="/deals" element={<ProtectedLayout><Deals /></ProtectedLayout>} />
      <Route path="/contacts" element={<ProtectedLayout><Contacts /></ProtectedLayout>} />
      <Route path="/contacts/:id" element={<ProtectedLayout><ContactDetail /></ProtectedLayout>} />
      <Route path="/companies" element={<ProtectedLayout><Companies /></ProtectedLayout>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
