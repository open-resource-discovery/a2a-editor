import { useState } from "react";
import { Link } from "react-router-dom";
import { Moon, Sun, Menu, X } from "lucide-react";
import { Button } from "@lib/components/ui/button";
import { useTheme } from "@lib/hooks/useTheme";

const base = import.meta.env.BASE_URL;

export function AppHeader() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const toggleTheme = () => {
    setTheme(resolvedTheme === "dark" ? "light" : "dark");
  };

  const navLinks = [
    { to: "/", label: "Home" },
    { to: "/playground", label: "Playground" },
    { to: "/docs", label: "Documentation" },
  ];

  return (
    <header className="flex h-14 items-center justify-between border-b bg-background px-4">
      <Link to="/" className="flex items-center gap-2 text-lg font-bold">
        <img src={`${base}images/small-light.svg`} alt="A2A Logo" className="h-6 w-auto dark:hidden" />
        <img src={`${base}images/small-dark.svg`} alt="A2A Logo" className="hidden h-6 w-auto dark:block" />
        <span className="text-sm sm:text-lg">A2A Editor</span>
      </Link>

      {/* Desktop nav */}
      <nav className="hidden sm:flex items-center gap-4">
        {navLinks.map((link) => (
          <Link
            key={link.to}
            to={link.to}
            className="text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            {link.label}
          </Link>
        ))}
        <Button variant="ghost" size="icon" onClick={toggleTheme}>
          {resolvedTheme === "dark" ? (
            <Sun className="h-5 w-5" />
          ) : (
            <Moon className="h-5 w-5" />
          )}
          <span className="sr-only">Toggle theme</span>
        </Button>
      </nav>

      {/* Mobile nav */}
      <div className="flex sm:hidden items-center gap-2">
        <Button variant="ghost" size="icon" onClick={toggleTheme}>
          {resolvedTheme === "dark" ? (
            <Sun className="h-5 w-5" />
          ) : (
            <Moon className="h-5 w-5" />
          )}
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          <span className="sr-only">Toggle menu</span>
        </Button>
      </div>

      {/* Mobile menu dropdown */}
      {mobileMenuOpen && (
        <div className="absolute top-14 left-0 right-0 z-50 border-b bg-background sm:hidden">
          <nav className="flex flex-col p-4 gap-2">
            {navLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className="text-sm py-2 px-3 rounded-md text-muted-foreground transition-colors hover:text-foreground hover:bg-accent"
                onClick={() => setMobileMenuOpen(false)}
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
      )}
    </header>
  );
}
