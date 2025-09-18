// src/main.jsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from "react-router-dom";

import App from './App.jsx';
import './index.css';

// If you truly use AuthContext, keep it. Otherwise remove the import + wrapper.
import { AuthProvider } from "./context/AuthContext"; // <- remove if you don't have it

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>   {/* remove this line and the closing one if you don't use it */}
        <App />
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);
