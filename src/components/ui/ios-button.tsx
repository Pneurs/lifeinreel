import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const iosButtonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap font-semibold transition-all duration-200 active:scale-95 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        primary:
          "bg-primary text-primary-foreground shadow-md hover:opacity-90",
        secondary:
          "bg-secondary/10 text-secondary hover:bg-secondary/20",
        ghost:
          "text-primary hover:bg-primary/10",
        outline:
          "border-2 border-primary text-primary bg-transparent hover:bg-primary/5",
        soft:
          "bg-accent text-accent-foreground hover:bg-accent/80",
        danger:
          "bg-destructive text-destructive-foreground hover:opacity-90",
      },
      size: {
        sm: "h-10 px-4 text-sm rounded-xl",
        md: "h-12 px-6 text-base rounded-2xl",
        lg: "h-14 px-8 text-lg rounded-2xl",
        icon: "h-12 w-12 rounded-full",
        iconLg: "h-16 w-16 rounded-full",
      },
      fullWidth: {
        true: "w-full",
        false: "",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
      fullWidth: false,
    },
  }
);

export interface IOSButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof iosButtonVariants> {}

const IOSButton = React.forwardRef<HTMLButtonElement, IOSButtonProps>(
  ({ className, variant, size, fullWidth, ...props }, ref) => {
    return (
      <button
        className={cn(iosButtonVariants({ variant, size, fullWidth, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
IOSButton.displayName = "IOSButton";

export { IOSButton, iosButtonVariants };
