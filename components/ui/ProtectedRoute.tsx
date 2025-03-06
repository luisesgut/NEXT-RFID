"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { ReactNode, useEffect } from "react";

interface ProtectedRouteProps {
  children: ReactNode;
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/signin"); // Redirigir si no hay sesión
    }
  }, [status, router]);

  if (status === "loading") {
    return <p className="text-center text-gray-400">Cargando...</p>; //  Mensaje mientras se carga la sesión
  }

  return session ? <>{children}</> : null;
}
