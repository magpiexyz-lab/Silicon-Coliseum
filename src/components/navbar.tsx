"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  LayoutDashboard,
  Swords,
  Coins,
  Bot,
  Trophy,
  Shield,
  Menu,
  LogOut,
  ChevronDown,
  Plus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import ThemeToggle from "@/components/theme-toggle";
import { useAuth } from "@/components/auth-provider";
import { ConnectWalletButton } from "@/components/connect-wallet-button";
import { BuyCpDialog } from "@/components/buy-cp-dialog";

const navLinks = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/arenas", label: "Arenas", icon: Swords },
  { href: "/tokens", label: "Tokens", icon: Coins },
  { href: "/agents", label: "Your Agents", icon: Bot },
  { href: "/leaderboard", label: "Leaderboard", icon: Trophy },
];

export function Navbar() {
  const pathname = usePathname();
  const { user, cpBalance, isAdmin, isLoggedIn, isLoading, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [buyCpOpen, setBuyCpOpen] = useState(false);

  // Don't show navbar on landing page when not logged in
  const isLanding = pathname === "/";

  return (
    <header className="fixed top-0 left-0 right-0 z-50 glass border-b border-border/30">
      <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="text-lg font-black shimmer-text shrink-0">
          Silicon Coliseum
        </Link>

        {isLoading ? (
          <div className="flex items-center gap-2">
            <ThemeToggle />
          </div>
        ) : isLoggedIn ? (
          <>
            {/* Desktop nav */}
            <nav className="hidden md:flex items-center gap-1 ml-8">
              {navLinks.map((link) => {
                const isActive =
                  pathname === link.href ||
                  (link.href !== "/dashboard" &&
                    pathname.startsWith(link.href));
                return (
                  <Link key={link.href} href={link.href}>
                    <Button
                      variant={isActive ? "secondary" : "ghost"}
                      size="sm"
                      className={`gap-1.5 text-sm ${isActive ? "font-semibold" : ""}`}
                    >
                      <link.icon className="w-3.5 h-3.5" />
                      {link.label}
                    </Button>
                  </Link>
                );
              })}
              {isAdmin && (
                <Link href="/admin">
                  <Button
                    variant={pathname.startsWith("/admin") ? "secondary" : "ghost"}
                    size="sm"
                    className="gap-1.5 text-sm"
                  >
                    <Shield className="w-3.5 h-3.5" />
                    Admin
                  </Button>
                </Link>
              )}
            </nav>

            {/* Right side */}
            <div className="flex items-center gap-2 ml-auto">
              {/* CP Balance + Buy — always visible */}
              <div className="flex items-center gap-1 px-2 sm:px-3 py-1.5 rounded-full glass text-sm font-medium">
                <Coins className="w-3.5 h-3.5 text-primary" />
                <span className="tabular-nums">{cpBalance.toLocaleString()}</span>
                <span className="hidden sm:inline">CP</span>
                <button
                  onClick={() => setBuyCpOpen(true)}
                  className="ml-0.5 p-0.5 rounded-full hover:bg-primary/20 transition-colors"
                  title="Buy CP with SOL"
                >
                  <Plus className="w-3 h-3 text-primary" />
                </button>
              </div>

              {/* Wallet Connect */}
              <div className="hidden sm:block">
                <ConnectWalletButton />
              </div>

              <ThemeToggle />

              {/* Buy CP Dialog */}
              <BuyCpDialog open={buyCpOpen} onOpenChange={setBuyCpOpen} />

              {/* User dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="gap-1.5">
                    <span className="hidden sm:inline text-sm">
                      {user?.username}
                    </span>
                    <ChevronDown className="w-3.5 h-3.5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={logout}>
                    <LogOut className="w-3.5 h-3.5 mr-2" />
                    Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Mobile hamburger */}
              <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="sm" className="md:hidden">
                    <Menu className="w-5 h-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="w-64">
                  <SheetHeader>
                    <SheetTitle className="gradient-text">Menu</SheetTitle>
                  </SheetHeader>
                  <nav className="flex flex-col gap-1 mt-6">
                    {navLinks.map((link) => {
                      const isActive =
                        pathname === link.href ||
                        (link.href !== "/dashboard" &&
                          pathname.startsWith(link.href));
                      return (
                        <Link
                          key={link.href}
                          href={link.href}
                          onClick={() => setMobileOpen(false)}
                        >
                          <Button
                            variant={isActive ? "secondary" : "ghost"}
                            className="w-full justify-start gap-2"
                          >
                            <link.icon className="w-4 h-4" />
                            {link.label}
                          </Button>
                        </Link>
                      );
                    })}
                    {isAdmin && (
                      <Link
                        href="/admin"
                        onClick={() => setMobileOpen(false)}
                      >
                        <Button
                          variant={
                            pathname.startsWith("/admin")
                              ? "secondary"
                              : "ghost"
                          }
                          className="w-full justify-start gap-2"
                        >
                          <Shield className="w-4 h-4" />
                          Admin
                        </Button>
                      </Link>
                    )}
                  </nav>
                </SheetContent>
              </Sheet>
            </div>
          </>
        ) : (
          /* Not logged in */
          <div className="flex items-center gap-2">
            <ThemeToggle />
            {!isLanding && (
              <Link href="/login">
                <Button variant="ghost" size="sm">
                  Login
                </Button>
              </Link>
            )}
            <Link href="/signup">
              <Button size="sm">Enter the Arena</Button>
            </Link>
          </div>
        )}
      </div>
    </header>
  );
}
