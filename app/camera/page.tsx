"use client";

import { useEffect, useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle, Camera, UserCheck, QrCode, Loader2, ArrowRight, ArrowLeft, ClipboardList } from "lucide-react";
import axios from "axios";
import { Html5Qrcode } from "html5-qrcode";
import Swal from "sweetalert2";
import { useRouter } from "next/navigation";
//sesion
import { useSession } from "next-auth/react";


interface Operador {
  id: number;
  rfiD_Operador: string;
  nombreOperador: string;
}

export default function AsociarTarima() {
  const router = useRouter();
  const [operators, setOperators] = useState<Operador[]>([]);
  const [selectedOperator, setSelectedOperator] = useState<string | null>(null);
  const [selectedOperatorName, setSelectedOperatorName] = useState<string | null>(null);
  const [isQrScannerOpen, setIsQrScannerOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [scannerResult, setScannerResult] = useState<string | null>(null);
  const [recentAssociations, setRecentAssociations] = useState<{qr: string, operator: string, timestamp: string}[]>([]);
  const [loadingOperators, setLoadingOperators] = useState(true);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const scannerContainerId = "reader";
  //sesion
  const { data: session } = useSession();


  const handleGoBack = () => {
    router.push("/dashboard"); // 🔀 Primero redirigir
    setTimeout(() => {
      window.location.reload(); // 🔄 Luego recargar al llegar a Dashboard
    }, 300); // 🕐 Pequeño retraso para que la redirección se complete
  };

  // Función para navegar a la página de gestión de tarimas
  const handleGoToTarimas = () => {
    router.push("/entradas-pendientes");
  };

  // Obtener operadores al cargar la pantalla
  useEffect(() => {
    const fetchOperators = async () => {
      setLoadingOperators(true);
      try {
        const response = await axios.get("http://172.16.10.31/api/OperadoresRFID");
        const operators = response.data;
        setOperators(operators);
        
        // Buscar el operador por nombre que coincida con el usuario de la sesión
        if (session?.user?.name) {
          const userOperator = operators.find((op: Operador) => 
            op.nombreOperador.toLowerCase() === session.user.name?.toLowerCase()
          );
          
          if (userOperator) {
            // Si encuentra al operador, seleccionarlo automáticamente
            setSelectedOperator(userOperator.rfiD_Operador);
            setSelectedOperatorName(userOperator.nombreOperador);
          } else {
            // Si no encuentra coincidencia exacta, mostrar alerta
            Swal.fire({
              icon: "warning",
              title: "Operador no encontrado",
              text: "No se encontró un operador que coincida con tu usuario. Contacta al administrador.",
              confirmButtonColor: "#e1a21b",
            });
          }
        }
      } catch (error) {
        console.error("Error al obtener operadores:", error);
        Swal.fire({
          icon: "error",
          title: "Error de conexión",
          text: "No se pudieron cargar los operadores. Intenta nuevamente.",
          confirmButtonColor: "#e1a21b",
        });
      } finally {
        setLoadingOperators(false);
      }
    };

    fetchOperators();
  }, [session]);

  // POST al endpoint cuando se detecta el QR
  const associatePallet = async (qrText: string) => {
    if (!selectedOperator) {
      Swal.fire({
        icon: "error",
        title: "Operador no detectado",
        text: "No se pudo asociar tu usuario con un operador válido. Contacta al administrador.",
        confirmButtonColor: "#e1a21b",
      });
      return;
    }

    setLoading(true);
    // Primero actualizamos la UI con el QR detectado para mejor feedback
    setScannerResult(qrText);
    
    const payload = {
      PalletEpc: `000${qrText}`, // Agregar prefijo "000"
      OperatorEpc: selectedOperator,
    };

    try {
      const response = await axios.post("http://172.16.10.31:81/api/Test/simulate-association", payload);

      if (response.status === 200) {
        // Añadir a historial reciente
        const operatorName = operators.find(op => op.rfiD_Operador === selectedOperator)?.nombreOperador || "Desconocido";
        setRecentAssociations(prev => [
          { 
            qr: qrText, 
            operator: operatorName, 
            timestamp: new Date().toLocaleTimeString() 
          },
          ...prev.slice(0, 4) // Mantener solo las 5 más recientes
        ]);
        
        Swal.fire({
          icon: "success",
          title: "¡Asociación exitosa!",
          text: "La tarima ha sido asociada correctamente.",
          confirmButtonColor: "#153E3E",
          timer: 2000,
          timerProgressBar: true,
          showConfirmButton: false
        });
      } else {
        throw new Error("Error en la asociación");
      }
    } catch (error) {
      Swal.fire({
        icon: "error",
        title: "Error de asociación",
        text: "Hubo un problema al asociar la tarima. Verifica la conexión e intenta nuevamente.",
        confirmButtonColor: "#e1a21b",
      });
      console.error("Error al asociar tarima:", error);
    } finally {
      setLoading(false);
    }
  };

  // Iniciar escáner QR
  const startQrScanner = () => {
    setIsQrScannerOpen(true);
  };

  // Manejo del escáner con efecto
  useEffect(() => {
    let html5QrCode: Html5Qrcode | null = null;
    let isMounted = true; // Flag para controlar si el componente está montado

    if (isQrScannerOpen) {
      // Pequeño retraso para asegurar que el DOM esté listo
      const timer = setTimeout(() => {
        if (!isMounted) return;
        
        try {
          const element = document.getElementById(scannerContainerId);
          if (!element) return;

          element.innerHTML = ""; // Limpiar antes de inicializar

          html5QrCode = new Html5Qrcode(scannerContainerId);
          scannerRef.current = html5QrCode;

          html5QrCode
            .start(
              { facingMode: "environment" }, // Cámara trasera
              { fps: 10, qrbox: { width: 250, height: 250 } },
              (decodedText) => {
                console.log(`QR Detectado: ${decodedText}`);
                if (isMounted) {
                  setScannerResult(decodedText);
                  
                  // Detener el escáner antes de hacer cualquier otra cosa
                  if (html5QrCode) {
                    html5QrCode.stop().then(() => {
                      // Solo después de detener el escáner, actualizamos el estado y hacemos el POST
                      if (isMounted) {
                        setIsQrScannerOpen(false);
                        associatePallet(decodedText);
                      }
                    }).catch(err => console.error("Error al detener escáner:", err));
                  }
                }
              },
              (errorMessage) => {
                console.log(`Escaneando QR... ${errorMessage}`);
              }
            )
            .catch((err) => {
              console.error("Error al iniciar escaneo:", err);
              if (isMounted) {
                Swal.fire({
                  icon: "error",
                  title: "Error de cámara",
                  text: "No se pudo iniciar la cámara. Verifica los permisos del navegador.",
                  confirmButtonColor: "#e1a21b",
                });
                setIsQrScannerOpen(false);
              }
            });
        } catch (error) {
          console.error("Error al inicializar el escáner:", error);
          if (isMounted) {
            setIsQrScannerOpen(false);
          }
        }
      }, 300);

      return () => {
        isMounted = false; // Marcar que el componente se desmontó
        clearTimeout(timer); // Limpiar el temporizador

        // Detener el escáner de forma segura
        if (html5QrCode && html5QrCode.isScanning) {
          html5QrCode.stop().catch((err) => console.error("Error al detener escáner:", err));
        }
      };
    }
  }, [isQrScannerOpen]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#153E3E] to-[#0d2b2b] flex flex-col items-center py-8 px-4">
      {/* Header con logo y botones de navegación */}
      <div className="w-full max-w-4xl flex flex-col sm:flex-row justify-between items-center mb-8">
        <div className="flex flex-col sm:flex-row items-center gap-4">
          <div className="flex flex-wrap gap-2">
            <Button
              onClick={handleGoBack}
              className="bg-[#1E3A8A] hover:bg-[#1A2E6B] text-white font-bold px-6 py-2 rounded-lg flex items-center gap-2"
            >
              <ArrowLeft className="w-5 h-5" /> Regresar al Dashboard
            </Button>
            
            {/* Nuevo botón para ir a gestionar tarimas */}
            <Button
              onClick={handleGoToTarimas}
              className="bg-[#1E5F8A] hover:bg-[#1A4F6B] text-white font-bold px-6 py-2 rounded-lg flex items-center gap-2"
            >
              <ClipboardList className="w-5 h-5" /> Gestionar Tarimas
            </Button>
          </div>
          <div className="mt-4 flex flex-col items-center">
            {session?.user?.name ? (
              <p className="text-2xl text-white">
                Bienvenido, <span className="text-yellow-400 font-semibold">{session.user.name || ""}</span> 🎉
              </p>
            ) : (
              <p className="text-gray-300">Cargando usuario...</p> // Mensaje de carga si no hay usuario
            )}
          </div>

          <h1 className="text-4xl md:text-5xl font-bold text-white tracking-wide uppercase mb-4 sm:mb-0 text-center sm:text-left">
            Asociación de <span className="text-[#e1a21b]">Tarima</span>
          </h1>
        </div>
        {/* Puedes añadir un logo aquí */}
        {/* <img src="/logo.png" alt="Logo" className="h-16" /> */}
      </div>

      <div className="w-full max-w-4xl flex flex-col md:flex-row gap-6">
        <div className="w-full md:w-2/3 flex flex-col gap-6">
          {/* Información del Operador (reemplaza el combobox) */}
          <Card className="w-full bg-white/95 shadow-lg border-none rounded-xl overflow-hidden">
            <CardHeader className="bg-[#153E3E] text-white p-4">
              <CardTitle className="flex items-center gap-2 text-xl">
                <UserCheck className="w-5 h-5" /> 
                Operador Actual
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              {loadingOperators ? (
                <div className="flex justify-center items-center py-4">
                  <Loader2 className="w-8 h-8 text-[#e1a21b] animate-spin" />
                </div>
              ) : selectedOperatorName ? (
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg flex items-start gap-3">
                  <CheckCircle2 className="w-6 h-6 text-green-500 mt-1" />
                  <div>
                    <p className="text-green-700 text-lg font-semibold">
                      {selectedOperatorName}
                    </p>
                    <p className="text-green-600 text-sm mt-1">
                      Operando como usuario activo en el sistema
                    </p>
                  </div>
                </div>
              ) : (
                <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg flex items-center gap-3">
                  <Loader2 className="w-5 h-5 text-yellow-500 animate-spin" />
                  <p className="text-yellow-700">
                    Esperando identificación de operador...
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Escáner QR */}
          <Card className={`w-full bg-white/95 shadow-lg border-none rounded-xl overflow-hidden ${!selectedOperator ? 'opacity-60' : ''}`}>
            <CardHeader className="bg-[#153E3E] text-white p-4">
              <CardTitle className="flex items-center gap-2 text-xl">
                <QrCode className="w-5 h-5" /> 
                Escanear Código QR
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="relative w-full">
                <div 
                  id={scannerContainerId} 
                  className="w-full h-64 bg-gray-100 rounded-lg flex items-center justify-center border-2 border-dashed border-gray-300"
                >
                  {!isQrScannerOpen && (
                    <Button
                      className="bg-[#e1a21b] hover:bg-[#c08609] text-white font-bold py-3 px-6 rounded-lg flex items-center gap-2"
                      onClick={startQrScanner}
                      disabled={!selectedOperator || loading}
                    >
                      <Camera className="w-5 h-5" /> 
                      {loading ? "Procesando..." : "Activar Cámara"}
                    </Button>
                  )}
                </div>
                
                {isQrScannerOpen && (
                  <div className="absolute top-2 right-2 z-10">
                    <Button
                      className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-3 rounded-full flex items-center"
                      onClick={() => {
                        // Asegurarse de detener el escáner antes de cambiar el estado
                        if (scannerRef.current && scannerRef.current.isScanning) {
                          scannerRef.current.stop().then(() => {
                            setIsQrScannerOpen(false);
                          }).catch(err => {
                            console.error("Error al detener escáner:", err);
                            setIsQrScannerOpen(false);
                          });
                        } else {
                          setIsQrScannerOpen(false);
                        }
                      }}
                    >
                      <XCircle className="w-5 h-5" />
                    </Button>
                  </div>
                )}
              </div>
              
              {scannerResult && (
                <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-blue-800 mb-1 font-medium">Código QR Detectado:</p>
                  <div className="bg-white p-3 rounded border border-blue-200">
                    <p className="text-xl text-blue-900 font-mono tracking-wide">{scannerResult}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Panel lateral de historial */}
        <div className="w-full md:w-1/3">
          <Card className="w-full bg-white/95 shadow-lg border-none rounded-xl overflow-hidden h-full">
            <CardHeader className="bg-[#153E3E] text-white p-4">
              <CardTitle className="text-xl">Asociaciones Recientes</CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              {recentAssociations.length > 0 ? (
                <div className="space-y-3">
                  {recentAssociations.map((assoc, idx) => (
                    <div key={idx} className="p-3 bg-green-50 border border-green-200 rounded-lg">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="text-sm text-gray-500">{assoc.timestamp}</p>
                          <p className="font-medium text-gray-900 mt-1">{assoc.operator}</p>
                        </div>
                        <CheckCircle2 className="w-5 h-5 text-green-500" />
                      </div>
                      <p className="text-sm font-mono bg-white px-2 py-1 rounded mt-2 border border-green-100">
                        {assoc.qr}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center py-10 text-center text-gray-500">
                  <ArrowRight className="w-10 h-10 mb-3 text-gray-300" />
                  <p>Las asociaciones realizadas aparecerán aquí</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
      
      {/* Footer */}
      <div className="mt-8 text-center text-gray-300 text-sm">
        Sistema de Asociación de Tarimas • {new Date().getFullYear()}
      </div>
    </div>
  );
}