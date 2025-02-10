import { useEffect, useState } from 'react';
import * as signalR from '@microsoft/signalr';
import { useProductStore } from '../store/productStore';
import { ProductData } from '../types/product';

export const useSignalRConnection = () => {
  const [connection, setConnection] = useState<signalR.HubConnection | null>(null);
  const { products, addProduct, updateOperator } = useProductStore();

  useEffect(() => {
    const newConnection = new signalR.HubConnectionBuilder()
      .withUrl('http://172.16.10.31:81/readerHub')
      .withAutomaticReconnect()
      .build();

    setConnection(newConnection);

    newConnection
      .start()
      .then(() => {
        console.log('Conexión establecida con el hub');

        const handleMessage = (message: any) => {
          console.log('Mensaje recibido:', message);

          if (message.success) {
            const productEPC = message.product.epc || message.product.id;
            const existingProduct = products.find((p) => p.product.epc === productEPC);

            if (existingProduct) {
              // Actualizar operador si llega un evento de asociación
              if (message.operatorInfo?.nombreOperador) {
                updateOperator(existingProduct.product.id, message.operatorInfo.nombreOperador);
              }
              return;
            }

            // Crear un nuevo producto
            const isAssociation = !!message.operatorInfo;
            const status = isAssociation ? 'success' : 'pending';

            const productData: ProductData = {
              success: true,
              product: {
                id: message.product.id || '',
                name: message.product.name || 'Producto sin nombre',
                epc: message.product.epc || '',
                status,
                imageUrl: message.product.imageUrl || '/placeholder.svg',
                netWeight: message.product.netWeight || 'N/A',
                pieces: message.product.pieces || 'N/A',
                unitOfMeasure: message.product.unitOfMeasure || 'N/A',
                printCard: message.product.printCard || 'N/A',
                operator: isAssociation
                  ? message.operatorInfo?.nombreOperador || 'Indefinido'
                  : 'Indefinido',
                tipoEtiqueta: message.product.tipoEtiqueta || 'N/A',
                area: message.product.area || 'N/A',
                claveProducto: message.product.claveProducto || 'N/A',
                pesoBruto: message.product.pesoBruto || 'N/A',
                pesoTarima: message.product.pesoTarima || 'N/A',
                fechaEntrada: message.product.fechaEntrada || new Date().toISOString(),
                horaEntrada: message.product.horaEntrada || new Date().toLocaleTimeString(),
                rfid: message.product.rfid || '',
              },
              operatorInfo: message.operatorInfo || null,
              rssi: message.rssi || 0,
              antennaPort: message.antennaPort || 0,
              timestamp: message.timestamp || new Date().toISOString(),
            };

            addProduct(productData);
          }
        };

        newConnection.on('NewAssociation', handleMessage);
        newConnection.on('NewPallet', handleMessage);
      })
      .catch((err) => console.error('Error al conectar con el hub:', err));

    return () => {
      if (newConnection) {
        newConnection.stop().catch((err) => console.error('Error al desconectar:', err));
      }
    };
  }, [addProduct, products, updateOperator]);

  return connection;
};
