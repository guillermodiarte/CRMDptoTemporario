"use client"

import * as React from "react"
import * as SwitchPrimitive from "@radix-ui/react-switch"

import { Check, X } from "lucide-react"

import { cn } from "@/lib/utils"

function Switch({
  className,
  ...props
}: React.ComponentProps<typeof SwitchPrimitive.Root>) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      className={cn(
        "group peer inline-flex h-7 w-14 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50",
        "data-[state=checked]:bg-green-400 data-[state=unchecked]:bg-rose-400",
        className
      )}
      {...props}
    >
      {/* Absolute positioned icons inside the track */}
      <div className="absolute inset-0 flex items-center justify-between px-2 pointer-events-none">
        <Check className="h-4 w-4 text-green-700 font-bold opacity-0 transition-opacity duration-200 group-data-[state=checked]:opacity-100" />
        <X className="h-4 w-4 text-rose-700 font-bold opacity-100 transition-opacity duration-200 group-data-[state=checked]:opacity-0" />
      </div>

      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className={cn(
          "pointer-events-none block h-6 w-6 rounded-full bg-white shadow-lg ring-0 transition-transform data-[state=checked]:translate-x-7 data-[state=unchecked]:translate-x-0"
        )}
      />
    </SwitchPrimitive.Root>
  )
}

export { Switch }
