export interface ProductReview {
  rating: number;
  comment: string;
  date: string;
  reviewerName: string;
  reviewerEmail: string;
}

export interface ProductDimensions {
  width: number;
  height: number;
  depth: number;
}

export interface DummyJsonProduct {
  id: number;
  title: string;
  description: string;
  category: string;
  price: number;
  discountPercentage: number;
  rating: number;
  stock: number;
  tags?: string[];
  brand?: string;
  sku?: string;
  weight?: number;
  dimensions?: ProductDimensions;
  warrantyInformation?: string;
  shippingInformation?: string;
  availabilityStatus?: string;
  reviews?: ProductReview[];
  returnPolicy?: string;
  minimumOrderQuantity?: number;
  images: string[];
  thumbnail: string;
}

export interface ProductCategory {
  slug: string;
  name: string;
  url?: string;
}

export interface ProductsResponse {
  products: DummyJsonProduct[];
  total: number;
  skip: number;
  limit: number;
}

export interface ProductsFilterParams {
  limit?: number;
  skip?: number;
  search?: string;
  category?: string;
}

export interface ProductsState {
  products: DummyJsonProduct[];
  categories: ProductCategory[];
  selectedProduct: DummyJsonProduct | null;
  total: number;
  limit: number;
  skip: number;
  searchQuery: string;
  selectedCategory: string; // '' indicates all categories
  isLoading: boolean;
  isLoadingCategories: boolean;
  isLoadingDetail: boolean;
  error: string | null;
}

export interface ProductsActions {
  setSearchQuery: (query: string) => void;
  setSelectedCategory: (category: string) => void;
  setPagination: (page: number, limit?: number) => void;
  fetchProducts: () => Promise<void>;
  fetchCategories: () => Promise<void>;
  fetchProductById: (id: number | string) => Promise<void>;
  clearSelectedProduct: () => void;
  clearError: () => void;
}

export type ProductsStore = ProductsState & ProductsActions;

