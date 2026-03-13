import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { Menu, X } from "lucide-react";

const navItems = [
  { to: "/", label: "Home" },
  { to: "/team-samenstellen", label: "Stel je team samen" },
  { to: "/uitslagen", label: "Uitslagen" },
  { to: "/mijn-team", label: "Mijn Ploeg" },
  { to: "/regels", label: "Spelregels" },
];

export default function Layout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="border-b-2 border-foreground bg-card">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <Link to="/" className="flex items-center gap-2">
              <span className="text-2xl">🚴</span>
              <span className="font-display text-xl font-bold tracking-tight">
                Wieler<span className="text-accent">spel</span>
              </span>
            </Link>

            {/* Desktop nav */}
            <nav className="hidden md:flex items-center gap-1">
              {navItems.map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  className={cn(
                    "px-3 py-2 text-sm font-medium rounded-md transition-colors",
                    location.pathname === item.to
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-secondary text-foreground"
                  )}
                >
                  {item.label}
                </Link>
              ))}
            </nav>

            <div className="hidden md:flex items-center gap-2">
              <Link
                to="/login"
                className="px-4 py-2 text-sm font-medium border-2 border-foreground rounded-md hover:bg-secondary transition-colors"
              >
                Inloggen
              </Link>
            </div>

            {/* Mobile hamburger */}
            <button
              className="md:hidden p-2"
              onClick={() => setMobileOpen(!mobileOpen)}
            >
              {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>

          {/* Mobile nav */}
          {mobileOpen && (
            <nav className="md:hidden pb-4 space-y-1">
              {navItems.map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  onClick={() => setMobileOpen(false)}
                  className={cn(
                    "block px-3 py-2 text-sm font-medium rounded-md transition-colors",
                    location.pathname === item.to
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-secondary text-foreground"
                  )}
                >
                  {item.label}
                </Link>
              ))}
              <Link
                to="/login"
                onClick={() => setMobileOpen(false)}
                className="block px-3 py-2 text-sm font-medium border-2 border-foreground rounded-md hover:bg-secondary transition-colors text-center mt-2"
              >
                Inloggen
              </Link>
            </nav>
          )}
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1">{children}</main>

      {/* Footer */}
      <footer className="border-t-2 border-foreground bg-card py-8">
        <div className="container mx-auto px-4">
          <div className="vintage-divider mb-6" />
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
            <p className="font-serif italic">
              "La course en tête" — Het wielerspel waar jij de ploegleider bent.
            </p>
            <p className="font-sans">© 2025 Wielerspel</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
