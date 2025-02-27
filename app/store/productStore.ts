import { create } from 'zustand';
import { ProductData } from '../types/product';

interface ProductStore {
  products: ProductData[]; // Lista de productos
  selectedProduct: ProductData | null; // Producto seleccionado
  addProduct: (product: ProductData) => void; // Agregar un nuevo producto
  selectProduct: (product: ProductData) => void; // Seleccionar un producto
  updateOperator: (productId: string, operator: string) => void; // Actualizar operador de un producto
  resetProducts: () => void; // Reiniciar la lista de productos
  getProducts: () => ProductData[]; // Obtener la lista de productos
  removeProduct: (productId: string) => void; // Eliminar un producto específico
}

export const useProductStore = create<ProductStore>((set, get) => ({
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
          ? { ...p, product: { ...p.product, operator } }
          : p
      ),
      selectedProduct:
        state.selectedProduct?.product.id === productId
          ? { ...state.selectedProduct, product: { ...state.selectedProduct.product, operator } }
          : state.selectedProduct,
    })),
  resetProducts: () => set({ products: [], selectedProduct: null }),
  // 🔥 Nueva función para obtener productos actualizados
  getProducts: () => get().products,
  // 🗑️ Nueva función para eliminar producto por ID
  removeProduct: (productId) => 
    set((state) => {
      // Filtramos los productos para eliminar el indicado
      const updatedProducts = state.products.filter(p => p.product.id !== productId);
      
      // Si el producto seleccionado es el que se está eliminando, lo ponemos a null
      // o seleccionamos el primer producto disponible si existe
      const updatedSelectedProduct = state.selectedProduct?.product.id === productId
        ? updatedProducts.length > 0 ? updatedProducts[0] : null
        : state.selectedProduct;
        
      return {
        products: updatedProducts,
        selectedProduct: updatedSelectedProduct,
      };
    }),
}));