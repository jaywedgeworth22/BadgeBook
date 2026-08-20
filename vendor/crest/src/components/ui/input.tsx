import * as React from "react";
import { cn } from "@/lib/utils";

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      className={cn(
        "flex h-11 w-full rounded-md border border-line bg-elevated px-3 text-base text-ink outline-none transition-[border-color,box-shadow] placeholder:text-subtle focus:border-accent focus:ring-2 focus:ring-accent/20 disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
}

export { Input };
