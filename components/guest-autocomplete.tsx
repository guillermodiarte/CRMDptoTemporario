"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { Phone, CreditCard, User } from "lucide-react";

interface GuestSuggestion {
  guestName: string;
  guestPhone: string | null;
  guestDni: string | null;
}

interface GuestAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onSelectGuest?: (guest: GuestSuggestion) => void;
  placeholder?: string;
  className?: string;
  id?: string;
}

export function GuestAutocomplete({
  value,
  onChange,
  onSelectGuest,
  placeholder = "Nombre completo",
  className,
  id,
}: GuestAutocompleteProps) {
  const [suggestions, setSuggestions] = useState<GuestSuggestion[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Prevents re-fetching after a guest is selected via click/keyboard
  const justSelected = useRef(false);

  const fetchSuggestions = useCallback(async (query: string) => {
    if (!query || query.trim().length === 0) {
      setSuggestions([]);
      setIsOpen(false);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/reservations/guests?q=${encodeURIComponent(query.trim())}`);
      if (res.ok) {
        const data: GuestSuggestion[] = await res.json();
        setSuggestions(data);
        setIsOpen(data.length > 0);
        setHighlightedIndex(-1);
      }
    } catch {
      setSuggestions([]);
      setIsOpen(false);
    } finally {
      setLoading(false);
    }
  }, []);

  // Debounced search — skips fetch right after a selection
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (justSelected.current) {
      // Selection just happened: skip this fetch cycle but allow future ones
      justSelected.current = false;
      return;
    }
    debounceRef.current = setTimeout(() => {
      fetchSuggestions(value);
    }, 200);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [value, fetchSuggestions]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (guest: GuestSuggestion) => {
    justSelected.current = true; // block next useEffect fetch
    onChange(guest.guestName);
    onSelectGuest?.(guest);
    setIsOpen(false);
    setSuggestions([]);
    setHighlightedIndex(-1);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen || suggestions.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev < suggestions.length - 1 ? prev + 1 : prev));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : 0));
    } else if (e.key === "Enter" && highlightedIndex >= 0) {
      e.preventDefault();
      handleSelect(suggestions[highlightedIndex]);
    } else if (e.key === "Escape") {
      setIsOpen(false);
      setHighlightedIndex(-1);
    }
  };

  return (
    <div ref={containerRef} className="relative w-full">
      <Input
        ref={inputRef}
        id={id}
        placeholder={placeholder}
        className={className}
        value={value}
        onChange={(e) => {
          justSelected.current = false; // user is typing manually again
          onChange(e.target.value);
        }}
        onKeyDown={handleKeyDown}
        onFocus={() => {
          if (suggestions.length > 0 && value.trim().length > 0) setIsOpen(true);
        }}
        autoComplete="off"
      />

      {isOpen && suggestions.length > 0 && (
        <div
          className="absolute z-50 left-0 right-0 top-full mt-1 rounded-lg border border-border bg-popover shadow-xl overflow-hidden"
          style={{ maxHeight: "220px", overflowY: "auto" }}
        >
          {suggestions.map((guest, index) => (
            <button
              key={index}
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                handleSelect(guest);
              }}
              onMouseEnter={() => setHighlightedIndex(index)}
              className={cn(
                "w-full text-left px-4 py-2.5 flex flex-col gap-0.5 transition-colors cursor-pointer border-b border-border/50 last:border-b-0",
                highlightedIndex === index
                  ? "bg-accent text-accent-foreground"
                  : "hover:bg-accent/60 text-popover-foreground"
              )}
            >
              <span className="flex items-center gap-1.5 font-medium text-sm">
                <User className="w-3.5 h-3.5 shrink-0 text-muted-foreground" />
                {guest.guestName}
              </span>
              {(guest.guestPhone || guest.guestDni) && (
                <span className="flex items-center gap-3 text-xs text-muted-foreground pl-5">
                  {guest.guestPhone && (
                    <span className="flex items-center gap-1">
                      <Phone className="w-3 h-3" />
                      {guest.guestPhone}
                    </span>
                  )}
                  {guest.guestDni && (
                    <span className="flex items-center gap-1">
                      <CreditCard className="w-3 h-3" />
                      {guest.guestDni}
                    </span>
                  )}
                </span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
