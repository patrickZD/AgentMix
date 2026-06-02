import * as RadixSwitch from "@radix-ui/react-switch";
import { cn } from "@/lib/utils";

// Project-local Switch primitive replacing MUI's Switch.
// Radix-based; uses onCheckedChange(checked) instead of MUI's onChange(event).
interface SwitchProps {
  checked: boolean;
  onCheckedChange?: (checked: boolean) => void;
  disabled?: boolean;
  className?: string;
}

export default function Switch({ checked, onCheckedChange, disabled, className }: SwitchProps) {
  return (
    <RadixSwitch.Root
      checked={checked}
      onCheckedChange={onCheckedChange}
      disabled={disabled}
      className={cn(
        "relative inline-flex h-[18px] w-[32px] shrink-0 cursor-pointer items-center rounded-full border border-transparent transition-colors",
        "bg-muted-foreground/40 data-[state=checked]:bg-[var(--am-green)]",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
    >
      <RadixSwitch.Thumb className="block h-[14px] w-[14px] translate-x-[2px] rounded-full bg-white shadow transition-transform data-[state=checked]:translate-x-[16px]" />
    </RadixSwitch.Root>
  );
}
