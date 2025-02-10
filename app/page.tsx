'use client'

import Image from 'next/image'
import axios from 'axios'
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation'
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { CheckCircle2, XCircle } from 'lucide-react'
import { useProductStore } from '../app/store/productStore'
import { useSignalRConnection } from '../app/hooks/useSignalRConnection'
import { ProductData } from '../app/types/product'
import { Operator } from '../app/types/operator'

export default function Home() {
  
  const router = useRouter()
  const connection = useSignalRConnection()
  const { products, selectedProduct, selectProduct, updateOperator } = useProductStore()
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false)
  const [isAlertOpen, setIsAlertOpen] = useState(false)
  const [alertType, setAlertType] = useState<'success' | 'error'>('success')
  const [alertMessage, setAlertMessage] = useState('')
  const [operatorToConfirm, setOperatorToConfirm] = useState<string | null>(null)
  const [operatorConfirmingProduct, setOperatorConfirmingProduct] = useState<string | null>(null)
  const [operators, setOperators] = useState<Operator[]>([]); // Lista de operadores
  //boton reiniciar 
  const [isLoading, setIsLoading] = useState(false); // Estado de carga
  const [responseMessage, setResponseMessage] = useState<string | null>(null); // Mensaje de respuesta
  const [responseType, setResponseType] = useState<'success' | 'error' | null>(null); // Tipo de respuesta
  //seleccion manual
  const [isManualSelect, setIsManualSelect] = useState(false); // Bandera para selección manual
  const [lastAutoSelectedId, setLastAutoSelectedId] = useState<string | null>(null);


  useEffect(() => {
    const fetchOperators = async () => {
      try {
        const response = await axios.get('http://172.16.10.31/api/OperadoresRFID');
        setOperators(response.data); // Guardar la lista de operadores
      } catch (error) {
        console.error('Error al obtener operadores:', error);
      }
    };
  
    fetchOperators(); // Llamar a la función de forma correcta
  }, []); // Este efecto solo se ejecuta una vez al montar el componente
  
  
// Manejo de selección manual
const handleProductSelect = (product: ProductData) => {
  setIsManualSelect(true);
  selectProduct(product);
};


// Sincronizar `selectedProduct` con `products`
useEffect(() => {
  if (selectedProduct) {
    const updatedProduct = products.find((p) => p.product.id === selectedProduct.product.id);
    if (updatedProduct) {
      selectProduct(updatedProduct);
    }
  }
}, [products, selectedProduct, selectProduct]);

// Selección automática y sincronización
useEffect(() => {
  if (products.length > 0) {
    const mostRecentProduct = products[0];
    
    // Auto-seleccionar solo si:
    // 1. No hay producto seleccionado, o
    // 2. No hubo selección manual y es un producto nuevo
    if (!selectedProduct || (!isManualSelect && mostRecentProduct.product.id !== lastAutoSelectedId)) {
      selectProduct(mostRecentProduct);
      setLastAutoSelectedId(mostRecentProduct.product.id);
    } else if (selectedProduct) {
      // Mantener sincronizado el producto seleccionado
      const updatedProduct = products.find(p => p.product.id === selectedProduct.product.id);
      if (updatedProduct) {
        selectProduct(updatedProduct);
      }
    }
  }
}, [products, selectedProduct, isManualSelect]);

 // Resetear selección manual cuando cambia products
useEffect(() => {
  return () => setIsManualSelect(false);
}, [products]);

  
  // hacer post a la otra bd
  const registerAntennaRecord = async (epc: string, epcOperador: string = "Indefinido") => {
    try {
      console.log("Registrando antena:", epc, epcOperador);
      const url = `http://172.16.10.31/api/ProdRegistroAntenas?epcOperador=${epcOperador}&epc=${epc}`;
      const response = await axios.post(url);
  
      // Validar código de estado
      if (response.status !== 200) {
        throw new Error(`Error en el registro: ${response.statusText}`);
      }
  
      return { success: true };
    } catch (error: unknown) {
      const errorMessage =
        (error as Error)?.message || "Ocurrió un error inesperado.";
      console.error("Error al registrar antena:", errorMessage);
      return { success: false, message: errorMessage };
    }
  };

  //jalarse al operador desde el endpoint nuevo
  const fetchOperatorByRfid = async (epc: string) => {
    try {
      const url = `http://172.16.10.31/api/ProdRegistroAntenas/ByRFID?epc=${epc}`;
      const response = await axios.get(url);
  
      if (response.status !== 200) {
        throw new Error(`Error al obtener el operador para el EPC ${epc}`);
      }
  
      return response.data; // Devuelve los datos del operador
    } catch (error: unknown) {
      const errorMessage =
        (error as Error)?.message || "Error al obtener datos del operador.";
      console.error("Error al obtener el operador:", errorMessage);
      return null; // Devuelve null en caso de error
    }
  };
  
  
  
  const handleOperatorSelection = (operator: string, productId: string) => {
    setOperatorToConfirm(operator)
    setOperatorConfirmingProduct(productId)
  }

  const confirmOperatorSelection = async (productId: string) => {
    if (operatorToConfirm && selectedProduct) {
      try {
        // 1. Realizar POST para asociar el operador
        const postResult = await registerAntennaRecord(
          selectedProduct.product.epc,
          operatorToConfirm
        );
  
        if (!postResult.success) {
          throw new Error(postResult.message || "Error al registrar el producto.");
        }
  
        // 2. Obtener los detalles del operador seleccionado
        const operatorDetails = operators.find(
          (op) => op.rfiD_Operador === operatorToConfirm
        );
  
        if (!operatorDetails) {
          throw new Error("No se encontró el operador en la lista local.");
        }
  
        // 3. Actualizar el estado global y el producto seleccionado
        const updatedProduct = {
          ...selectedProduct,
          product: {
            ...selectedProduct.product,
            operator: operatorDetails.nombreOperador,
            status: "success"
          }
        };
  
        // Actualizar el estado global
        const updatedProducts = products.map(p => 
          p.product.id === productId ? updatedProduct : p
        );
  
        // Actualizar el operador en el store global
        updateOperator(productId, operatorDetails.nombreOperador);
        
        // Actualizar el producto seleccionado
        selectProduct(updatedProduct);
  
        setAlertType("success");
        setAlertMessage("Operador asignado correctamente.");
      } catch (error: unknown) {
        const errorMessage = error instanceof Error
          ? error.message
          : "Error al sincronizar datos.";
        console.error("Error:", errorMessage);
  
        setAlertType("error");
        setAlertMessage(errorMessage);
      } finally {
        setIsAlertOpen(true);
        setTimeout(() => setIsAlertOpen(false), 3000);
        setOperatorToConfirm(null);
        setOperatorConfirmingProduct(null);
      }
    }
  };
  
  
  
  
  const validateBeforeStop = () => {
    const pendingProducts = products.filter(
      (p) => p.product.operator === "Indefinido"
    );
  
    if (pendingProducts.length > 0) {
      setAlertType("error");
      setAlertMessage(
        "Todos los productos deben tener un operador asignado antes de detener las entradas."
      );
      setIsAlertOpen(true);
    } else {
      setIsConfirmDialogOpen(true);
    }
  };
  

  const handleRestartAntenna = async () => {
    setIsLoading(true); // Mostrar estado de carga
    setResponseMessage(null); // Limpiar cualquier mensaje previo
  
    try {
      const response = await axios.post('http://172.16.10.31:81/api/Reader/manage');
  
      if (response.status === 200 && response.data.message) {
        setResponseMessage(response.data.message); // Mensaje de éxito
        setResponseType('success');
      } else {
        throw new Error('Respuesta inesperada del servidor'); // Manejo de error genérico
      }
    } catch (error: any) {
      const errorMessage =
        error.response?.data?.error ||
        'Ocurrió un error inesperado. Por favor, contacte a soporte.';
      setResponseMessage(errorMessage); // Mensaje de error del servidor
      setResponseType('error');
    } finally {
      setIsLoading(false); // Finalizar estado de carga
    }
  };

  const handleConfirmStop = () => {
    setIsConfirmDialogOpen(false)
    // Implement logic to stop entries and deactivate antenna
    console.log('Stopping entries and deactivating antenna')
    setAlertType('success')
    setAlertMessage('Proceso de entradas detenido y antena desactivada con éxito.')
    setIsAlertOpen(true)
    
    // Mostrar el mensaje por un momento antes de refrescar
    setTimeout(() => {
      router.refresh() // Refresca solo los datos
      // O si prefieres un refresh completo:
      window.location.reload()
    }, 1500) // dar tiempo para que se muestre el mensaje de éxito
  }

  return (
    <div className="flex h-screen bg-gray-100">
       <div className="w-1/3 p-0 overflow-y-auto border-r bg-white">
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
{/* Botón para reiniciar antena */}
<div className="mt-6 text-center">
  {/* Botón para reiniciar antena */}
  <Button
    onClick={handleRestartAntenna}
    disabled={isLoading}
    className={`font-bold py-8 px-8 rounded-lg shadow-md transition-all ${
      isLoading
        ? "bg-gray-400 cursor-not-allowed text-white"
        : "bg-[#ff6900] text-[#133d3d] hover:bg-[#d18f18] hover:text-white"
    }`}
  >
    {isLoading ? "Reiniciando..." : "REINICIAR ANTENA"}
  </Button>

  {/* Dialog para el feedback del reinicio */}
  <Dialog open={!!responseMessage} onOpenChange={() => setResponseMessage(null)}>
    <DialogContent>
      <DialogHeader>
        <DialogTitle>
          {responseType === "success" ? "¡Éxito!" : "Error"}
        </DialogTitle>
        <DialogDescription>{responseMessage}</DialogDescription>
      </DialogHeader>
      <DialogFooter>
        <Button onClick={() => setResponseMessage(null)}>Cerrar</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</div>
  {/* Título principal */}
  <h2 className="text-3xl font-bold mb-8 text-[#133d3d] text-center border-b-4 border-[#e1a21b] pb-4">
    Productos Entrantes
  </h2>

  {/* Listado de productos */}
  <div className="space-y-4 px-4">
  {products.map((product) => (
    <Card
      key={product.product.id}
      className={`cursor-pointer transition-all rounded-lg shadow-md p-4 ${
        product.product.operator !== "Indefinido"
          ? "border-4 border-green-500 bg-green-50"
          : "border-4 border-red-500 bg-red-50"
      }`}
      onClick={() => handleProductSelect(product)}
    >
      <CardContent>
        {/* Información del producto */}
        <div className="flex justify-between items-start">
          <div>
            <h3 className="font-bold text-lg text-gray-800 mb-2">
              {product.product.name}
            </h3>
            <p className="text-sm text-gray-600">EPC: {product.product.epc}</p>
            <p className="text-sm text-gray-600">
              Operador:{" "}
              {product.product.operator !== "Indefinido"
                ? product.product.operator
                : "Sin asignar"}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  ))}
</div>

</div>

      <div className="w-2/3 p-4 overflow-y-auto">
      <p className="text-3xl font-bold text-black-600 mb-4 text-center">{new Date().toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }).toUpperCase()}</p>
        {selectedProduct ? (
          <div className="space-y-6 bg-white p-6 rounded-lg shadow-lg">
            <h3 className="font-bold text-2xl text-[#133d3d] bg-[#e1a21b] py-3 px-6 rounded-lg text-center shadow-md">
  {selectedProduct.product.name}
</h3>

            
            
            <div className="flex space-x-6">
              <div className="w-1/3">
              <div>
  {/* Imagen del producto */}
  <div className="aspect-square relative overflow-hidden rounded-lg border border-gray-200">
  <img
  src={selectedProduct.product.imageUrl || "/placeholder.svg"}
  alt={selectedProduct.product.name}
  style={{ objectFit: "cover", width: "100%", height: "100%" }}
  className="transition-all duration-300 hover:scale-105 rounded-lg"
/>

  </div>

  {/* Código del producto */}
  <div className="bg-[#133d3d] p-4 rounded-lg shadow-md text-center mt-6">
    <p className="text-lg font-bold text-[#e1a21b]">CÓDIGO DE PRODUCTO</p>
    <p className="text-2xl font-semibold text-white mt-2">
      {selectedProduct.product.claveProducto}
    </p>
  </div>

  {/* Botón para reiniciar antena */}
  <div className="mt-6 text-center">
  {/* Botón para reiniciar antena */}
  <Button
    onClick={handleRestartAntenna}
    disabled={isLoading}
    className={`font-bold py-8 px-8 rounded-lg shadow-md transition-all ${
      isLoading
        ? "bg-gray-400 cursor-not-allowed text-white"
        : "bg-[#ff6900] text-[#133d3d] hover:bg-[#d18f18] hover:text-white"
    }`}
  >
    {isLoading ? "Reiniciando..." : "REINICIAR ANTENA"}
  </Button>

  {/* Dialog para el feedback del reinicio */}
  <Dialog open={!!responseMessage} onOpenChange={() => setResponseMessage(null)}>
    <DialogContent>
      <DialogHeader>
        <DialogTitle>
          {responseType === "success" ? "¡Éxito!" : "Error"}
        </DialogTitle>
        <DialogDescription>{responseMessage}</DialogDescription>
      </DialogHeader>
      <DialogFooter>
        <Button onClick={() => setResponseMessage(null)}>Cerrar</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</div>


</div>

              </div>
              <div className="w-2/3 space-y-4">
              <div className="grid grid-cols-2 gap-6">
              <div className="bg-[#133d3d] p-4 rounded-lg shadow-md text-center">
    <p className="text-lg font-bold text-[#e1a21b]">PESO NETO</p>
    <p className="text-2xl font-semibold text-white mt-2">
      {selectedProduct.product.netWeight} KILOGRAMOS
    </p>
  </div>
                  {/* Piezas */}
  <div className="bg-[#133d3d] p-4 rounded-lg shadow-md text-center">
    <p className="text-lg font-bold text-[#e1a21b]">PIEZAS</p>
    <p className="text-2xl font-semibold text-white mt-2">
      {selectedProduct.product.pieces} {selectedProduct.product.unitOfMeasure}
    </p>
  </div>
                  {/* Área */}
  <div className="bg-[#133d3d] p-4 rounded-lg shadow-md text-center">
    <p className="text-lg font-bold text-[#e1a21b]">ÁREA</p>
    <p className="text-2xl font-semibold text-white mt-2">
      {selectedProduct.product.area}
    </p>
  </div>
  <div className="bg-[#133d3d] p-4 rounded-lg shadow-md text-center">
  <p className="text-lg font-bold text-[#e1a21b]">PRINTCARD</p>
  <p className="text-2xl font-semibold text-white mt-2">
      {selectedProduct.product.printCard}
    </p>
                  </div>
                </div>
                <div className="bg-[#133d3d] p-6 rounded-lg shadow-md">
  <p className="text-lg font-bold text-[#e1a21b] mb-4">OPERADOR</p>
  {selectedProduct?.product.operator !== "Indefinido" ? (
    <div className="flex items-center justify-between bg-[#e1a21b] text-[#133d3d] px-4 py-3 rounded-lg">
      <p className="text-2xl font-semibold">{selectedProduct.product.operator}</p>
      <CheckCircle2 className="text-green-500" size={40} />
    </div>
  ) : (
    <div>
      <Select
        onValueChange={(value) => {
          setOperatorToConfirm(value);
          setOperatorConfirmingProduct(selectedProduct.product.id);
        }}
      >
        <SelectTrigger className="w-full border-2 border-[#e1a21b] rounded-lg text-[#133d3d] font-semibold px-4 py-2 bg-white">
          <SelectValue placeholder="Seleccionar operador" />
        </SelectTrigger>
        <SelectContent className="bg-white rounded-lg shadow-md">
          {operators.map((op) => (
            <SelectItem
              key={op.id}
              value={op.rfiD_Operador}
              className="hover:bg-[#e1a21b] hover:text-white"
            >
              {op.nombreOperador}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {operatorToConfirm &&
        operatorConfirmingProduct === selectedProduct.product.id && (
          <Button
            onClick={() => confirmOperatorSelection(selectedProduct.product.id)}
            className="mt-4 w-full bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg"
          >
            Confirmar selección
          </Button>
        )}
    </div>
  )}
</div>



<div className={`p-4 rounded-lg shadow-md text-center ${selectedProduct.product.operator !== 'Indefinido' ? 'bg-green-100' : 'bg-red-100'}`}>
  <div className="flex items-center justify-center space-x-2">
    {selectedProduct.product.operator !== 'Indefinido' ? (
      <CheckCircle2 className="text-green-500" size={40} />
    ) : (
      <XCircle className="text-red-500" size={40} />
    )}
    <p className="text-2xl font-bold" style={{ color: selectedProduct.product.operator !== 'Indefinido' ? '#28a745' : '#dc3545' }}>
      {selectedProduct.product.operator !== 'Indefinido' ? 'Éxito' : 'Error'}
    </p>
  </div>
  <p className="text-lg font-medium mt-2 text-gray-800">
    Estado: {selectedProduct.product.operator !== 'Indefinido' ? 'El operador está asignado correctamente.' : 'No se ha asignado un operador.'}
  </p>
</div>

              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center h-full">
            <p className="text-center text-gray-500 text-xl">Seleccione un producto para ver los detalles</p>
          </div>
        )}
        
      </div>

      
    </div>
  )
}

