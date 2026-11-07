import { create } from 'zustand';
import { UsersStore } from '@/types/users';
import {
  fetchUsers as apiFetchUsers,
  fetchUserById as apiFetchUserById,
  isCancelledError,
} from '@/lib/api';

let activeUsersAbortController: AbortController | null = null;
let activeUsersRequestId = 0;

let activeUserDetailAbortController: AbortController | null = null;
let activeUserDetailRequestId = 0;

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
    if (activeUsersAbortController) {
      activeUsersAbortController.abort();
    }
    const controller = new AbortController();
    activeUsersAbortController = controller;

    const requestId = ++activeUsersRequestId;
    const { limit, skip, searchQuery } = get();

    set({ isLoading: true, error: null });

    try {
      const response = await apiFetchUsers(
        {
          limit,
          skip,
          search: searchQuery,
        },
        { signal: controller.signal }
      );

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
      if (isCancelledError(err)) {
        // Request was intentionally superseded; discard cleanly without setting error
        return;
      }
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
    if (activeUserDetailAbortController) {
      activeUserDetailAbortController.abort();
    }
    const controller = new AbortController();
    activeUserDetailAbortController = controller;

    const requestId = ++activeUserDetailRequestId;
    set({ isLoadingDetail: true, error: null, selectedUser: null });

    try {
      const user = await apiFetchUserById(id, { signal: controller.signal });
      if (requestId === activeUserDetailRequestId) {
        set({
          selectedUser: user,
          isLoadingDetail: false,
          error: null,
        });
      }
    } catch (err: unknown) {
      if (isCancelledError(err)) {
        // Request superseded by newer user navigation; do not overwrite UI state
        return;
      }
      if (requestId === activeUserDetailRequestId) {
        const message =
          err instanceof Error
            ? err.message
            : `Failed to load details for user #${id}.`;
        set({
          error: message,
          isLoadingDetail: false,
        });
      }
    }
  },

  cancelUserDetailRequest: () => {
    if (activeUserDetailAbortController) {
      activeUserDetailAbortController.abort();
      activeUserDetailAbortController = null;
    }
    activeUserDetailRequestId++;
    set({ isLoadingDetail: false });
  },

  clearSelectedUser: () => {
    if (activeUserDetailAbortController) {
      activeUserDetailAbortController.abort();
      activeUserDetailAbortController = null;
    }
    activeUserDetailRequestId++;
    set({ selectedUser: null, isLoadingDetail: false });
  },

  clearError: () => set({ error: null }),
}));

