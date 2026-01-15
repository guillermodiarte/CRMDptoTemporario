"use client";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { CircleUser } from "lucide-react";
import { signOut } from "next-auth/react";

interface UserMenuProps {
  user: {
    image?: string | null;
    name?: string | null;
    email?: string | null;
  } | null;
}

export function UserMenu({ user }: UserMenuProps) {
  const userImage = user?.image;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="secondary" size="icon" className="rounded-full overflow-hidden">
          {userImage ? (
            <img src={userImage} alt="Avatar" className="h-full w-full object-cover" />
          ) : (
            <CircleUser className="h-5 w-5" />
          )}
          <span className="sr-only">Toggle user menu</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>Mi Cuenta</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {/* Settings and Support removed as requested */}
        <DropdownMenuItem onClick={() => signOut({ callbackUrl: "/login" })}>
          Cerrar Sesión
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
