import { cn } from "@/lib/utils";

function Badge({
  className,
  tone = "default",
  ...props
}: React.ComponentProps<"span"> & { tone?: "default" | "sage" | "rose" | "accent" }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
        tone === "default" && "bg-surface text-muted",
        tone === "sage" && "bg-sage/12 text-sage",
        tone === "rose" && "bg-rose/12 text-rose",
        tone === "accent" && "bg-accent/10 text-accent",
        className,
      )}
      {...props}
    />
  );
}

export { Badge };
