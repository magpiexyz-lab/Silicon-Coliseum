"use client";

import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { TokenInfo } from "@/lib/types";

interface CreateAgentFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  walletAddress: string;
  onCreated: () => void;
}

export default function CreateAgentForm({
  open,
  onOpenChange,
  walletAddress,
  onCreated,
}: CreateAgentFormProps) {
  const [tokens, setTokens] = useState<TokenInfo[]>([]);
  const [name, setName] = useState("");
  const [riskLevel, setRiskLevel] = useState("balanced");
  const [budget, setBudget] = useState("1000");
  const [selectedTokens, setSelectedTokens] = useState<string[]>([]);
  const [personality, setPersonality] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/tokens")
      .then((r) => r.json())
      .then((d) => {
        setTokens(d.tokens || d || []);
        setSelectedTokens((d.tokens || d || []).map((t: TokenInfo) => t.symbol));
      })
      .catch(() => {});
  }, []);

  function toggleToken(symbol: string) {
    setSelectedTokens((prev) =>
      prev.includes(symbol)
        ? prev.filter((s) => s !== symbol)
        : [...prev, symbol]
    );
  }

  async function handleSubmit() {
    setError(null);
    if (name.length < 2 || name.length > 30) {
      setError("Name must be 2-30 characters");
      return;
    }
    if (selectedTokens.length === 0) {
      setError("Select at least one token");
      return;
    }
    const budgetNum = parseFloat(budget);
    if (isNaN(budgetNum) || budgetNum < 10 || budgetNum > 100000) {
      setError("Budget must be $10 - $100,000");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/agents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          risk_level: riskLevel,
          initial_budget: budgetNum,
          tokens: selectedTokens,
          personality: personality || undefined,
        }),
      });

      if (res.ok) {
        setName("");
        setBudget("1000");
        setPersonality("");
        setRiskLevel("balanced");
        onCreated();
      } else {
        const data = await res.json();
        setError(data.error || "Failed to create agent");
      }
    } catch {
      setError("Network error");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create AI Agent</DialogTitle>
          <DialogDescription>
            Deploy a new autonomous trading agent
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="agent-name">Agent Name</Label>
            <Input
              id="agent-name"
              placeholder="AlphaHunter"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={30}
            />
          </div>

          <div className="space-y-2">
            <Label>Risk Level</Label>
            <Select value={riskLevel} onValueChange={setRiskLevel}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="conservative">Conservative</SelectItem>
                <SelectItem value="balanced">Balanced</SelectItem>
                <SelectItem value="aggressive">Aggressive</SelectItem>
                <SelectItem value="degen">Degen</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {riskLevel === "conservative" &&
                "Focus on established tokens, small positions, high confidence threshold"}
              {riskLevel === "balanced" &&
                "Mix of established and trending, moderate positions"}
              {riskLevel === "aggressive" &&
                "Trend-chasing, larger positions, lower confidence threshold"}
              {riskLevel === "degen" &&
                "Maximum risk, massive positions, trades on any signal"}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="budget">Initial Budget (USD)</Label>
            <Input
              id="budget"
              type="number"
              min={10}
              max={100000}
              value={budget}
              onChange={(e) => setBudget(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Tokens to Trade ({selectedTokens.length} selected)</Label>
            <div className="flex flex-wrap gap-2">
              {tokens.map((token) => (
                <button
                  key={token.symbol}
                  type="button"
                  onClick={() => toggleToken(token.symbol)}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-colors border ${
                    selectedTokens.includes(token.symbol)
                      ? "bg-primary/20 border-primary/50 text-primary"
                      : "bg-muted/30 border-border/30 text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {token.symbol}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="personality">
              Personality (optional)
            </Label>
            <Textarea
              id="personality"
              placeholder="Custom instructions for your agent's behavior..."
              value={personality}
              onChange={(e) => setPersonality(e.target.value)}
              rows={3}
            />
          </div>

          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Creating...
              </>
            ) : (
              "Deploy Agent"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
