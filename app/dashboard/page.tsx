"use client";

import { Card, CardContent } from "@/components/ui/card";
import { useRouter } from "next/navigation";
import { Truck, Settings, Camera } from "lucide-react";
import { BarChart } from "lucide-react"; // 📊 Importar el icono


export default function Dashboard() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-[#153E3E] flex flex-col items-center py-12 px-4">
      {/* Logo y título */}
      <div className="text-center mb-10">
        <img src="/img/logo_b.png" alt="Logo Bioflex" width={250} height={100} className="object-contain mx-auto mb-4" />
        <h1 className="text-5xl font-bold text-white tracking-wide uppercase">PANEL DE ENTRADAS AUTOMÁTICAS</h1>
      </div>

      {/* Contenedor de opciones */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl w-full">
        {/* Entradas Automáticas */}
        <Card onClick={() => router.push("/")} className="cursor-pointer border-4 border-green-500 hover:bg-green-600 transition-all duration-200">
          <CardContent className="flex flex-col items-center p-6">
            <Truck className="text-green-500 w-16 h-16 mb-4" />
            <h2 className="text-2xl font-bold text-black-100">Entradas Automáticas</h2>
            <p className="text-black-300 text-center mt-2">Gestión automática de entradas con RFID.</p>
          </CardContent>
        </Card>

        {/* Gestionar Entradas */}
        <Card onClick={() => router.push("/entradas-pendientes")} className="cursor-pointer border-4 border-yellow-500 hover:bg-yellow-600 transition-all duration-200">
          <CardContent className="flex flex-col items-center p-6">
            <Settings className="text-yellow-500 w-16 h-16 mb-4" />
            <h2 className="text-2xl font-bold text-black-100">Gestionar Entradas</h2>
            <p className="text-black-300 text-center mt-2">Consulta y asigna operadores.</p>
          </CardContent>
        </Card>

        {/* Tarima Faltante (En desarrollo) */}
        <Card onClick={() => router.push("/camera")} className="cursor-pointer border-4 border-red-500 hover:bg-red-600 transition-all duration-200">
          <CardContent className="flex flex-col items-center p-6">
            <Camera className="text-red-500 w-16 h-16 mb-4" />
            <h2 className="text-2xl font-bold text-black-100">Tarima Faltante</h2>
            <p className="text-gray-300 text-center mt-2">Escaneo manual</p>
          </CardContent>
        </Card>
        {/* Graficos (En desarrollo) */}
<Card className="border-4 border-red-500 opacity-50 cursor-not-allowed">
  <CardContent className="flex flex-col items-center p-6">
    <BarChart className="text-red-500 w-16 h-16 mb-4" /> {/* 📊 Icono de gráficas */}
    <h2 className="text-2xl font-bold text-black-100">Reporte Diario Entradas</h2>
    <p className="text-gray-300 text-center mt-2">Gráficos de Entradas (Próximamente).</p>
  </CardContent>
</Card>
      </div>
    </div>
  );
}
