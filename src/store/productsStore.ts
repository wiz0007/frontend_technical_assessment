import { create } from 'zustand';
import type { ProductsStore } from '@/types/products';
import { fetchProducts as apiFetchProducts, fetchCategories as apiFetchCategories, fetchProductById as apiFetchProductById, isCancelledError } from '@/lib/api';
import { ListResponseCache } from '@/lib/list-cache';
import type { ProductsResponse } from '@/types/products';
import { rankSearchResults } from '@/lib/search-ranking';

const productsListCache = new ListResponseCache<ProductsResponse>({ ttlMs: 60_000, maxEntries: 100 });
const productsCacheKey = (limit: number, skip: number, search: string, category: string) => `${limit}:${skip}:${search.trim().toLowerCase()}:${category.trim().toLowerCase()}`;

let listController: AbortController | null = null;
let listRequestId = 0;
let detailController: AbortController | null = null;
let detailRequestId = 0;
let categoryController: AbortController | null = null;
let categoryRequestId = 0;

export const useProductsStore = create<ProductsStore>((set, get) => ({
  products: [], categories: [], selectedProduct: null, total: 0, limit: 10, skip: 0,
  searchQuery: '', selectedCategory: '', isLoading: false, isLoadingCategories: false,
  isLoadingDetail: false, listError: null, detailError: null, categoryError: null,
  setSearchQuery: (query) => set({ searchQuery: query, skip: 0 }),
  setSelectedCategory: (category) => set({ selectedCategory: category, skip: 0 }),
  setPagination: (page, newLimit) => {
    const limit = newLimit ?? get().limit;
    set({ skip: Math.max(0, (page - 1) * limit), limit });
  },
  fetchCategories: async (force = false) => {
    if (get().categories.length > 0 && !force) return;
    categoryController?.abort();
    const controller = new AbortController(); categoryController = controller;
    const requestId = ++categoryRequestId;
    set({ isLoadingCategories: true, categoryError: null });
    try {
      const categories = await apiFetchCategories({ signal: controller.signal });
      if (requestId !== categoryRequestId) return;
      set({ categories, isLoadingCategories: false, categoryError: null });
    } catch (err) {
      if (requestId !== categoryRequestId) return;
      if (isCancelledError(err)) { set({ isLoadingCategories: false }); return; }
      set({ categoryError: err instanceof Error ? err.message : 'Failed to load categories.', isLoadingCategories: false });
    } finally {
      if (requestId === categoryRequestId) categoryController = null;
    }
  },
  cancelCategoriesRequest: () => {
    categoryRequestId++; categoryController?.abort(); categoryController = null;
    set({ isLoadingCategories: false });
  },
  clearCategoryError: () => set({ categoryError: null }),
  fetchProducts: async (force = false) => {
    listController?.abort();
    const controller = new AbortController(); listController = controller;
    const requestId = ++listRequestId;
    const { limit, skip, searchQuery, selectedCategory } = get();
    const cacheKey = productsCacheKey(limit, skip, searchQuery, selectedCategory);
    if (!force) {
      const cached = productsListCache.get(cacheKey);
      if (cached) {
        set({ products: cached.products, total: cached.total, isLoading: false, listError: null });
        listController = null;
        return;
      }
    }
    set({ isLoading: true, listError: null });
    try {
      const response = await apiFetchProducts({ limit, skip, search: searchQuery, category: selectedCategory }, { signal: controller.signal });
      if (requestId !== listRequestId) return;
      const rankedProducts = searchQuery
        ? rankSearchResults(response.products, searchQuery,
            (product) => product.title,
            (product) => `${product.brand ?? ''} ${product.description}`)
        : response.products;
      const rankedResponse = { ...response, products: rankedProducts };
      productsListCache.set(cacheKey, rankedResponse);
      set({ products: rankedResponse.products, total: rankedResponse.total, isLoading: false, listError: null });
    } catch (err) {
      if (requestId !== listRequestId) return;
      if (isCancelledError(err)) { set({ isLoading: false }); return; }
      set({ listError: err instanceof Error ? err.message : 'Unable to load products. Please try again.', isLoading: false });
    } finally {
      if (requestId === listRequestId) listController = null;
    }
  },
  fetchProductById: async (id) => {
    detailController?.abort();
    const controller = new AbortController(); detailController = controller;
    const requestId = ++detailRequestId;
    set({ isLoadingDetail: true, detailError: null, selectedProduct: null });
    try {
      const product = await apiFetchProductById(id, { signal: controller.signal });
      if (requestId !== detailRequestId) return;
      set({ selectedProduct: product, isLoadingDetail: false, detailError: null });
    } catch (err) {
      if (requestId !== detailRequestId) return;
      if (isCancelledError(err)) { set({ isLoadingDetail: false }); return; }
      set({ detailError: err instanceof Error ? err.message : `Failed to load product #${id}.`, isLoadingDetail: false });
    } finally {
      if (requestId === detailRequestId) detailController = null;
    }
  },
  cancelProductDetailRequest: () => {
    detailRequestId++; detailController?.abort(); detailController = null;
    set({ isLoadingDetail: false });
  },
  clearSelectedProduct: () => {
    detailRequestId++; detailController?.abort(); detailController = null;
    set({ selectedProduct: null, isLoadingDetail: false, detailError: null });
  },
  clearListError: () => set({ listError: null }),
  clearDetailError: () => set({ detailError: null }),
}));
