import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

// Fonts (Latin subset only — keeps the bundle small).
// Primary face: ABC Favorit (Gumroad signature, paid).
// Free fallbacks stacked behind it so the page is never a system default:
//   - Raleway for display/headings (geometric, elegant, similar weight to ABC Favorit)
//   - Poppins for body sans (workhorse, broad weight range)
//   - Inter as the final fallback (broadest language coverage, neutral tone)
// When ABC Favorit is licensed, drop the .woff2 files in app/public/fonts/
// and add a @font-face rule above these imports so the rest act as fallbacks.
import '@fontsource/raleway/400.css';
import '@fontsource/raleway/500.css';
import '@fontsource/raleway/600.css';
import '@fontsource/raleway/700.css';
import '@fontsource/poppins/400.css';
import '@fontsource/poppins/500.css';
import '@fontsource/poppins/600.css';
import '@fontsource/poppins/700.css';
import '@fontsource/inter/400.css';
import '@fontsource/inter/500.css';
import '@fontsource/inter/600.css';
import '@fontsource/inter/700.css';

import './index.css';
import App from './App';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
