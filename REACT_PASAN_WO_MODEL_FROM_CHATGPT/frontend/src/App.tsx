import { Navigate, Route, Routes } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Employees from './pages/Employees';
import EmployeeView from './pages/EmployeeView';
import EmployeeForm from './pages/EmployeeForm';
import Login from './pages/Login';
import { currentUser } from './services/auth';

function Protected() {
  if (!currentUser()) {
    return <Navigate to="/login" replace />;
  }
  return <Layout />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      <Route element={<Protected />}>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/employees" element={<Employees />} />
        <Route path="/employees/new" element={<EmployeeForm />} />
        <Route path="/employees/:id" element={<EmployeeView />} />
        <Route path="/employees/:id/edit" element={<EmployeeForm />} />
      </Route>

      <Route path="*" element={<Navigate to={currentUser() ? '/dashboard' : '/login'} replace />} />
    </Routes>
  );
}
