import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-xl font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        // 主按钮 - 梅红填充
        default: "bg-accent text-white hover:bg-accent/90 active:scale-[0.98]",
        
        // 次按钮 - neutral-2 填充
        secondary: "bg-neutral-2 text-neutral-9 hover:bg-neutral-3 active:scale-[0.98] ring-1 ring-neutral-5",
        
        // 幽灵按钮
        ghost: "hover:bg-neutral-2 text-neutral-8",
        
        // 轮廓按钮
        outline: "ring-1 ring-neutral-5 bg-transparent hover:bg-neutral-2 text-neutral-9",
        
        // 危险按钮
        destructive: "bg-error text-white hover:bg-error/90",
        
        // 链接
        link: "text-accent underline-offset-4 hover:underline",
      },
      size: {
        sm: "h-8 px-3 text-copy-13",
        md: "h-10 px-4 text-copy-13",
        lg: "h-12 px-6 text-copy-14",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "md",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
