export interface Product {
    id: string;
    name: string;
    epc: string;
    status: string;
    imageUrl: string;
    netWeight: string;
    pieces: string;
    unitOfMeasure: string;
    printCard: string;
    operator: string;
    tipoEtiqueta: string;
    area: string;
    claveProducto: string;
    pesoBruto: string;
    pesoTarima: string;
    fechaEntrada: string;
    horaEntrada: string;
    rfid: string;
  }
  
  export interface OperatorInfo {
    epcOperador: string;
    nombreOperador: string;
    area: string;
    fechaAlta: string;
  }
  
  export interface ProductData {
    success: boolean;
    product: Product;
    operatorInfo: OperatorInfo | null;
    rssi: number;
    antennaPort: number;
    timestamp: string;
  }
  
  