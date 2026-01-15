'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { authenticate } from '@/app/lib/actions';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function LoginForm() {
  const [errorMessage, dispatch, isPending] = useActionState(authenticate, undefined);

  return (
    <Card className="mx-auto max-w-sm">
      <CardHeader>
        <CardTitle className="text-2xl">Iniciar Sesión</CardTitle>
        <CardDescription>
          Ingrese su email para acceder al sistema
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={dispatch} className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              name="email"
              placeholder="admin@example.com"
              required
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="password">Contraseña</Label>
            <Input id="password" type="password" name="password" required />
          </div>
          {errorMessage && (
            <div className="text-red-500 text-sm">{errorMessage}</div>
          )}
          <LoginButton />
        </form>
      </CardContent>
    </Card>
  );
}

function LoginButton() {
  const { pending } = useFormStatus();

  return (
    <Button className="w-full" type="submit" disabled={pending}>
      {pending ? 'Ingresando...' : 'Ingresar'}
    </Button>
  );
}
