"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  AlertCircle,
  Loader2,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import InteractiveParticles from "@/components/interactive-particles";
import { ClaimCpDialog } from "@/components/claim-cp-dialog";
import { trackEvent } from "@/lib/analytics";

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [showClaimDialog, setShowClaimDialog] = useState(false);

  const isValidUsername =
    username.length >= 2 &&
    username.length <= 30 &&
    /^[a-zA-Z0-9_]+$/.test(username);
  const isValidEmail = email.includes("@") && email.includes(".");
  const isValidPassword = password.length >= 6;
  const canSubmit = isValidUsername && isValidEmail && isValidPassword;

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;

    setError(null);
    setIsSubmitting(true);

    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, username, password }),
      });

      const data = await res.json();

      if (res.ok) {
        setSuccess(true);
        // Track signup completion with gclid if available
        let gclid: string | null = null;
        try { gclid = sessionStorage.getItem("gclid"); } catch {}
        trackEvent("signup_complete", {
          funnel_stage: "demand",
          method: "email",
          ...(gclid ? { gclid } : {}),
        });
        // Don't show claim dialog — user needs to confirm email first
      } else {
        setError(data.error || "Registration failed. Please try again.");
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden">
      <div className="absolute inset-0 mesh-gradient" />
      <InteractiveParticles count={50} className="absolute inset-0" />

      <ClaimCpDialog
        open={showClaimDialog}
        onOpenChange={(open) => {
          setShowClaimDialog(open);
          if (!open) router.push("/login");
        }}
      />

      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="z-10 w-full max-w-md px-4"
      >
        <Card className="neon-card">
          <CardHeader className="text-center space-y-4">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
              className="mx-auto text-5xl"
            >
              {success ? "🎉" : "🤖"}
            </motion.div>
            <div>
              <CardTitle className="text-2xl font-black">
                {success ? "Check Your Email!" : "Join The Chaos"}
              </CardTitle>
              <CardDescription className="mt-2">
                {success
                  ? `We sent a confirmation link to ${email}. Click it to activate your account.`
                  : "30 seconds. No wallet. No crypto knowledge. Just vibes."}
              </CardDescription>
            </div>
          </CardHeader>

          <AnimatePresence mode="wait">
            {success ? (
              <motion.div
                key="success"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="px-6 pb-6 text-center space-y-3"
              >
                <CheckCircle2 className="w-8 h-8 text-primary mx-auto" />
                <p className="text-sm text-muted-foreground">
                  Didn&apos;t get the email? Check your spam folder, or{" "}
                  <Link href="/login" className="text-primary hover:underline">
                    try logging in
                  </Link>.
                </p>
              </motion.div>
            ) : (
              <motion.div key="form">
                <CardContent>
                  <form onSubmit={handleSignup} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="you@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        autoComplete="email"
                        required
                        className="text-base"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="username">Username</Label>
                      <Input
                        id="username"
                        placeholder="trader_supreme"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        maxLength={30}
                        autoComplete="off"
                        required
                        className="text-base"
                      />
                      <p className="text-xs text-muted-foreground">
                        2-30 characters. Letters, numbers, and underscores only.
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="password">Password</Label>
                      <Input
                        id="password"
                        type="password"
                        placeholder="Min 6 characters"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        minLength={6}
                        autoComplete="new-password"
                        required
                        className="text-base"
                      />
                    </div>

                    <Button
                      type="submit"
                      disabled={!canSubmit || isSubmitting}
                      className="w-full h-12 text-base font-semibold"
                      size="lg"
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin" />
                          Creating Account...
                        </>
                      ) : (
                        "Create Account"
                      )}
                    </Button>

                    <AnimatePresence>
                      {error && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm"
                        >
                          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                          <span>{error}</span>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    <p className="text-center text-sm text-muted-foreground">
                      Already have an account?{" "}
                      <Link
                        href="/login"
                        className="text-primary hover:underline"
                      >
                        Log in
                      </Link>
                    </p>
                  </form>
                </CardContent>
              </motion.div>
            )}
          </AnimatePresence>
        </Card>
      </motion.div>
    </div>
  );
}
