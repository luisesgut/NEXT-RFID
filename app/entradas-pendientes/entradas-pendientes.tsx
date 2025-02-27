"use client";

import { useEffect, useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RefreshCcw, Calendar, ChevronLeft, ChevronRight, Search, CheckCircle2, XCircle, Filter, Clock, ArrowLeft } from "lucide-react";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox"; 
import { Badge } from "@/components/ui/badge";
import axios from "axios";
import { useRouter } from "next/navigation";

interface Entrada {
  id: number;
  numTarima: number;
  fechaEntrada: string;
  operadorEntrada: string | null;
  trazabilidad: string;
  prodEtiquetaRFID: {
    nombreProducto: string;
    claveProducto: string;
    area: string;
    pesoNeto: number;
    piezas: number;
    rfid: string;
    status: number;
    operador: string;
  };
}

interface Operador {
  id: number;
  rfiD_Operador: string;
  nombreOperador: string;
}

const STATUS_LABELS: Record<number, string> = {
  2: "Recién Ingresadas",
  3: "Asignación de Ubicación",
  4: "Dadas de Alta en SAP",
  8: "Reproceso"
};

export default function EntradasPendientes() {
  const router = useRouter();
  const [entradas, setEntradas] = useState<Entrada[]>([]);
  const [filteredEntradas, setFilteredEntradas] = useState<Entrada[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fechaInicio, setFechaInicio] = useState(getTodayDate());
  const [fechaFin, setFechaFin] = useState(getTodayDate());
  const [searchTerm, setSearchTerm] = useState("");
  const [operators, setOperators] = useState<Operador[]>([]);
  const [selectedOperator, setSelectedOperator] = useState<{ [key: number]: string }>({});
  const [confirmingOperator, setConfirmingOperator] = useState<number | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  // Filtros
  const [selectedStatus, setSelectedStatus] = useState<number[]>([]);
  const [pendingOperatorOnly, setPendingOperatorOnly] = useState(false);
  const [filterOperators, setFilterOperators] = useState<string[]>([]);
  
  // Nuevo: Filtros por hora
  const [horaInicio, setHoraInicio] = useState("00:00");
  const [horaFin, setHoraFin] = useState("23:59");
  const [filtrarPorHora, setFiltrarPorHora] = useState(false);

  const handleGoBack = () => {
    router.push("/dashboard"); // 🔀 Primero redirigir
    setTimeout(() => {
      window.location.reload(); // 🔄 Luego recargar al llegar a Dashboard
    }, 300); // 🕐 Pequeño retraso para que la redirección se complete
  };

  // Función para actualizar la página
  const handleRefresh = () => {
    window.location.reload();
  };

  function getTodayDate() {
    return new Date().toISOString().split("T")[0];
  }

  function formatDateForAPI(dateString: string): string {
    return dateString.replace(/-/g, '/');
  }

  useEffect(() => {
    cargarEntradas();
    fetchOperators();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [entradas, searchTerm, selectedStatus, pendingOperatorOnly, filterOperators, filtrarPorHora, horaInicio, horaFin]);

  const construirURL = () => {
    const formattedFechaInicio = formatDateForAPI(fechaInicio);
    const formattedFechaFin = formatDateForAPI(fechaFin);
    return `http://172.16.10.31/api/ProdExtraInfo/FiltrarTodoEntradaAlmacenPT?fechainicio=${formattedFechaInicio}&fechafin=${formattedFechaFin}`;
  };

  const cargarEntradas = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await axios.get(construirURL());
      setEntradas(response.data);
      setFilteredEntradas(response.data);
    } catch (error) {
      setError("No se pudo obtener la información.");
      console.error("Error al cargar datos:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchOperators = async () => {
    try {
      const response = await axios.get("http://172.16.10.31/api/OperadoresRFID");
      setOperators(response.data);
    } catch (error) {
      console.error("Error al obtener operadores:", error);
    }
  };

  const registerAntennaRecord = async (epc: string, epcOperador: string) => {
    try {
      console.log("Registrando antena:", epc, epcOperador);
      const url = `http://172.16.10.31/api/ProdRegistroAntenas?epcOperador=${epcOperador}&epc=${epc}`;
      const response = await axios.post(url);

      if (response.status !== 200) {
        throw new Error(`Error en el registro: ${response.statusText}`);
      }

      return { success: true };
    } catch (error) {
      console.error("Error al registrar antena:", error);
      return { success: false, message: "Error al registrar operador." };
    }
  };

  const confirmOperatorSelection = async (entradaId: number) => {
    if (!selectedOperator[entradaId]) return;

    const entrada = entradas.find((e) => e.id === entradaId);
    if (!entrada) return;

    setConfirmingOperator(entradaId);

    try {
      const postResult = await registerAntennaRecord(entrada.prodEtiquetaRFID.rfid, selectedOperator[entradaId]);
      if (!postResult.success) throw new Error(postResult.message);

      const operatorDetails = operators.find((op) => op.rfiD_Operador === selectedOperator[entradaId]);
      if (!operatorDetails) throw new Error("No se encontró el operador en la lista.");

      const updatedEntradas = entradas.map((e) =>
        e.id === entradaId
          ? { ...e, operadorEntrada: operatorDetails.nombreOperador }
          : e
      );

      setEntradas(updatedEntradas);
      applyFilters(updatedEntradas);
    } catch (error) {
      console.error("Error al asignar operador:", error);
    } finally {
      setConfirmingOperator(null);
    }
  };

  const applyFilters = (dataToFilter = entradas) => {
    let filtered = [...dataToFilter];

    // Filtrar por término de búsqueda
    if (searchTerm) {
      const searchTermLower = searchTerm.toLowerCase();
      filtered = filtered.filter(
        entrada => 
          entrada.prodEtiquetaRFID.nombreProducto.toLowerCase().includes(searchTermLower) ||
          entrada.prodEtiquetaRFID.claveProducto.toLowerCase().includes(searchTermLower) ||
          entrada.trazabilidad.toLowerCase().includes(searchTermLower)
      );
    }

    // Filtrar por status
    if (selectedStatus.length > 0) {
      filtered = filtered.filter(entrada => 
        selectedStatus.includes(entrada.prodEtiquetaRFID.status)
      );
    }

    // Filtrar por operador pendiente
    if (pendingOperatorOnly) {
      filtered = filtered.filter(entrada => entrada.operadorEntrada === null);
    }

    // Filtrar por operadores seleccionados
    if (filterOperators.length > 0) {
      filtered = filtered.filter(entrada => {
        if (entrada.operadorEntrada === null) return false;
        return filterOperators.includes(entrada.operadorEntrada);
      });
    }

    // Nuevo: Filtrar por rango de horas
    if (filtrarPorHora) {
      const horaInicioMinutos = convertirHoraAMinutos(horaInicio);
      const horaFinMinutos = convertirHoraAMinutos(horaFin);
      
      filtered = filtered.filter(entrada => {
        const fechaHora = new Date(entrada.fechaEntrada);
        const horaEntradaMinutos = fechaHora.getHours() * 60 + fechaHora.getMinutes();
        
        return horaEntradaMinutos >= horaInicioMinutos && horaEntradaMinutos <= horaFinMinutos;
      });
    }

    setFilteredEntradas(filtered);
  };

  const convertirHoraAMinutos = (hora: string): number => {
    const [horas, minutos] = hora.split(':').map(Number);
    return horas * 60 + minutos;
  };

  const handleStatusChange = (status: number) => {
    setSelectedStatus(prev => 
      prev.includes(status) 
      ? prev.filter(s => s !== status) 
      : [...prev, status]
    );
  };

  const handleOperatorFilterChange = (operatorName: string) => {
    setFilterOperators(prev => 
      prev.includes(operatorName) 
      ? prev.filter(op => op !== operatorName) 
      : [...prev, operatorName]
    );
  };

  const handleApplyDateFilter = () => {
    cargarEntradas();
  };

  const getStatusBadge = (status: number) => {
    const statusColors: Record<number, string> = {
      2: "bg-blue-100 text-blue-800",
      3: "bg-yellow-100 text-yellow-800",
      4: "bg-green-100 text-green-800",
      8: "bg-red-100 text-red-800",
    };
    
    return (
      <div className={`inline-block px-2 py-1 rounded-full text-xs font-semibold ${statusColors[status] || "bg-gray-100 text-gray-800"}`}>
        {STATUS_LABELS[status] || `Status ${status}`}
      </div>
    );
  };

  // Obtener lista única de operadores asignados para el filtro
  const getUniqueOperators = () => {
    const uniqueOperators = new Set<string>();
    
    entradas.forEach(entrada => {
      if (entrada.operadorEntrada) {
        uniqueOperators.add(entrada.operadorEntrada);
      }
    });
    
    return Array.from(uniqueOperators).sort();
  };

  const uniqueOperatorsList = useMemo(getUniqueOperators, [entradas]);

  return (
    <div className="min-h-screen bg-[#153E3E] flex flex-col items-center py-12 px-4">
      {/* Botón de regreso y encabezado */}
      <div className="w-full max-w-6xl flex justify-between mb-4">
        <Button
          onClick={handleGoBack}
          className="bg-[#1E3A8A] hover:bg-[#1A2E6B] text-white font-bold px-6 py-2 rounded-lg flex items-center gap-2"
        >
          <ArrowLeft className="w-5 h-5" /> Regresar al Dashboard
        </Button>
        
        {/* Nuevo botón de actualizar */}
        <Button
          onClick={handleRefresh}
          className="bg-[#1E5F8A] hover:bg-[#1A4F6B] text-white font-bold px-6 py-2 rounded-lg flex items-center gap-2"
        >
          <RefreshCcw className="w-5 h-5" /> Actualizar
        </Button>
      </div>

      <div className="text-center mt-2 mb-8 flex flex-col items-center justify-center">
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
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => setShowFilters(!showFilters)} 
          className="ml-2 text-gray-500 hover:text-gray-700"
        >
          <Filter size={20} />
          {(selectedStatus.length > 0 || pendingOperatorOnly || filterOperators.length > 0 || filtrarPorHora) && (
            <span className="ml-1 bg-blue-500 text-white rounded-full text-xs w-5 h-5 flex items-center justify-center">
              {selectedStatus.length + (pendingOperatorOnly ? 1 : 0) + (filterOperators.length > 0 ? 1 : 0) + (filtrarPorHora ? 1 : 0)}
            </span>
          )}
        </Button>
      </div>

      {/* Sección de Filtros */}
      {showFilters && (
        <div className="w-full max-w-2xl bg-white rounded-lg p-4 shadow-md mb-6">
          <div className="flex justify-between items-center mb-3">
            <h3 className="font-bold text-lg text-gray-800">Filtros</h3>
            {(selectedStatus.length > 0 || pendingOperatorOnly || filterOperators.length > 0 || filtrarPorHora) && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => {
                  setSelectedStatus([]);
                  setPendingOperatorOnly(false);
                  setFilterOperators([]);
                  setFiltrarPorHora(false);
                  setHoraInicio("00:00");
                  setHoraFin("23:59");
                }}
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                Limpiar filtros
              </Button>
            )}
          </div>
          
          {/* Filtro por Fecha */}
          <div className="mb-4">
            <p className="font-semibold text-sm text-gray-700 mb-2">Rango de Fechas:</p>
            <div className="flex space-x-2 items-center">
              <div className="flex items-center">
                <span className="text-sm text-gray-600 mr-2">Desde:</span>
                <input
                  type="date"
                  value={fechaInicio}
                  onChange={(e) => setFechaInicio(e.target.value)}
                  className="border rounded px-2 py-1 text-sm"
                />
              </div>
              <div className="flex items-center">
                <span className="text-sm text-gray-600 mr-2">Hasta:</span>
                <input
                  type="date"
                  value={fechaFin}
                  onChange={(e) => setFechaFin(e.target.value)}
                  className="border rounded px-2 py-1 text-sm"
                />
              </div>
              <Button 
                size="sm" 
                onClick={handleApplyDateFilter}
                className="bg-green-500 hover:bg-green-600 ml-2"
              >
                Aplicar
              </Button>
            </div>
          </div>
          
          {/* Nuevo: Filtro por Hora */}
          <div className="mb-4">
            <div className="flex items-center mb-2">
              <Checkbox 
                id="filtrar-por-hora" 
                checked={filtrarPorHora}
                onCheckedChange={(checked) => setFiltrarPorHora(!!checked)}
              />
              <label htmlFor="filtrar-por-hora" className="ml-2 font-semibold text-sm text-gray-700">
                Filtrar por rango de horas:
              </label>
            </div>
            <div className="flex space-x-4 items-center ml-6">
              <div className="flex items-center">
                <Clock size={16} className="text-gray-500 mr-2" />
                <span className="text-sm text-gray-600 mr-2">Desde:</span>
                <input
                  type="time"
                  value={horaInicio}
                  onChange={(e) => setHoraInicio(e.target.value)}
                  className="border rounded px-2 py-1 text-sm"
                  disabled={!filtrarPorHora}
                />
              </div>
              <div className="flex items-center">
                <Clock size={16} className="text-gray-500 mr-2" />
                <span className="text-sm text-gray-600 mr-2">Hasta:</span>
                <input
                  type="time"
                  value={horaFin}
                  onChange={(e) => setHoraFin(e.target.value)}
                  className="border rounded px-2 py-1 text-sm"
                  disabled={!filtrarPorHora}
                />
              </div>
            </div>
          </div>
          
          {/* Filtro por Status */}
          <div className="mb-4">
            <p className="font-semibold text-sm text-gray-700 mb-2">Status:</p>
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(STATUS_LABELS).map(([status, label]) => (
                <div key={status} className="flex items-center">
                  <Checkbox 
                    id={`status-${status}`} 
                    checked={selectedStatus.includes(Number(status))}
                    onCheckedChange={() => handleStatusChange(Number(status))}
                  />
                  <label htmlFor={`status-${status}`} className="ml-2 text-sm font-medium">
                    {label}
                  </label>
                </div>
              ))}
            </div>
          </div>
          
          {/* Filtro por Operador */}
          <div className="mb-4">
            <p className="font-semibold text-sm text-gray-700 mb-2">Por operador asignado:</p>
            <div className="max-h-40 overflow-y-auto border rounded-md p-2">
              {uniqueOperatorsList.length > 0 ? (
                uniqueOperatorsList.map((operatorName) => (
                  <div key={operatorName} className="flex items-center mb-1">
                    <Checkbox 
                      id={`operator-${operatorName.replace(/\s+/g, '')}`} 
                      checked={filterOperators.includes(operatorName)}
                      onCheckedChange={() => handleOperatorFilterChange(operatorName)}
                    />
                    <label htmlFor={`operator-${operatorName.replace(/\s+/g, '')}`} className="ml-2 text-sm font-medium truncate">
                      {operatorName}
                    </label>
                  </div>
                ))
              ) : (
                <p className="text-sm text-gray-500 italic">No hay operadores asignados</p>
              )}
            </div>
          </div>
          
          {/* Filtro por Operador Pendiente */}
          <div>
            <div className="flex items-center">
              <Checkbox 
                id="pending-operator" 
                checked={pendingOperatorOnly}
                onCheckedChange={(checked) => {
                  setPendingOperatorOnly(!!checked);
                  if (checked) {
                    // Si se activa "pendientes", desactivar cualquier filtro por operador específico
                    setFilterOperators([]);
                  }
                }}
              />
              <label htmlFor="pending-operator" className="ml-2 text-sm font-medium">
                Solo mostrar pendientes de operador
              </label>
            </div>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="w-full max-w-6xl mb-6 flex flex-wrap gap-4 justify-center">
        <div className="bg-white rounded-lg p-3 shadow-md flex-1 min-w-[200px] text-center">
          <p className="text-sm text-gray-500">Total Tarimas</p>
          <p className="text-2xl font-bold text-gray-800">{filteredEntradas.length}</p>
        </div>
        <div className="bg-white rounded-lg p-3 shadow-md flex-1 min-w-[200px] text-center">
          <p className="text-sm text-gray-500">Pendientes de Operador</p>
          <p className="text-2xl font-bold text-red-600">
            {filteredEntradas.filter(e => e.operadorEntrada === null).length}
          </p>
        </div>
        <div className="bg-white rounded-lg p-3 shadow-md flex-1 min-w-[200px] text-center">
          <p className="text-sm text-gray-500">Asignadas</p>
          <p className="text-2xl font-bold text-green-600">
            {filteredEntradas.filter(e => e.operadorEntrada !== null).length}
          </p>
        </div>
      </div>

      {/* Filtros activos */}
      {(selectedStatus.length > 0 || pendingOperatorOnly || filterOperators.length > 0 || filtrarPorHora) && (
        <div className="w-full max-w-6xl mb-4 bg-blue-50 p-3 rounded-lg">
          <div className="flex flex-wrap gap-2 items-center">
            <span className="text-sm font-semibold text-gray-600">Filtros activos:</span>
            
            {selectedStatus.map(status => (
              <div key={`filter-${status}`} className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs flex items-center">
                {STATUS_LABELS[status]}
                <button 
                  onClick={() => handleStatusChange(status)} 
                  className="ml-1 text-blue-600 hover:text-blue-800"
                >
                  ×
                </button>
              </div>
            ))}
            
            {pendingOperatorOnly && (
              <div className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full text-xs flex items-center">
                Pendientes de operador
                <button 
                  onClick={() => setPendingOperatorOnly(false)} 
                  className="ml-1 text-yellow-600 hover:text-yellow-800"
                >
                  ×
                </button>
              </div>
            )}
            
            {filterOperators.map(op => (
              <div key={`filter-op-${op}`} className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs flex items-center">
                Operador: {op.length > 15 ? op.substring(0, 15) + '...' : op}
                <button 
                  onClick={() => handleOperatorFilterChange(op)} 
                  className="ml-1 text-green-600 hover:text-green-800"
                >
                  ×
                </button>
              </div>
            ))}
            
            {filtrarPorHora && (
              <div className="bg-purple-100 text-purple-800 px-2 py-1 rounded-full text-xs flex items-center">
                Horario: {horaInicio} - {horaFin}
                <button 
                  onClick={() => setFiltrarPorHora(false)} 
                  className="ml-1 text-purple-600 hover:text-purple-800"
                >
                  ×
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Mensaje de carga o error */}
      {isLoading && (
        <div className="w-full max-w-6xl bg-blue-100 text-blue-800 p-4 rounded-lg mb-6 text-center">
          Cargando datos...
        </div>
      )}
      
      {error && (
        <div className="w-full max-w-6xl bg-red-100 text-red-800 p-4 rounded-lg mb-6 text-center">
          {error}
        </div>
      )}

      {/* Tarjetas de productos con selección de operador */}
      {filteredEntradas.length === 0 && !isLoading ? (
        <div className="w-full max-w-6xl bg-yellow-100 text-yellow-800 p-4 rounded-lg mb-6 text-center">
          No se encontraron resultados con los filtros aplicados.
        </div>
      ) : (
        <div className="max-w-6xl w-full grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredEntradas.map((entrada) => (
            <Card key={entrada.id} className={`border shadow-md ${entrada.operadorEntrada ? "border-green-500" : "border-red-500"}`}>
              <CardContent className="p-4 text-gray-800">
                <div className="flex justify-between items-start mb-2">
                  <p className="text-lg font-bold">{entrada.prodEtiquetaRFID.nombreProducto}</p>
                  {getStatusBadge(entrada.prodEtiquetaRFID.status)}
                </div>
                <p><strong>Código:</strong> {entrada.prodEtiquetaRFID.claveProducto}</p>
                <p><strong>Tarima:</strong> {entrada.numTarima}</p>
                <p><strong>Fecha de Entrada:</strong> {new Date(entrada.fechaEntrada).toLocaleDateString()}</p>
                <p><strong>Hora de Entrada:</strong> {new Date(entrada.fechaEntrada).toLocaleTimeString()}</p>
                <p><strong>Trazabilidad:</strong> {entrada.trazabilidad}</p>
                <p><strong>Piezas:</strong> {entrada.prodEtiquetaRFID.piezas.toLocaleString()}</p>

                {/* Si el operadorEntrada es null, mostrar selector */}
                {entrada.operadorEntrada ? (
                  <div className="flex items-center justify-between bg-green-100 px-4 py-3 rounded-lg mt-4">
                    <p className="text-lg font-semibold text-green-700">{entrada.operadorEntrada}</p>
                    <CheckCircle2 className="text-green-500" size={24} />
                  </div>
                ) : (
                  <div className="mt-4">
                    <Select onValueChange={(value) => setSelectedOperator({ ...selectedOperator, [entrada.id]: value })}>
                      <SelectTrigger className="w-full border-2 border-yellow-500 rounded-lg text-gray-700 font-semibold px-4 py-2 bg-white">
                        <SelectValue placeholder="Seleccionar operador" />
                      </SelectTrigger>
                      <SelectContent>
                        {operators.map((op) => (
                          <SelectItem key={op.id} value={op.rfiD_Operador}>
                            {op.nombreOperador}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <Button 
                      onClick={() => confirmOperatorSelection(entrada.id)} 
                      className="mt-4 w-full bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg"
                      disabled={!selectedOperator[entrada.id] || confirmingOperator === entrada.id}
                    >
                      {confirmingOperator === entrada.id ? 'Procesando...' : 'Confirmar selección'}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}