import { BrowserRouter, Routes, Route } from 'react-router-dom';

import PixelApp from './PixelApp'; // your existing grid app
import AdminDashboard from './components/AdminDashboard';

export default function PixelApp() {
  // SAME grid code, unchanged
}
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<PixelApp />} />
        <Route path="/admin" element={<AdminDashboard />} />
      </Routes>
    </BrowserRouter>
  );
}
