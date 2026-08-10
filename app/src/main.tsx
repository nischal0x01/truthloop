import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

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

// One client for the whole app. Defaults are fine for a 48h hackathon —
// auth queries manage their own staleTime / retry in the contexts.
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
      refetchOnWindowFocus: true,
    },
  },
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </StrictMode>
);
