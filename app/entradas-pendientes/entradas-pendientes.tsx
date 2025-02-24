"use client"

import { useEffect, useState } from "react"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { AlertCircle, RefreshCcw, Clock, ChevronRight } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { motion } from "framer-motion"
import { useRouter } from "next/navigation";


// Definimos la estructura de los datos recibidos desde el endpoint
interface Entrada {
  id: number
  operador: string
  lista_Trazabilidades: string
  estatus: string
  noEPCs: number
  createdAt: string
}

export default function EntradasPendientes() {
  const [entradas, setEntradas] = useState<Entrada[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter();

  // Función para manejar la selección de una entrada
  const handleSelectEntrada = (entrada: Entrada) => {
    router.push(`/?id=${entrada.id}`);
  };

  // Función para cargar los datos desde el endpoint
  const cargarEntradas = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch("http://172.16.10.31/api/ProductOutputReview/ByStatus")
      if (!response.ok) {
        throw new Error("Error al obtener los datos")
      }
      
      const data: Entrada[] = await response.json()
      setEntradas(data)
    } catch (err) {
      setError("No se pudo obtener la información. Verifica la conexión con el servidor.")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    cargarEntradas()
  }, [])

  return (
    <div className="min-h-screen bg-[rgb(21,62,62)] flex flex-col items-center py-12 px-4 sm:px-6 lg:px-8">
      
      {/* Encabezado con el logo */}
      <div className="bg-[#153E3E] py-5 px-6 w-full flex items-center justify-center">
        <img
          src="https://darsis.us/bioflex/wp-content/uploads/2023/05/logo_b.png"
          alt="Logo Bioflex"
          width={250}
          height={100}
          className="object-contain"
        />
      </div>

      {/* Header principal */}
      <div className="text-center mt-6 mb-10">
        <h1 className="text-5xl font-bold text-white tracking-wide uppercase">
          Entradas Automáticas
        </h1>
        <p className="mt-2 text-lg text-[#e1a21b] font-medium">
          Gestión de entradas en tiempo real
        </p>
      </div>


      {/* Contenedor de tarjetas */}
      <div className="max-w-5xl w-full bg-white shadow-2xl rounded-2xl p-8">
        {/* Título de la sección */}
        <div className="text-center mb-8">
          <h2 className="text-3xl font-semibold text-[#e1a21b]">
            Entradas Pendientes
          </h2>
          <p className="mt-2 text-lg text-gray-700">
            Actualmente tienes <span className="font-semibold text-[#15403f]">{entradas.length}</span> tareas por completar.
          </p>
        </div>

      {/* BOTON DE ACTUALIZAR */}
        <div className="mb-6 flex justify-end">
          <Button
            onClick={cargarEntradas}
            disabled={isLoading}
            className="bg-[#e1a21b] text-white hover:bg-[#c78d18] transition-all shadow-md"
          >
            <RefreshCcw className="mr-2 h-4 w-4" />
            Actualizar
          </Button>
        </div>

        {/* Estado de carga */}
        {isLoading && (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <Card key={i} className="w-full bg-gray-100 border border-gray-300 shadow-sm">
                <CardHeader>
                  <Skeleton className="h-4 w-2/3 bg-gray-300" />
                  <Skeleton className="h-4 w-full mt-2 bg-gray-300" />
                </CardHeader>
              </Card>
            ))}
          </div>
        )}

        {/* Error */}
        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-5 w-5 text-[#e1a21b]" />
            <AlertTitle className="text-gray-800">Error</AlertTitle>
            <AlertDescription className="text-gray-600">{error}</AlertDescription>
          </Alert>
        )}

        {/* Contenido */}
        {!isLoading && !error && (
          <motion.div
            className="grid gap-6 md:grid-cols-2"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
          >
            {entradas.map((entrada, index) => (
  <motion.div
    key={entrada.id}
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.3, delay: index * 0.1 }}
  >
    <Card 
      className="w-full bg-gray-100 border border-gray-300 shadow-md hover:shadow-lg transition-all duration-300 hover:-translate-y-1 cursor-pointer"
      onClick={() => handleSelectEntrada(entrada)} // Agregar la navegación aquí
    >
      <CardHeader className="bg-[#e1a21b] text-white p-4 rounded-t-2xl">
        <CardTitle className="flex items-center justify-between text-lg font-semibold">
          Operador: {entrada.operador}
          <ChevronRight className="h-5 w-5 text-white" />
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 text-gray-800">
        <CardDescription>
          <p><strong className="text-[#15403f]">Estatus:</strong> {entrada.estatus}</p>
          <p><strong className="text-[#15403f]">Número de Tarimas:</strong> {entrada.noEPCs}</p>
        </CardDescription>
        <div className="flex items-center text-sm text-gray-600 mt-4">
          <Clock className="mr-2 h-4 w-4 text-[#e1a21b]" />
          Creado: {new Date(entrada.createdAt).toLocaleString()}
        </div>
      </CardContent>
    </Card>
  </motion.div>
            ))}
          </motion.div>
        )}
      </div>
    </div>
  )
}