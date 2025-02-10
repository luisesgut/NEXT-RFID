import { create } from 'zustand';
import { ProductData } from '../types/product';

interface ProductStore {
  products: ProductData[]; // Lista de productos
  selectedProduct: ProductData | null; // Producto seleccionado
  addProduct: (product: ProductData) => void; // Agregar un nuevo producto
  selectProduct: (product: ProductData) => void; // Seleccionar un producto
  updateOperator: (productId: string, operator: string) => void; // Actualizar operador de un producto
  resetProducts: () => void; // Reiniciar la lista de productos
}

export const useProductStore = create<ProductStore>((set) => ({
  products: [],
  selectedProduct: null,
  addProduct: (product) =>
    set((state) => ({
      products: [product, ...state.products],
    })),
  selectProduct: (product) => set({ selectedProduct: product }),
  updateOperator: (productId, operator) =>
    set((state) => ({
      products: state.products.map((p) =>
        p.product.id === productId
          ? { ...p, product: { ...p.product, operator } } // Actualiza solo el producto correspondiente
          : p
      ),
      selectedProduct:
        state.selectedProduct?.product.id === productId
          ? { ...state.selectedProduct, product: { ...state.selectedProduct.product, operator } }
          : state.selectedProduct,
    })),
  resetProducts: () => set({ products: [], selectedProduct: null }),
}));
