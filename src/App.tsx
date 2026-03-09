import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Toaster } from "sonner";
import { HomePage } from "./demo/pages/HomePage";
import { PlaygroundPage } from "./demo/pages/PlaygroundPage";
import { DocumentationPage } from "./demo/pages/DocumentationPage";
import { AppHeader } from "./demo/layout/AppHeader";
import { OAuthCallback } from "./lib/components/OAuthCallback";
import { ThemeRoot } from "./lib/components/ThemeRoot";
import "./index.css";

// Base path for GitHub Pages - must match vite.config.ts base
const basename = import.meta.env.BASE_URL;

function App() {
  return (
    <BrowserRouter basename={basename}>
      <ThemeRoot className="flex h-screen flex-col">
        <Routes>
          {/* OAuth callback route - no header for popup */}
          <Route path="/oauth/callback" element={<OAuthCallback />} />
          {/* Main app routes with header */}
          <Route
            path="*"
            element={
              <>
                <AppHeader />
                <main className="flex-1 overflow-hidden">
                  <Routes>
                    <Route path="/" element={<HomePage />} />
                    <Route path="/playground" element={<PlaygroundPage />} />
                    <Route path="/docs" element={<DocumentationPage />} />
                  </Routes>
                </main>
              </>
            }
          />
        </Routes>
        <Toaster />
      </ThemeRoot>
    </BrowserRouter>
  );
}

export default App;
