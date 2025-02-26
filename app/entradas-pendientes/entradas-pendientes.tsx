"use client";

import { useEffect, useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RefreshCcw, Calendar, Truck, ChevronLeft, ChevronRight, Search } from "lucide-react";

interface Entrada {
  id: number;
  numTarima: number;
  fechaEntrada: string;
  trazabilidad: string;
  prodEtiquetaRFID: {
    nombreProducto: string;
    claveProducto: string;
    area: string;
    pesoNeto: number;
    piezas: number;
    rfid: string;
    status: number;
  };
}

export default function EntradasPendientes() {
  const [entradas, setEntradas] = useState<Entrada[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fechaInicio, setFechaInicio] = useState(getTodayDate());
  const [fechaFin, setFechaFin] = useState(getTodayDate());
  const [currentPage, setCurrentPage] = useState<{ [key: number]: number }>({
    2: 1,
    3: 1,
    4: 1,
    8: 1,
  });

  // 🔍 Estado de búsqueda global
  const [searchTerm, setSearchTerm] = useState("");

  const itemsPerPage = 5;

  function getTodayDate() {
    return new Date().toISOString().split("T")[0];
  }

  const construirURL = () => {
    return `http://172.16.10.31/api/ProdExtraInfo/FiltrarTodoEntradaAlmacenPT?fechainicio=${fechaInicio}&fechafin=${fechaFin}`;
  };

  const cargarEntradas = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const url = construirURL();
      console.log("Consultando:", url);

      const response = await fetch(url);
      if (!response.ok) throw new Error("Error al obtener los datos");

      const data: Entrada[] = await response.json();
      console.log("Datos recibidos:", data);

      if (data.length === 0) {
        console.warn("⚠️ La API devolvió un array vacío.");
      }

      setEntradas(data);
    } catch (err) {
      setError("No se pudo obtener la información. Verifica la conexión con el servidor.");
      console.error("Error al cargar datos:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    cargarEntradas();
  }, []);

  // 📌 Agrupar datos por status usando useMemo
  const entradasAgrupadas = useMemo(() => {
    return {
      2: entradas.filter((e) => e.prodEtiquetaRFID?.status === 2),
      3: entradas.filter((e) => e.prodEtiquetaRFID?.status === 3),
      4: entradas.filter((e) => e.prodEtiquetaRFID?.status === 4),
      8: entradas.filter((e) => e.prodEtiquetaRFID?.status === 8),
    } as Record<number, Entrada[]>;
  }, [entradas]);

  // 📌 Función para manejar la paginación
  const handlePageChange = (status: number, newPage: number) => {
    setCurrentPage((prev) => ({ ...prev, [status]: newPage }));
  };

  return (
    <div className="min-h-screen bg-[#153E3E] flex flex-col items-center py-12 px-4">
      <div className="text-center mt-6 mb-10 flex flex-col items-center justify-center">
        <img src="/img/logo_b.png" alt="Logo Bioflex" width={250} height={100} className="object-contain mb-4" />
        <h1 className="text-5xl font-bold text-white tracking-wide uppercase">Entradas Almacén</h1>
      </div>

      {/* 🔍 Barra de búsqueda global */}
      <div className="w-full max-w-2xl bg-white rounded-full px-4 py-2 shadow-md mb-6 flex items-center">
        <Search className="text-gray-500 mr-2" />
        <input
          type="text"
          placeholder="Buscar por producto, código o trazabilidad..."
          className="w-full border-none focus:outline-none px-2 text-gray-700"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* Mostrar Tarimas por Status con paginación */}
      <div className="max-w-6xl w-full grid grid-cols-1 md:grid-cols-2 gap-6">
        {[
          { title: "🟢 Recien Ingresadas", color: "bg-green-100 border-green-500", status: 2 },
          { title: "🔵 Asignación de Ubicación", color: "bg-blue-100 border-blue-500", status: 3 },
          { title: "🟡 Dadas de Alta en SAP", color: "bg-yellow-100 border-yellow-500", status: 4 },
          { title: "🔴 Reproceso", color: "bg-red-100 border-red-500", status: 8 }
        ].map((section) => {
          const totalPages = Math.ceil(entradasAgrupadas[section.status].length / itemsPerPage);
          const startIndex = (currentPage[section.status] - 1) * itemsPerPage;

          // 📌 Filtrar datos por búsqueda solo en la categoría actual
          const filteredData = entradasAgrupadas[section.status].filter((entrada) =>
            entrada.prodEtiquetaRFID.nombreProducto.toLowerCase().includes(searchTerm.toLowerCase()) ||
            entrada.prodEtiquetaRFID.claveProducto.toLowerCase().includes(searchTerm.toLowerCase()) ||
            entrada.trazabilidad.toLowerCase().includes(searchTerm.toLowerCase())
          );

          return (
            <div key={section.title} className={`p-4 rounded-lg shadow-md border-4 ${section.color}`}>
              <h2 className="text-xl font-bold text-gray-700 text-center">{section.title}</h2>
              <p className="text-gray-600 text-center">Total: {filteredData.length}</p>

              <div className="space-y-3 mt-4">
                {filteredData.slice(startIndex, startIndex + itemsPerPage).map((entrada) => (
                  <Card key={entrada.id} className="border border-gray-300 shadow-md">
                    <CardContent className="p-4 text-gray-800">
                      <p><strong>Producto:</strong> {entrada.prodEtiquetaRFID.nombreProducto}</p>
                      <p><strong>Código:</strong> {entrada.prodEtiquetaRFID.claveProducto}</p>
                      <p><strong>Hora de Entrada:</strong> {new Date(entrada.fechaEntrada).toLocaleTimeString()}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Paginación */}
              {totalPages > 1 && (
                <div className="flex justify-center mt-4 space-x-2">
                  <Button disabled={currentPage[section.status] === 1} onClick={() => handlePageChange(section.status, currentPage[section.status] - 1)}><ChevronLeft /></Button>
                  <span>{currentPage[section.status]} / {totalPages}</span>
                  <Button disabled={currentPage[section.status] === totalPages} onClick={() => handlePageChange(section.status, currentPage[section.status] + 1)}><ChevronRight /></Button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
