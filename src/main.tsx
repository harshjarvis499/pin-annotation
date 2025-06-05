import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { PDFProvider } from './contexts/PDFContext';
import { PrimeReactProvider } from 'primereact/api';
import "primereact/resources/themes/lara-light-cyan/theme.css";

createRoot(document.getElementById('root')!).render(

  <StrictMode>
    <PrimeReactProvider>
      <PDFProvider>
        <App />
      </PDFProvider>
    </PrimeReactProvider>
  </StrictMode>
);