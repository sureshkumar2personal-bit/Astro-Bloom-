import { Navigate, useLocation } from 'react-router-dom';

export default function ProtectedRoute({ children, allowedRoles = ['user', 'astrologer'] }) {
  const token = localStorage.getItem('accessToken') || sessionStorage.getItem('accessToken');
  const { pathname } = useLocation();

  if (!token) {
    if (pathname.startsWith('/astrologer')) return <Navigate to="/astrologer/login" replace />;
    return <Navigate to="/user/login" replace />;
  }

  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    if (payload.exp && payload.exp * 1000 < Date.now()) {
         const hasRefresh = !!localStorage.getItem('refreshToken') || !!sessionStorage.getItem('refreshToken');
      if (!hasRefresh) {
         localStorage.removeItem('accessToken');
         sessionStorage.removeItem('accessToken');
        if (pathname.startsWith('/astrologer')) return <Navigate to="/astrologer/login" replace />;
        return <Navigate to="/user/login" replace />;
      }
    }
  } catch {}

  return children;
}
