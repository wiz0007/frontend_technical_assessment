import { create } from 'zustand';
import type { UsersStore } from '@/types/users';
import { fetchUsers as apiFetchUsers, fetchUserById as apiFetchUserById, isCancelledError } from '@/lib/api';
import { ListResponseCache } from '@/lib/list-cache';
import type { UsersResponse } from '@/types/users';
import { rankSearchResults } from '@/lib/search-ranking';

const usersListCache = new ListResponseCache<UsersResponse>({ ttlMs: 60_000, maxEntries: 100 });
const usersCacheKey = (limit: number, skip: number, search: string) => `${limit}:${skip}:${search.trim().toLowerCase()}`;

let listController: AbortController | null = null;
let listRequestId = 0;
let detailController: AbortController | null = null;
let detailRequestId = 0;

export const useUsersStore = create<UsersStore>((set, get) => ({
  users: [], selectedUser: null, total: 0, limit: 10, skip: 0, searchQuery: '',
  isLoading: false, isLoadingDetail: false, listError: null, detailError: null,
  setSearchQuery: (query) => set({ searchQuery: query, skip: 0 }),
  setPagination: (page, newLimit) => {
    const limit = newLimit ?? get().limit;
    set({ skip: Math.max(0, (page - 1) * limit), limit });
  },
  fetchUsers: async (force = false) => {
    listController?.abort();
    const controller = new AbortController(); listController = controller;
    const requestId = ++listRequestId;
    const { limit, skip, searchQuery } = get();
    const cacheKey = usersCacheKey(limit, skip, searchQuery);
    if (!force) {
      const cached = usersListCache.get(cacheKey);
      if (cached) {
        set({ users: cached.users, total: cached.total, isLoading: false, listError: null });
        listController = null;
        return;
      }
    }
    set({ isLoading: true, listError: null });
    try {
      const response = await apiFetchUsers({ limit, skip, search: searchQuery }, { signal: controller.signal });
      if (requestId !== listRequestId) return;
      const rankedUsers = searchQuery
        ? rankSearchResults(response.users, searchQuery,
            (user) => `${user.firstName} ${user.lastName}`,
            (user) => `${user.username} ${user.email} ${user.phone} ${user.company?.name ?? ''}`)
        : response.users;
      const rankedResponse = { ...response, users: rankedUsers };
      usersListCache.set(cacheKey, rankedResponse);
      set({ users: rankedResponse.users, total: rankedResponse.total, isLoading: false, listError: null });
    } catch (err) {
      if (requestId !== listRequestId) return;
      if (isCancelledError(err)) { set({ isLoading: false }); return; }
      set({ listError: err instanceof Error ? err.message : 'Unable to load users. Please try again.', isLoading: false });
    } finally {
      if (requestId === listRequestId) listController = null;
    }
  },
  fetchUserById: async (id) => {
    detailController?.abort();
    const controller = new AbortController(); detailController = controller;
    const requestId = ++detailRequestId;
    set({ isLoadingDetail: true, detailError: null, selectedUser: null });
    try {
      const user = await apiFetchUserById(id, { signal: controller.signal });
      if (requestId !== detailRequestId) return;
      set({ selectedUser: user, isLoadingDetail: false, detailError: null });
    } catch (err) {
      if (requestId !== detailRequestId) return;
      if (isCancelledError(err)) { set({ isLoadingDetail: false }); return; }
      set({ detailError: err instanceof Error ? err.message : `Failed to load user #${id}.`, isLoadingDetail: false });
    } finally {
      if (requestId === detailRequestId) detailController = null;
    }
  },
  cancelUserDetailRequest: () => {
    detailRequestId++; detailController?.abort(); detailController = null;
    set({ isLoadingDetail: false });
  },
  clearSelectedUser: () => {
    detailRequestId++; detailController?.abort(); detailController = null;
    set({ selectedUser: null, isLoadingDetail: false, detailError: null });
  },
  clearListError: () => set({ listError: null }),
  clearDetailError: () => set({ detailError: null }),
}));
