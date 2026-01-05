import { BrowserRouter, Routes, Route } from 'react-router-dom';

import PixelApp from './PixelApp';
import AdminDashboard from './components/AdminDashboard';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<PixelApp />} />
        <Route path="/admin" element={<AdminDashboard />} />
      </Routes>
    </BrowserRouter>
  );
}
