export interface UserAddress {
  address: string;
  city: string;
  state: string;
  stateCode?: string;
  postalCode: string;
  country?: string;
}

export interface UserCompany {
  department: string;
  name: string;
  title: string;
  address?: UserAddress;
}

export interface DummyJsonUser {
  id: number;
  firstName: string;
  lastName: string;
  maidenName?: string;
  age: number;
  gender: string;
  email: string;
  phone: string;
  username: string;
  birthDate?: string;
  image: string;
  bloodGroup?: string;
  height?: number;
  weight?: number;
  eyeColor?: string;
  hair?: {
    color: string;
    type: string;
  };
  address?: UserAddress;
  university?: string;
  company?: UserCompany;
  role?: string;
}

export interface UsersResponse {
  users: DummyJsonUser[];
  total: number;
  skip: number;
  limit: number;
}

export interface UsersFilterParams {
  limit?: number;
  skip?: number;
  search?: string;
}

export interface UsersState {
  users: DummyJsonUser[];
  selectedUser: DummyJsonUser | null;
  total: number;
  limit: number;
  skip: number;
  searchQuery: string;
  isLoading: boolean;
  isLoadingDetail: boolean;
  error: string | null;
}

export interface UsersActions {
  setSearchQuery: (query: string) => void;
  setPagination: (page: number, limit?: number) => void;
  fetchUsers: () => Promise<void>;
  fetchUserById: (id: number | string) => Promise<void>;
  clearSelectedUser: () => void;
  clearError: () => void;
}

export type UsersStore = UsersState & UsersActions;

