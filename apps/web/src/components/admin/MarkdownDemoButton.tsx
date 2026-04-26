import { Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";

type MarkdownDemoButtonProps = {
  label?: string;
  onFill: () => void;
  disabled?: boolean;
  variant?: "secondary" | "outline" | "ghost";
};

/**
 * Sustituye el contenido del campo por un texto de demostración (Markdown, sin bloques de código).
 */
export function MarkdownDemoButton({
  label = "Texto de demostración",
  onFill,
  disabled,
  variant = "outline",
}: MarkdownDemoButtonProps) {
  return (
    <Button type="button" variant={variant} size="sm" onClick={onFill} disabled={disabled}>
      <Wand2 className="h-3.5 w-3.5" />
      {label}
    </Button>
  );
}
