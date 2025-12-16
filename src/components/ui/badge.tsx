import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary text-primary-foreground hover:bg-primary/80 shadow-sm",
        secondary: "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
        destructive: "border-transparent bg-destructive/10 text-destructive border-destructive/30 hover:bg-destructive/20",
        outline: "text-foreground border-border/50 bg-background/50",
        warning: "border-transparent bg-warning/10 text-warning border-warning/30 hover:bg-warning/20",
        success: "border-transparent bg-success/10 text-success border-success/30 hover:bg-success/20",
        accent: "border-transparent bg-accent text-accent-foreground shadow-sm hover:bg-accent/90",
        gradient: "border-transparent bg-gradient-primary text-white shadow-sm",
        muted: "border-border/50 bg-muted text-muted-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };