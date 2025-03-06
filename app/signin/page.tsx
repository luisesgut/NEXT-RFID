"use client";

import { useState, useEffect } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import axios from "axios";
import { Loader2, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";

export default function SignIn() {
  const [users, setUsers] = useState<{ id: number; name: string; password: string }[]>([]);
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  // Cargar usuarios desde la API
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const response = await axios.get("http://172.16.10.31/api/OperadoresRFID");
        const operadores = response.data.map((op: any) => ({
          id: op.id,
          name: op.nombreOperador,
          password: op.claveOperador, // Para comparación (no se mostrará en UI)
        }));
        setUsers(operadores);
      } catch (error) {
        console.error("Error cargando usuarios:", error);
      }
    };

    fetchUsers();
  }, []);

  // Manejo de inicio de sesión
  const handleLogin = async () => {
    setLoading(true);
    setError(null);
  
    const response = await signIn("credentials", {
      username: selectedUser,
      password: password,
      redirect: false, // 🔄 Evitamos que NextAuth redirija automáticamente
    });
  
    if (response?.error) {
      setError("Credenciales incorrectas. Inténtalo de nuevo.");
      setLoading(false);
    } else {
      console.log("Redirigiendo a Dashboard...");
      router.push("/dashboard"); // 🔄 Hacer la redirección manualmente
    }
  };
  

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-[#153E3E] to-[#0d2b2b] p-6">
      {/* Logo fuera del cuadro blanco */}
      <img src="/img/logo_b.png" alt="Logo Bioflex" className="h-24 mb-6" />

      {/* Formulario */}
      <div className="bg-white shadow-lg rounded-lg p-8 w-full max-w-md">
        {/* Título */}
        <h2 className="text-2xl font-bold text-center text-[#153E3E] mb-6">
          Iniciar Sesión
        </h2>

        {/* ComboBox de usuario */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Selecciona tu usuario:
          </label>
          <Select onValueChange={setSelectedUser}>
            <SelectTrigger className="w-full border-2 border-[#e1a21b] rounded-lg text-gray-700 font-medium px-4 py-2 bg-white">
              <SelectValue placeholder="Seleccionar usuario" />
            </SelectTrigger>
            <SelectContent>
              {users.map((user) => (
                <SelectItem key={user.id} value={user.name}>
                  {user.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Input de contraseña */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Contraseña:
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full border-2 border-[#e1a21b] rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#153E3E] text-gray-700"
            placeholder="Ingrese su contraseña"
          />
        </div>

        {/* Mostrar error si las credenciales son incorrectas */}
        {error && <p className="text-red-500 text-sm mb-4">{error}</p>}

        {/* Botón de inicio de sesión */}
        <Button
          onClick={handleLogin}
          disabled={!selectedUser || !password || loading}
          className={`w-full flex items-center justify-center gap-2 text-white font-bold px-4 py-3 rounded-lg transition-all 
            ${loading ? "bg-gray-400 cursor-not-allowed" : "bg-[#e1a21b] hover:bg-[#c08609]"}`}
        >
          {loading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" /> Cargando...
            </>
          ) : (
            <>
              <LogIn className="w-5 h-5" /> Iniciar Sesión
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
