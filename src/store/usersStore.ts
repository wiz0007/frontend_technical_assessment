import { create } from 'zustand';
import { UsersStore } from '@/types/users';
import { fetchUsers as apiFetchUsers, fetchUserById as apiFetchUserById } from '@/lib/api';

let activeUsersRequestId = 0;

export const useUsersStore = create<UsersStore>((set, get) => ({
  users: [],
  selectedUser: null,
  total: 0,
  limit: 10,
  skip: 0,
  searchQuery: '',
  isLoading: false,
  isLoadingDetail: false,
  error: null,

  setSearchQuery: (query: string) => {
    // Reset to page 1 whenever search query changes
    set({ searchQuery: query, skip: 0 });
  },

  setPagination: (page: number, newLimit?: number) => {
    const currentLimit = newLimit ?? get().limit;
    const newSkip = Math.max(0, (page - 1) * currentLimit);
    set({ skip: newSkip, limit: currentLimit });
  },

  fetchUsers: async () => {
    const requestId = ++activeUsersRequestId;
    const { limit, skip, searchQuery } = get();

    set({ isLoading: true, error: null });

    try {
      const response = await apiFetchUsers({
        limit,
        skip,
        search: searchQuery,
      });

      // Avoid race conditions: only update if this is the latest request
      if (requestId === activeUsersRequestId) {
        set({
          users: response.users,
          total: response.total,
          isLoading: false,
          error: null,
        });
      }
    } catch (err: unknown) {
      if (requestId === activeUsersRequestId) {
        const message =
          err instanceof Error
            ? err.message
            : 'Unable to load users. Please check your connection and try again.';
        set({
          error: message,
          isLoading: false,
        });
      }
    }
  },

  fetchUserById: async (id: number | string) => {
    set({ isLoadingDetail: true, error: null, selectedUser: null });

    try {
      const user = await apiFetchUserById(id);
      set({
        selectedUser: user,
        isLoadingDetail: false,
        error: null,
      });
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : `Failed to load details for user #${id}.`;
      set({
        error: message,
        isLoadingDetail: false,
      });
    }
  },

  clearSelectedUser: () => set({ selectedUser: null }),
  clearError: () => set({ error: null }),
}));

