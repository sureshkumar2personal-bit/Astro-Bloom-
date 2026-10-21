import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import AppRoutes from './routes/AppRoutes';
import './styles/variables.css';
import './styles/base.css';
import './styles/common.css';
import './styles/pages.css';
import './styles/astrologer.css';
import './styles/media.css';

createRoot(document.getElementById('root')).render(
  <BrowserRouter>
    <AppRoutes />
  </BrowserRouter>
);
