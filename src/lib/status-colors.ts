// Single source of truth for arena status badge colors
// Uses theme-aware classes that work in both light and dark mode

export const statusColors: Record<string, string> = {
  upcoming: "bg-primary/20 text-primary border-primary/30",
  active: "bg-primary/20 text-primary border-primary/30",
  completed: "bg-muted text-muted-foreground border-border/30",
  cancelled: "bg-destructive/20 text-destructive border-destructive/30",
};

export const riskColors: Record<string, string> = {
  conservative: "bg-primary/20 text-primary",
  balanced: "bg-primary/20 text-primary",
  aggressive: "bg-secondary/20 text-secondary",
  degen: "bg-destructive/20 text-destructive",
};
