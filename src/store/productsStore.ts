import { create } from 'zustand';
import { ProductsStore } from '@/types/products';
import {
  fetchProducts as apiFetchProducts,
  fetchCategories as apiFetchCategories,
  fetchProductById as apiFetchProductById,
} from '@/lib/api';

let activeProductsAbortController: AbortController | null = null;
let activeProductsRequestId = 0;

let activeProductDetailAbortController: AbortController | null = null;
let activeProductDetailRequestId = 0;

let activeCategoriesAbortController: AbortController | null = null;

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
  categoryError: null,

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

  fetchCategories: async (force = false) => {
    if (get().categories.length > 0 && !force) return; // avoid duplicate calls unless forced

    if (activeCategoriesAbortController) {
      activeCategoriesAbortController.abort();
    }
    const controller = new AbortController();
    activeCategoriesAbortController = controller;

    set({ isLoadingCategories: true, categoryError: null });
    try {
      const categories = await apiFetchCategories({ signal: controller.signal });
      set({ categories, isLoadingCategories: false, categoryError: null });
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        return;
      }
      const message =
        err instanceof Error
          ? err.message
          : 'Failed to load product categories.';
      set({ isLoadingCategories: false, categoryError: message });
    }
  },

  clearCategoryError: () => set({ categoryError: null }),

  fetchProducts: async () => {
    if (activeProductsAbortController) {
      activeProductsAbortController.abort();
    }
    const controller = new AbortController();
    activeProductsAbortController = controller;

    const requestId = ++activeProductsRequestId;
    const { limit, skip, searchQuery, selectedCategory } = get();

    set({ isLoading: true, error: null });

    try {
      const response = await apiFetchProducts(
        {
          limit,
          skip,
          search: searchQuery,
          category: selectedCategory,
        },
        { signal: controller.signal }
      );

      // Avoid race conditions: only update if this is the latest request
      if (requestId === activeProductsRequestId) {
        set({
          products: response.products,
          total: response.total,
          isLoading: false,
          error: null,
        });
      }
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        return;
      }
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
    if (activeProductDetailAbortController) {
      activeProductDetailAbortController.abort();
    }
    const controller = new AbortController();
    activeProductDetailAbortController = controller;

    const requestId = ++activeProductDetailRequestId;
    set({ isLoadingDetail: true, error: null, selectedProduct: null });

    try {
      const product = await apiFetchProductById(id, { signal: controller.signal });
      if (requestId === activeProductDetailRequestId) {
        set({
          selectedProduct: product,
          isLoadingDetail: false,
          error: null,
        });
      }
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        return;
      }
      if (requestId === activeProductDetailRequestId) {
        const message =
          err instanceof Error
            ? err.message
            : `Failed to load details for product #${id}.`;
        set({
          error: message,
          isLoadingDetail: false,
        });
      }
    }
  },

  clearSelectedProduct: () => set({ selectedProduct: null }),
  clearError: () => set({ error: null }),
}));

