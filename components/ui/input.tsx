import * as React from "react"
import { cn, parseFlexibleNumber } from "@/lib/utils"

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  (
    {
      className,
      type,
      value,
      defaultValue,
      onChange,
      onPaste,
      onKeyDown,
      onFocus,
      onBlur,
      min,
      max,
      step,
      ...props
    },
    ref
  ) => {
    const isNumberType = type === "number";

    // Manage a local string representation when type is "number"
    // to allow entering both comma and dot smoothly without the browser or React stripping them.
    const [localVal, setLocalVal] = React.useState<string>(() => {
      if (value !== undefined && value !== null) return String(value);
      if (defaultValue !== undefined && defaultValue !== null) return String(defaultValue);
      return "";
    });
    const [isFocused, setIsFocused] = React.useState(false);

    // Synchronize external value changes
    React.useEffect(() => {
      if (!isNumberType) return;
      const strVal = value === undefined || value === null ? "" : String(value);
      if (!isFocused) {
        setLocalVal(strVal);
      } else {
        // While focused, only update if the external value numerically diverged (e.g. form reset or external update)
        const localNum = parseFlexibleNumber(localVal);
        const extNum = parseFlexibleNumber(strVal);
        if (localNum !== extNum) {
          setLocalVal(strVal);
        }
      }
    }, [value, isFocused, isNumberType, localVal]);

    if (!isNumberType) {
      return (
        <input
          ref={ref}
          type={type}
          data-slot="input"
          className={cn(
            "file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground dark:bg-input/30 border-input h-9 w-full min-w-0 rounded-md border bg-transparent px-3 py-1 text-base shadow-xs transition-[color,box-shadow] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
            "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",
            "aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
            className
          )}
          value={value}
          defaultValue={defaultValue}
          onChange={onChange}
          onPaste={onPaste}
          onKeyDown={onKeyDown}
          onFocus={onFocus}
          onBlur={onBlur}
          min={min}
          max={max}
          step={step}
          {...props}
        />
      );
    }

    // Number input behavior
    const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
      setIsFocused(true);
      onFocus?.(e);
    };

    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
      setIsFocused(false);
      onBlur?.(e);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      // Allow control keys
      if (["Backspace", "Delete", "Tab", "Escape", "Enter"].includes(e.key)) {
        onKeyDown?.(e);
        return;
      }

      // Allow Ctrl/Cmd shortcuts
      if (e.ctrlKey || e.metaKey) {
        onKeyDown?.(e);
        return;
      }

      // Allow navigation keys
      if (["ArrowLeft", "ArrowRight", "Home", "End"].includes(e.key)) {
        onKeyDown?.(e);
        return;
      }

      // Up/Down arrows to step value
      if (e.key === "ArrowUp" || e.key === "ArrowDown") {
        e.preventDefault();
        const stepVal = typeof step === "number" ? step : parseFloat(step as string) || 1;
        const currentNum = parseFlexibleNumber(localVal);
        const minVal = min !== undefined ? Number(min) : -Infinity;
        const maxVal = max !== undefined ? Number(max) : Infinity;
        const nextNum = e.key === "ArrowUp" ? currentNum + stepVal : currentNum - stepVal;
        const clamped = Math.min(maxVal, Math.max(minVal, nextNum));
        const rounded = parseFloat(clamped.toFixed(4));
        const newStr = String(rounded);
        setLocalVal(newStr);

        const target = e.currentTarget;
        target.value = newStr;
        const event = new Event("input", { bubbles: true });
        target.dispatchEvent(event);
        if (onChange) {
          const synthetic = {
            ...e,
            target,
            currentTarget: target,
          } as unknown as React.ChangeEvent<HTMLInputElement>;
          synthetic.target.value = newStr;
          onChange(synthetic);
        }
        return;
      }

      // Allow minus if min is not >= 0
      if (e.key === "-") {
        const minVal = min !== undefined ? Number(min) : undefined;
        if (minVal !== undefined && minVal >= 0) {
          e.preventDefault();
          return;
        }
        if (localVal.includes("-") && e.currentTarget.selectionStart !== 0) {
          e.preventDefault();
          return;
        }
        onKeyDown?.(e);
        return;
      }

      // Allow decimal comma or period
      if (e.key === "," || e.key === ".") {
        const hasDecimal = localVal.includes(",") || localVal.includes(".");
        const hasSelection = (e.currentTarget.selectionEnd ?? 0) > (e.currentTarget.selectionStart ?? 0);
        if (hasDecimal && !hasSelection) {
          e.preventDefault();
          return;
        }
        onKeyDown?.(e);
        return;
      }

      // Allow digits
      if (/^[0-9]$/.test(e.key)) {
        onKeyDown?.(e);
        return;
      }

      // Block all other keys (letters, scientific 'e', etc.)
      e.preventDefault();
    };

    const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
      const pastedText = e.clipboardData.getData("text");
      if (!pastedText) return;

      e.preventDefault();
      const parsed = parseFlexibleNumber(pastedText);

      // If text has no digits and parses to 0, ignore
      if (parsed === 0 && !/\d/.test(pastedText)) {
        return;
      }

      let textToSet = String(parsed);
      const hasComma = pastedText.includes(",");
      const hasDot = pastedText.includes(".");
      if (hasComma && !hasDot) {
        const parts = pastedText.trim().replace(/^[^0-9-]+/, "").split(",");
        // If comma was used for decimal (not thousands separator)
        if (parts[1] && parts[1].length !== 3) {
          textToSet = textToSet.replace(".", ",");
        }
      } else if (hasComma && hasDot && pastedText.lastIndexOf(",") > pastedText.lastIndexOf(".")) {
        textToSet = textToSet.replace(".", ",");
      }

      setLocalVal(textToSet);

      const target = e.currentTarget;
      target.value = textToSet;
      const event = new Event("input", { bubbles: true });
      target.dispatchEvent(event);
      if (onChange) {
        const synthetic = {
          ...e,
          target,
          currentTarget: target,
        } as unknown as React.ChangeEvent<HTMLInputElement>;
        synthetic.target.value = textToSet;
        onChange(synthetic);
      }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = e.target.value;
      setLocalVal(val);
      onChange?.(e);
    };

    return (
      <input
        ref={ref}
        type="text"
        inputMode="decimal"
        autoComplete="off"
        data-slot="input"
        className={cn(
          "file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground dark:bg-input/30 border-input h-9 w-full min-w-0 rounded-md border bg-transparent px-3 py-1 text-base shadow-xs transition-[color,box-shadow] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
          "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",
          "aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
          className
        )}
        value={localVal}
        onChange={handleChange}
        onPaste={handlePaste}
        onKeyDown={handleKeyDown}
        onFocus={handleFocus}
        onBlur={handleBlur}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";

export { Input }
