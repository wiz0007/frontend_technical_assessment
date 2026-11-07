import { create } from 'zustand';
import { ProductsStore } from '@/types/products';
import {
  fetchProducts as apiFetchProducts,
  fetchCategories as apiFetchCategories,
  fetchProductById as apiFetchProductById,
} from '@/lib/api';

let activeProductsRequestId = 0;

export const useProductsStore = create<ProductsStore>((set, get) => ({
  products: [],
  categories: [],
  selectedProduct: null,
  total: 0,
  limit: 12, // 12 items fits well into responsive 2, 3, or 4-column grids
  skip: 0,
  searchQuery: '',
  selectedCategory: '',
  isLoading: false,
  isLoadingCategories: false,
  isLoadingDetail: false,
  error: null,

  setSearchQuery: (query: string) => {
    set({ searchQuery: query, skip: 0 });
  },

  setSelectedCategory: (category: string) => {
    set({ selectedCategory: category, skip: 0 });
  },

  setPagination: (page: number, newLimit?: number) => {
    const currentLimit = newLimit ?? get().limit;
    const newSkip = Math.max(0, (page - 1) * currentLimit);
    set({ skip: newSkip, limit: currentLimit });
  },

  fetchCategories: async () => {
    if (get().categories.length > 0) return; // avoid duplicate calls

    set({ isLoadingCategories: true });
    try {
      const categories = await apiFetchCategories();
      set({ categories, isLoadingCategories: false });
    } catch {
      set({ isLoadingCategories: false });
    }
  },

  fetchProducts: async () => {
    const requestId = ++activeProductsRequestId;
    const { limit, skip, searchQuery, selectedCategory } = get();

    set({ isLoading: true, error: null });

    try {
      const response = await apiFetchProducts({
        limit,
        skip,
        search: searchQuery,
        category: selectedCategory,
      });

      // Avoid race conditions
      if (requestId === activeProductsRequestId) {
        set({
          products: response.products,
          total: response.total,
          isLoading: false,
          error: null,
        });
      }
    } catch (err: unknown) {
      if (requestId === activeProductsRequestId) {
        const message =
          err instanceof Error
            ? err.message
            : 'Unable to load products. Please check your connection and try again.';
        set({
          error: message,
          isLoading: false,
        });
      }
    }
  },

  fetchProductById: async (id: number | string) => {
    set({ isLoadingDetail: true, error: null, selectedProduct: null });

    try {
      const product = await apiFetchProductById(id);
      set({
        selectedProduct: product,
        isLoadingDetail: false,
        error: null,
      });
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : `Failed to load details for product #${id}.`;
      set({
        error: message,
        isLoadingDetail: false,
      });
    }
  },

  clearSelectedProduct: () => set({ selectedProduct: null }),
  clearError: () => set({ error: null }),
}));

