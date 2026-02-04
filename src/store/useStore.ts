import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface Repository {
    owner: string;
    name: string;
    fullName: string;
    isActive: boolean;
    lastCommitSha: string | null;
    lastCommitAuthor: string | null;
    lastChecked: string | null;
    autoCommitCount: number;
}

export interface ActivityLog {
    id: string;
    repo: string;
    action: string;
    message: string;
    timestamp: string;
    success: boolean;
}

interface UserState {
    isAuthenticated: boolean;
    email: string | null;
    username: string | null;
    avatarUrl: string | null;
    token: string | null;
    repositories: Repository[];
    activityLog: ActivityLog[];
    isPolling: boolean;
    pollInterval: number;

    // Actions
    setUser: (email: string, username: string, avatarUrl: string, token?: string) => void;
    logout: () => void;
    setRepositories: (repos: Repository[]) => void;
    addRepository: (repo: Repository) => void;
    removeRepository: (fullName: string) => void;
    toggleRepoActive: (fullName: string, isActive: boolean) => void;
    addActivityLog: (log: Omit<ActivityLog, 'id' | 'timestamp'>) => void;
    setActivityLog: (logs: ActivityLog[]) => void;
    setPolling: (isPolling: boolean) => void;
    setPollInterval: (interval: number) => void;
    clearActivityLog: () => void;
}

export const useStore = create<UserState>()(
    persist(
        (set) => ({
            isAuthenticated: false,
            email: null,
            username: null,
            avatarUrl: null,
            token: null,
            repositories: [],
            activityLog: [],
            isPolling: false,
            pollInterval: 30000, // 30 seconds default

            setUser: (email, username, avatarUrl, token) =>
                set({
                    isAuthenticated: true,
                    email,
                    username,
                    avatarUrl,
                    token: token || null,
                }),

            logout: () =>
                set({
                    isAuthenticated: false,
                    email: null,
                    username: null,
                    avatarUrl: null,
                    token: null,
                    repositories: [],
                    activityLog: [],
                    isPolling: false,
                }),

            setRepositories: (repos) => set({ repositories: repos }),

            addRepository: (repo) =>
                set((state) => ({
                    repositories: [...state.repositories, repo],
                })),

            removeRepository: (fullName) =>
                set((state) => ({
                    repositories: state.repositories.filter((r) => r.fullName !== fullName),
                })),

            toggleRepoActive: (fullName, isActive) =>
                set((state) => ({
                    repositories: state.repositories.map((r) =>
                        r.fullName === fullName ? { ...r, isActive } : r
                    ),
                })),

            addActivityLog: (log) =>
                set((state) => ({
                    activityLog: [
                        {
                            ...log,
                            id: Math.random().toString(36).substring(7),
                            timestamp: new Date().toISOString(),
                        },
                        ...state.activityLog.slice(0, 49), // Keep last 50 entries
                    ],
                })),

            setActivityLog: (logs) => set({ activityLog: logs }),

            setPolling: (isPolling) => set({ isPolling }),

            setPollInterval: (interval) => set({ pollInterval: interval }),

            clearActivityLog: () => set({ activityLog: [] }),
        }),
        {
            name: 'autocommit-storage',
            partialize: (state) => ({
                isAuthenticated: state.isAuthenticated,
                email: state.email,
                username: state.username,
                avatarUrl: state.avatarUrl,
                token: state.token,
                pollInterval: state.pollInterval,
                isPolling: state.isPolling,
            }),
        }
    )
);
