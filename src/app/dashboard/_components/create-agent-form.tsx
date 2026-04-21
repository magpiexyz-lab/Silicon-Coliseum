"use client";

import { useState } from "react";
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
  const [name, setName] = useState("");
  const [riskLevel, setRiskLevel] = useState("balanced");
  const [personality, setPersonality] = useState("");
  const [strategyDescription, setStrategyDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    setError(null);
    if (name.length < 2 || name.length > 30) {
      setError("Name must be 2-30 characters");
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
          personality: personality || undefined,
          strategy_description: strategyDescription || undefined,
        }),
      });

      if (res.ok) {
        setName("");
        setPersonality("");
        setStrategyDescription("");
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
            Deploy a new autonomous trading agent for arena competitions
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
            <Label htmlFor="strategy-description">
              Strategy Description
            </Label>
            <Textarea
              id="strategy-description"
              placeholder="Describe your agent's trading strategy (e.g., 'Buy dips on high-volume tokens, sell when momentum fades')..."
              value={strategyDescription}
              onChange={(e) => setStrategyDescription(e.target.value)}
              rows={3}
            />
            <p className="text-xs text-muted-foreground">
              Guide your agent&apos;s decision-making with a strategy description
            </p>
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
