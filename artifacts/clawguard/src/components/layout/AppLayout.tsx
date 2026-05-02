import React from "react";
import { Link, useLocation } from "wouter";
import { Shield, Activity, AlertTriangle, Database } from "lucide-react";
import { cn } from "@/lib/utils";

interface LayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: LayoutProps) {
  const [location] = useLocation();

  const navItems = [
    { href: "/", label: "DASHBOARD", icon: Activity },
    { href: "/alerts", label: "ALERTS", icon: AlertTriangle },
    { href: "/stats", label: "STATS", icon: Database },
  ];

  return (
    <div className="min-h-screen w-full flex flex-col bg-background text-foreground dark">
      <header className="sticky top-0 z-50 w-full border-b border-border/50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="container flex h-14 items-center">
          <div className="flex items-center gap-2 mr-8">
            <Shield className="h-6 w-6 text-primary" />
            <span className="font-bold text-lg tracking-tight text-primary">
              CLAWGUARD
            </span>
          </div>
          
          <nav className="flex items-center gap-6 text-sm font-medium">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "transition-colors hover:text-primary flex items-center gap-2 py-4 border-b-2",
                  location === item.href
                    ? "border-primary text-primary glow-cyan-text"
                    : "border-transparent text-muted-foreground"
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      </header>
      <main className="flex-1 container py-8">
        {children}
      </main>
    </div>
  );
}