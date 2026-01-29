import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { ClerkProvider } from '@clerk/clerk-react';
import { dark } from '@clerk/themes';
import { ThemeProvider, useTheme } from './shared/ThemeContext.jsx';
import App from './App.jsx';
import './index.css';

const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

if (!PUBLISHABLE_KEY) {
  console.error("Missing Publishable Key. Please add VITE_CLERK_PUBLISHABLE_KEY to your .env file.");
}

/**
 * A wrapper component that consumes the theme context 
 * and applies the appropriate Clerk theme dynamically.
 */
const ClerkWithTheme = ({ children }) => {
  const { theme } = useTheme();
  const isDark = theme === 'Dark';

  return (
    <ClerkProvider
      publishableKey={PUBLISHABLE_KEY}
      afterSignOutUrl="/sign-in"
      appearance={{
        baseTheme: isDark ? dark : undefined,
        variables: {
          colorPrimary: '#06b6d4', // Matches your "ocean" theme primary cyan
        },
      }}
    >
      {children}
    </ClerkProvider>
  );
};

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ThemeProvider>
      <ClerkWithTheme>
        <App />
      </ClerkWithTheme>
    </ThemeProvider>
  </StrictMode>
);
