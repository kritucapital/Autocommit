'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
    GitCommit,
    Plus,
    Trash2,
    Activity,
    Clock,
    CheckCircle,
    XCircle,
    LogOut,
    FolderGit2,
    Zap,
    X,
    Loader2,
    Play,
    Pause,
    Settings,
    Server,
    AlertTriangle,
    Menu,
    ChevronDown,
} from 'lucide-react';
import { useStore, Repository, ActivityLog } from '@/store/useStore';

export default function Dashboard() {
    const router = useRouter();
    const {
        isAuthenticated,
        email,
        username,
        avatarUrl,
        repositories,
        activityLog,
        isPolling,
        pollInterval,
        logout,
        setRepositories,
        addRepository,
        removeRepository,
        toggleRepoActive,
        addActivityLog,
        setPolling,
        setPollInterval,
        clearActivityLog,
    } = useStore();

    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [isAdding, setIsAdding] = useState(false);
    const [addError, setAddError] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [isBackgroundMonitoringEnabled, setIsBackgroundMonitoringEnabled] = useState(false);
    const [isTogglingMonitoring, setIsTogglingMonitoring] = useState(false);
    const [availableRepos, setAvailableRepos] = useState<Array<{
        owner: string;
        name: string;
        fullName: string;
        private: boolean;
        description: string | null;
        isMonitored: boolean;
    }>>([]);
    const [selectedRepos, setSelectedRepos] = useState<string[]>([]);
    const [repoSearchQuery, setRepoSearchQuery] = useState('');
    const [isFetchingRepos, setIsFetchingRepos] = useState(false);
    const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

    // Delete account states
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [deletePassword, setDeletePassword] = useState('');
    const [isDeleting, setIsDeleting] = useState(false);
    const [deleteError, setDeleteError] = useState('');

    // Navigation states
    const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    // Redirect if not authenticated, fetch data when authenticated and username is ready
    useEffect(() => {
        if (!isAuthenticated) {
            router.push('/');
        } else if (username) {
            // Only fetch when username is available (after hydration)
            setIsLoading(false);
            fetchRepositories();
            fetchMonitoringStatus();
        }
    }, [isAuthenticated, username, router]);

    // Fetch repositories from API
    const fetchRepositories = async () => {
        try {
            const response = await fetch('/api/repos', {
                headers: { 'x-github-username': username || '' },
            });
            const data = await response.json();
            if (data.success) {
                setRepositories(data.repositories);
            }
        } catch (error) {
            console.error('Failed to fetch repos:', error);
        }
    };

    // Fetch monitoring status from server
    const fetchMonitoringStatus = async () => {
        try {
            const response = await fetch('/api/monitoring', {
                headers: { 'x-github-username': username || '' },
            });
            const data = await response.json();
            if (data.success) {
                const isEnabled = data.isMonitoringEnabled === true;
                setIsBackgroundMonitoringEnabled(isEnabled);
                setPolling(isEnabled);
                if (data.pollInterval) {
                    setPollInterval(data.pollInterval);
                }
                console.log('Monitoring status loaded:', { isEnabled, pollInterval: data.pollInterval });
            }
        } catch (error) {
            console.error('Failed to fetch monitoring status:', error);
        }
    };

    // Toggle background monitoring (server-side)
    const handleToggleBackgroundMonitoring = async () => {
        setIsTogglingMonitoring(true);
        try {
            const response = await fetch('/api/monitoring', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-github-username': username || '',
                },
                body: JSON.stringify({
                    enabled: !isBackgroundMonitoringEnabled,
                    pollInterval,
                }),
            });
            const data = await response.json();
            if (data.success) {
                setIsBackgroundMonitoringEnabled(data.isMonitoringEnabled);
                setPolling(data.isMonitoringEnabled);
                addActivityLog({
                    repo: 'System',
                    action: data.isMonitoringEnabled ? 'Background Monitoring Enabled' : 'Background Monitoring Disabled',
                    message: data.message,
                    success: true,
                });
            }
        } catch (error) {
            console.error('Failed to toggle monitoring:', error);
            addActivityLog({
                repo: 'System',
                action: 'Monitoring Toggle Failed',
                message: 'Failed to toggle background monitoring',
                success: false,
            });
        } finally {
            setIsTogglingMonitoring(false);
        }
    };

    // Poll for commits
    const pollForCommits = useCallback(async () => {
        if (!username) return;

        try {
            const response = await fetch('/api/poll', {
                headers: { 'x-github-username': username },
            });
            const data = await response.json();

            if (data.success && data.results) {
                for (const result of data.results) {
                    if (result.autoCommitTriggered) {
                        addActivityLog({
                            repo: result.repo,
                            action: result.autoCommitSuccess ? 'Auto-Commit Success' : 'Auto-Commit Failed',
                            message: result.message,
                            success: result.autoCommitSuccess,
                        });
                    } else if (result.newCommit) {
                        addActivityLog({
                            repo: result.repo,
                            action: 'Commit Detected',
                            message: result.message,
                            success: true,
                        });
                    }
                }

                // Refresh repositories to get updated counts
                await fetchRepositories();
            }
        } catch (error) {
            console.error('Poll error:', error);
            addActivityLog({
                repo: 'System',
                action: 'Poll Error',
                message: 'Failed to check for commits',
                success: false,
            });
        }
    }, [username, addActivityLog]);

    // Start/stop polling
    useEffect(() => {
        if (isPolling && username) {
            // Poll immediately
            pollForCommits();

            // Set up interval
            pollIntervalRef.current = setInterval(pollForCommits, pollInterval);

            return () => {
                if (pollIntervalRef.current) {
                    clearInterval(pollIntervalRef.current);
                }
            };
        } else {
            if (pollIntervalRef.current) {
                clearInterval(pollIntervalRef.current);
            }
        }
    }, [isPolling, pollInterval, username, pollForCommits]);

    // Fetch available GitHub repos when modal opens
    const fetchAvailableRepos = async () => {
        setIsFetchingRepos(true);
        setAddError('');
        try {
            const response = await fetch('/api/github/repos', {
                headers: { 'x-github-username': username || '' },
            });
            const data = await response.json();
            if (data.success) {
                setAvailableRepos(data.repositories);
            } else {
                setAddError(data.error || 'Failed to fetch repositories');
            }
        } catch {
            setAddError('Failed to fetch repositories from GitHub');
        } finally {
            setIsFetchingRepos(false);
        }
    };

    // Open modal and fetch repos
    const openAddModal = () => {
        setIsAddModalOpen(true);
        setSelectedRepos([]);
        setRepoSearchQuery('');
        fetchAvailableRepos();
    };

    // Toggle repo selection
    const toggleRepoSelection = (fullName: string) => {
        setSelectedRepos(prev =>
            prev.includes(fullName)
                ? prev.filter(r => r !== fullName)
                : [...prev, fullName]
        );
    };

    // Handle add selected repositories
    const handleAddSelectedRepos = async () => {
        if (selectedRepos.length === 0) {
            setAddError('Please select at least one repository');
            return;
        }

        setIsAdding(true);
        setAddError('');

        let successCount = 0;
        let errorCount = 0;

        for (const fullName of selectedRepos) {
            const [owner, repo] = fullName.split('/');
            try {
                const response = await fetch('/api/repos', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'x-github-username': username || '',
                    },
                    body: JSON.stringify({ owner, repo }),
                });

                const data = await response.json();

                if (response.ok) {
                    addRepository(data.repository);
                    successCount++;
                    addActivityLog({
                        repo: data.repository.fullName,
                        action: 'Repository Added',
                        message: 'Started monitoring this repository',
                        success: true,
                    });
                } else {
                    errorCount++;
                }
            } catch {
                errorCount++;
            }
        }

        setIsAdding(false);

        if (errorCount === 0) {
            setIsAddModalOpen(false);
            setSelectedRepos([]);
        } else {
            setAddError(`Added ${successCount} repos. Failed to add ${errorCount} repos.`);
            // Refresh to update which are already monitored
            fetchAvailableRepos();
        }
    };

    // Filter repos by search query
    const filteredRepos = availableRepos.filter(repo =>
        repo.fullName.toLowerCase().includes(repoSearchQuery.toLowerCase()) ||
        (repo.description && repo.description.toLowerCase().includes(repoSearchQuery.toLowerCase()))
    );

    // Handle remove repository
    const handleRemoveRepo = async (repo: Repository) => {
        try {
            const response = await fetch('/api/repos', {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                    'x-github-username': username || '',
                },
                body: JSON.stringify({ owner: repo.owner, repo: repo.name }),
            });

            if (response.ok) {
                removeRepository(repo.fullName);
                addActivityLog({
                    repo: repo.fullName,
                    action: 'Repository Removed',
                    message: 'Stopped monitoring this repository',
                    success: true,
                });
            }
        } catch (error) {
            console.error('Failed to remove repo:', error);
        }
    };

    // Handle toggle monitoring
    const handleToggleMonitoring = async (repo: Repository) => {
        const newStatus = !repo.isActive;

        try {
            const response = await fetch('/api/monitor', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-github-username': username || '',
                },
                body: JSON.stringify({
                    owner: repo.owner,
                    repo: repo.name,
                    isActive: newStatus,
                }),
            });

            if (response.ok) {
                toggleRepoActive(repo.fullName, newStatus);
            }
        } catch (error) {
            console.error('Failed to toggle monitoring:', error);
        }
    };

    // Handle logout (note: background monitoring continues!)
    const handleLogout = () => {
        logout();
        router.push('/');
    };

    // Handle delete account
    const handleDeleteAccount = async () => {
        if (!email || !deletePassword) {
            setDeleteError('Password is required');
            return;
        }

        setIsDeleting(true);
        setDeleteError('');

        try {
            const response = await fetch('/api/auth/delete', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password: deletePassword }),
            });

            const data = await response.json();

            if (!response.ok) {
                setDeleteError(data.error || 'Failed to delete account');
                return;
            }

            // Successfully deleted - logout and redirect
            logout();
            router.push('/');
        } catch {
            setDeleteError('Something went wrong. Please try again.');
        } finally {
            setIsDeleting(false);
        }
    };

    // Format time ago
    const formatTimeAgo = (dateString: string | null) => {
        if (!dateString) return 'Never';
        const date = new Date(dateString);
        const now = new Date();
        const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

        if (seconds < 60) return 'Just now';
        if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
        if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
        return `${Math.floor(seconds / 86400)}d ago`;
    };

    // Calculate stats
    const totalAutoCommits = repositories.reduce((sum, r) => sum + r.autoCommitCount, 0);
    const activeRepos = repositories.filter((r) => r.isActive).length;

    if (isLoading) {
        return (
            <div className="gradient-bg" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
                <div className="spinner" style={{ width: '48px', height: '48px' }} />
            </div>
        );
    }

    return (
        <div className="gradient-bg">
            {/* Navbar */}
            <nav className="navbar">
                <div className="container navbar-content">
                    <a href="/" className="logo">
                        <div className="logo-icon">
                            <GitCommit size={24} color="white" />
                        </div>
                        <span>AutoCommit</span>
                    </a>

                    {/* Desktop User Menu */}
                    <div className="user-info" style={{ position: 'relative' }}>
                        <button
                            onClick={() => setIsUserDropdownOpen(!isUserDropdownOpen)}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.75rem',
                                background: 'none',
                                border: 'none',
                                cursor: 'pointer',
                                padding: '0.5rem',
                                borderRadius: '0.5rem',
                                transition: 'background 0.2s',
                            }}
                            className="user-menu-btn"
                        >
                            {avatarUrl && (
                                <img src={avatarUrl} alt={username || ''} className="avatar" />
                            )}
                            <span style={{ color: 'var(--text-secondary)' }}>@{username}</span>
                            <ChevronDown
                                size={18}
                                style={{
                                    color: 'var(--text-muted)',
                                    transform: isUserDropdownOpen ? 'rotate(180deg)' : 'rotate(0)',
                                    transition: 'transform 0.2s',
                                }}
                            />
                        </button>

                        {/* User Dropdown */}
                        <AnimatePresence>
                            {isUserDropdownOpen && (
                                <>
                                    {/* Backdrop */}
                                    <div
                                        style={{
                                            position: 'fixed',
                                            inset: 0,
                                            zIndex: 90,
                                        }}
                                        onClick={() => setIsUserDropdownOpen(false)}
                                    />
                                    <motion.div
                                        initial={{ opacity: 0, y: -10, scale: 0.95 }}
                                        animate={{ opacity: 1, y: 0, scale: 1 }}
                                        exit={{ opacity: 0, y: -10, scale: 0.95 }}
                                        transition={{ duration: 0.15 }}
                                        style={{
                                            position: 'absolute',
                                            top: 'calc(100% + 0.5rem)',
                                            right: 0,
                                            background: 'var(--bg-card)',
                                            border: '1px solid var(--border)',
                                            borderRadius: '0.75rem',
                                            padding: '0.5rem',
                                            minWidth: '180px',
                                            boxShadow: '0 10px 40px rgba(0, 0, 0, 0.3)',
                                            zIndex: 100,
                                        }}
                                    >
                                        <button
                                            onClick={() => {
                                                setIsUserDropdownOpen(false);
                                                setIsSettingsOpen(true);
                                            }}
                                            style={{
                                                width: '100%',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '0.75rem',
                                                padding: '0.75rem 1rem',
                                                background: 'none',
                                                border: 'none',
                                                borderRadius: '0.5rem',
                                                cursor: 'pointer',
                                                color: 'var(--text-primary)',
                                                fontSize: '0.9rem',
                                                transition: 'background 0.15s',
                                            }}
                                            className="dropdown-item"
                                        >
                                            <Settings size={18} />
                                            Settings
                                        </button>
                                        <div style={{ height: '1px', background: 'var(--border)', margin: '0.25rem 0' }} />
                                        <button
                                            onClick={() => {
                                                setIsUserDropdownOpen(false);
                                                handleLogout();
                                            }}
                                            style={{
                                                width: '100%',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '0.75rem',
                                                padding: '0.75rem 1rem',
                                                background: 'none',
                                                border: 'none',
                                                borderRadius: '0.5rem',
                                                cursor: 'pointer',
                                                color: 'var(--error)',
                                                fontSize: '0.9rem',
                                                transition: 'background 0.15s',
                                            }}
                                            className="dropdown-item"
                                        >
                                            <LogOut size={18} />
                                            Logout
                                        </button>
                                    </motion.div>
                                </>
                            )}
                        </AnimatePresence>
                    </div>

                    {/* Mobile Hamburger Button */}
                    <button
                        className="mobile-menu-btn"
                        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                        style={{
                            display: 'none',
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            color: 'var(--text-primary)',
                            padding: '0.5rem',
                        }}
                    >
                        {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
                    </button>
                </div>

                {/* Mobile Menu */}
                <AnimatePresence>
                    {isMobileMenuOpen && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="mobile-menu"
                            style={{
                                borderTop: '1px solid var(--border)',
                                padding: '1rem',
                            }}
                        >
                            <div className="container">
                                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                                    {avatarUrl && (
                                        <img src={avatarUrl} alt={username || ''} className="avatar" />
                                    )}
                                    <span style={{ color: 'var(--text-secondary)' }}>@{username}</span>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                    <button
                                        onClick={() => {
                                            setIsMobileMenuOpen(false);
                                            setIsSettingsOpen(true);
                                        }}
                                        className="btn btn-secondary"
                                        style={{ justifyContent: 'flex-start' }}
                                    >
                                        <Settings size={18} />
                                        Settings
                                    </button>
                                    <button
                                        onClick={() => {
                                            setIsMobileMenuOpen(false);
                                            handleLogout();
                                        }}
                                        className="btn btn-danger"
                                        style={{ justifyContent: 'flex-start' }}
                                    >
                                        <LogOut size={18} />
                                        Logout
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </nav>

            {/* Dashboard Content */}
            <main className="dashboard">
                <div className="container">
                    {/* Header */}
                    <motion.div
                        className="dashboard-header"
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                    >
                        <h1>Dashboard</h1>
                        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                            {isBackgroundMonitoringEnabled && (
                                <span style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.5rem',
                                    color: 'var(--success)',
                                    fontSize: '0.85rem',
                                }}>
                                    <Server size={16} />
                                    <span>Background Service Active</span>
                                </span>
                            )}
                            <button
                                onClick={() => setIsSettingsOpen(true)}
                                className="btn btn-secondary btn-sm"
                            >
                                <Settings size={18} />
                            </button>
                            <button
                                onClick={handleToggleBackgroundMonitoring}
                                className={`btn ${isBackgroundMonitoringEnabled ? 'btn-danger' : 'btn-primary'}`}
                                disabled={isTogglingMonitoring}
                            >
                                {isTogglingMonitoring ? (
                                    <>
                                        <Loader2 size={18} className="spinner" />
                                        <span>Updating...</span>
                                    </>
                                ) : isBackgroundMonitoringEnabled ? (
                                    <>
                                        <Pause size={18} />
                                        <span>Stop Monitoring</span>
                                    </>
                                ) : (
                                    <>
                                        <Play size={18} />
                                        <span>Start Monitoring</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </motion.div>

                    {/* Stats */}
                    <motion.div
                        className="stats-grid"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                    >
                        <div className="card stat-card">
                            <FolderGit2 size={32} style={{ color: 'var(--accent-secondary)', marginBottom: '0.5rem' }} />
                            <div className="stat-value">{repositories.length}</div>
                            <div className="stat-label">Total Repositories</div>
                        </div>
                        <div className="card stat-card">
                            <Activity size={32} style={{ color: 'var(--success)', marginBottom: '0.5rem' }} />
                            <div className="stat-value">{activeRepos}</div>
                            <div className="stat-label">Active Monitoring</div>
                        </div>
                        <div className="card stat-card">
                            <Zap size={32} style={{ color: 'var(--warning)', marginBottom: '0.5rem' }} />
                            <div className="stat-value">{totalAutoCommits}</div>
                            <div className="stat-label">Auto-Commits Made</div>
                        </div>
                        <div className="card stat-card">
                            <div
                                className={isPolling ? 'pulse' : ''}
                                style={{
                                    width: '16px',
                                    height: '16px',
                                    borderRadius: '50%',
                                    background: isPolling ? 'var(--success)' : 'var(--text-muted)',
                                    margin: '0 auto 0.5rem',
                                }}
                            />
                            <div className="stat-value" style={{ fontSize: '1.5rem' }}>
                                {isPolling ? 'Active' : 'Paused'}
                            </div>
                            <div className="stat-label">Polling Status</div>
                        </div>
                    </motion.div>

                    {/* Repositories Section */}
                    <motion.section
                        className="section"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                    >
                        <div className="section-header">
                            <h2>Monitored Repositories</h2>
                            <button
                                onClick={openAddModal}
                                className="btn btn-primary btn-sm"
                            >
                                <Plus size={18} />
                                <span>Add Repository</span>
                            </button>
                        </div>

                        {repositories.length === 0 ? (
                            <div className="card empty-state">
                                <FolderGit2 size={64} className="empty-state-icon" />
                                <h3>No repositories yet</h3>
                                <p style={{ marginTop: '0.5rem', marginBottom: '1.5rem' }}>
                                    Add your first repository to start monitoring for commits.
                                </p>
                                <button
                                    onClick={openAddModal}
                                    className="btn btn-primary"
                                >
                                    <Plus size={20} />
                                    <span>Add Repository</span>
                                </button>
                            </div>
                        ) : (
                            <div className="repo-list">
                                {repositories.map((repo, index) => (
                                    <motion.div
                                        key={repo.fullName}
                                        className="card repo-card"
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: index * 0.05 }}
                                    >
                                        <div className="repo-info">
                                            <div className="repo-name">{repo.fullName}</div>
                                            <div className="repo-meta">
                                                <span className={`badge ${repo.isActive ? 'badge-success' : 'badge-warning'}`}>
                                                    {repo.isActive ? 'Active' : 'Paused'}
                                                </span>
                                                <span>
                                                    <Clock size={14} style={{ marginRight: '0.25rem' }} />
                                                    {formatTimeAgo(repo.lastChecked)}
                                                </span>
                                                <span>
                                                    <Zap size={14} style={{ marginRight: '0.25rem' }} />
                                                    {repo.autoCommitCount} auto-commits
                                                </span>
                                            </div>
                                        </div>
                                        <div className="repo-actions">
                                            <label className="toggle">
                                                <input
                                                    type="checkbox"
                                                    checked={repo.isActive}
                                                    onChange={() => handleToggleMonitoring(repo)}
                                                />
                                                <span className="toggle-slider" />
                                            </label>
                                            <button
                                                onClick={() => handleRemoveRepo(repo)}
                                                className="btn btn-danger btn-icon"
                                                title="Remove repository"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        )}
                    </motion.section>

                    {/* Activity Log Section */}
                    <motion.section
                        className="section"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                    >
                        <div className="section-header">
                            <h2>Activity Log</h2>
                            {activityLog.length > 0 && (
                                <button onClick={clearActivityLog} className="btn btn-secondary btn-sm">
                                    Clear Log
                                </button>
                            )}
                        </div>

                        {activityLog.length === 0 ? (
                            <div className="card empty-state">
                                <Activity size={64} className="empty-state-icon" />
                                <h3>No activity yet</h3>
                                <p style={{ marginTop: '0.5rem' }}>
                                    Activity will appear here when commits are detected and auto-commits are made.
                                </p>
                            </div>
                        ) : (
                            <div className="card" style={{ padding: '1rem' }}>
                                <div className="activity-list">
                                    {activityLog.map((log) => (
                                        <ActivityItem key={log.id} log={log} />
                                    ))}
                                </div>
                            </div>
                        )}
                    </motion.section>
                </div>
            </main>

            {/* Add Repository Modal */}
            <AnimatePresence>
                {isAddModalOpen && (
                    <motion.div
                        className="modal-overlay"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setIsAddModalOpen(false)}
                    >
                        <motion.div
                            className="modal"
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="modal-header">
                                <h2>Add Repositories</h2>
                                <button
                                    className="modal-close"
                                    onClick={() => setIsAddModalOpen(false)}
                                >
                                    <X size={24} />
                                </button>
                            </div>
                            <div style={{ marginBottom: '1rem' }}>
                                <input
                                    type="text"
                                    className="input"
                                    placeholder="Search repositories..."
                                    value={repoSearchQuery}
                                    onChange={(e) => setRepoSearchQuery(e.target.value)}
                                />
                            </div>
                            {addError && <p className="error-message" style={{ marginBottom: '1rem' }}>{addError}</p>}
                            <div style={{
                                maxHeight: '300px',
                                overflowY: 'auto',
                                marginBottom: '1rem',
                                border: '1px solid var(--border)',
                                borderRadius: '8px',
                            }}>
                                {isFetchingRepos ? (
                                    <div style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        padding: '2rem',
                                        color: 'var(--text-muted)',
                                    }}>
                                        <Loader2 size={24} className="spinner" style={{ marginRight: '0.5rem' }} />
                                        <span>Loading repositories...</span>
                                    </div>
                                ) : filteredRepos.length === 0 ? (
                                    <div style={{
                                        padding: '2rem',
                                        textAlign: 'center',
                                        color: 'var(--text-muted)',
                                    }}>
                                        No repositories found
                                    </div>
                                ) : (
                                    filteredRepos.map((repo) => (
                                        <div
                                            key={repo.fullName}
                                            onClick={() => !repo.isMonitored && toggleRepoSelection(repo.fullName)}
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                padding: '0.75rem 1rem',
                                                borderBottom: '1px solid var(--border)',
                                                cursor: repo.isMonitored ? 'not-allowed' : 'pointer',
                                                opacity: repo.isMonitored ? 0.5 : 1,
                                                background: selectedRepos.includes(repo.fullName)
                                                    ? 'rgba(var(--accent-primary-rgb), 0.1)'
                                                    : 'transparent',
                                            }}
                                        >
                                            <input
                                                type="checkbox"
                                                checked={selectedRepos.includes(repo.fullName) || repo.isMonitored}
                                                disabled={repo.isMonitored}
                                                onChange={() => toggleRepoSelection(repo.fullName)}
                                                style={{ marginRight: '0.75rem', cursor: repo.isMonitored ? 'not-allowed' : 'pointer' }}
                                            />
                                            <div style={{ flex: 1 }}>
                                                <div style={{
                                                    fontWeight: 500,
                                                    color: 'var(--text-primary)',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '0.5rem',
                                                }}>
                                                    {repo.fullName}
                                                    {repo.private && (
                                                        <span style={{
                                                            fontSize: '0.7rem',
                                                            background: 'var(--warning)',
                                                            color: 'var(--bg-primary)',
                                                            padding: '0.1rem 0.4rem',
                                                            borderRadius: '4px',
                                                        }}>
                                                            Private
                                                        </span>
                                                    )}
                                                    {repo.isMonitored && (
                                                        <span style={{
                                                            fontSize: '0.7rem',
                                                            background: 'var(--success)',
                                                            color: 'var(--bg-primary)',
                                                            padding: '0.1rem 0.4rem',
                                                            borderRadius: '4px',
                                                        }}>
                                                            Already Monitored
                                                        </span>
                                                    )}
                                                </div>
                                                {repo.description && (
                                                    <div style={{
                                                        fontSize: '0.8rem',
                                                        color: 'var(--text-muted)',
                                                        marginTop: '0.25rem',
                                                    }}>
                                                        {repo.description.slice(0, 80)}{repo.description.length > 80 ? '...' : ''}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                            <div style={{
                                display: 'flex',
                                gap: '1rem',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                            }}>
                                <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                                    {selectedRepos.length} selected
                                </span>
                                <div style={{ display: 'flex', gap: '1rem' }}>
                                    <button
                                        type="button"
                                        onClick={() => setIsAddModalOpen(false)}
                                        className="btn btn-secondary"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleAddSelectedRepos}
                                        className="btn btn-primary"
                                        disabled={isAdding || selectedRepos.length === 0}
                                    >
                                        {isAdding ? (
                                            <>
                                                <Loader2 size={20} className="spinner" />
                                                <span>Adding...</span>
                                            </>
                                        ) : (
                                            <>
                                                <Plus size={20} />
                                                <span>Add {selectedRepos.length > 0 ? `(${selectedRepos.length})` : ''}</span>
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Settings Modal */}
            <AnimatePresence>
                {isSettingsOpen && (
                    <motion.div
                        className="modal-overlay"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setIsSettingsOpen(false)}
                    >
                        <motion.div
                            className="modal"
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="modal-header">
                                <h2>Settings</h2>
                                <button
                                    className="modal-close"
                                    onClick={() => setIsSettingsOpen(false)}
                                >
                                    <X size={24} />
                                </button>
                            </div>
                            <div className="input-group">
                                <label htmlFor="interval">Poll Interval (seconds)</label>
                                <input
                                    id="interval"
                                    type="number"
                                    className="input"
                                    min={10}
                                    max={300}
                                    value={pollInterval / 1000}
                                    onChange={(e) => setPollInterval(Number(e.target.value) * 1000)}
                                />
                                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '0.5rem' }}>
                                    How often to check for new commits (10-300 seconds)
                                </p>
                            </div>
                            <button
                                onClick={() => setIsSettingsOpen(false)}
                                className="btn btn-primary"
                                style={{ width: '100%' }}
                            >
                                Save Settings
                            </button>

                            {/* Danger Zone */}
                            <div style={{
                                marginTop: '2rem',
                                paddingTop: '1.5rem',
                                borderTop: '1px solid var(--border)'
                            }}>
                                <h3 style={{
                                    color: 'var(--error)',
                                    fontSize: '0.9rem',
                                    marginBottom: '0.75rem',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.5rem',
                                }}>
                                    <AlertTriangle size={16} />
                                    Danger Zone
                                </h3>
                                <button
                                    onClick={() => {
                                        setIsSettingsOpen(false);
                                        setIsDeleteModalOpen(true);
                                    }}
                                    className="btn btn-danger"
                                    style={{ width: '100%' }}
                                >
                                    <Trash2 size={18} />
                                    Delete Account
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Delete Account Confirmation Modal */}
            <AnimatePresence>
                {isDeleteModalOpen && (
                    <motion.div
                        className="modal-overlay"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => {
                            setIsDeleteModalOpen(false);
                            setDeletePassword('');
                            setDeleteError('');
                        }}
                    >
                        <motion.div
                            className="modal"
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="modal-header">
                                <h2 style={{ color: 'var(--error)' }}>Delete Account</h2>
                                <button
                                    className="modal-close"
                                    onClick={() => {
                                        setIsDeleteModalOpen(false);
                                        setDeletePassword('');
                                        setDeleteError('');
                                    }}
                                >
                                    <X size={24} />
                                </button>
                            </div>

                            <div style={{
                                background: 'rgba(239, 68, 68, 0.1)',
                                border: '1px solid var(--error)',
                                borderRadius: '0.75rem',
                                padding: '1rem',
                                marginBottom: '1.5rem',
                            }}>
                                <p style={{
                                    color: 'var(--error)',
                                    fontSize: '0.9rem',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.5rem',
                                }}>
                                    <AlertTriangle size={18} />
                                    This action cannot be undone!
                                </p>
                                <p style={{
                                    color: 'var(--text-muted)',
                                    fontSize: '0.85rem',
                                    marginTop: '0.5rem',
                                }}>
                                    All your data, repositories, and monitoring settings will be permanently deleted.
                                </p>
                            </div>

                            <div className="input-group">
                                <label htmlFor="delete-password">Enter your password to confirm</label>
                                <input
                                    id="delete-password"
                                    type="password"
                                    className={`input ${deleteError ? 'input-error' : ''}`}
                                    placeholder="••••••••"
                                    value={deletePassword}
                                    onChange={(e) => setDeletePassword(e.target.value)}
                                    disabled={isDeleting}
                                />
                                {deleteError && <p className="error-message">{deleteError}</p>}
                            </div>

                            <div style={{ display: 'flex', gap: '0.75rem' }}>
                                <button
                                    onClick={() => {
                                        setIsDeleteModalOpen(false);
                                        setDeletePassword('');
                                        setDeleteError('');
                                    }}
                                    className="btn btn-secondary"
                                    style={{ flex: 1 }}
                                    disabled={isDeleting}
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleDeleteAccount}
                                    className="btn btn-danger"
                                    style={{ flex: 1 }}
                                    disabled={isDeleting || !deletePassword}
                                >
                                    {isDeleting ? (
                                        <>
                                            <Loader2 size={18} className="spinner" />
                                            <span>Deleting...</span>
                                        </>
                                    ) : (
                                        <>
                                            <Trash2 size={18} />
                                            <span>Delete Forever</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

// Activity Item Component
function ActivityItem({ log }: { log: ActivityLog }) {
    const formatTime = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    return (
        <div className={`activity-item ${log.success ? 'success' : 'error'}`}>
            <div
                className="activity-icon"
                style={{
                    color: log.success ? 'var(--success)' : 'var(--error)',
                }}
            >
                {log.success ? <CheckCircle size={18} /> : <XCircle size={18} />}
            </div>
            <div className="activity-content">
                <div className="activity-title">
                    {log.action} - {log.repo}
                </div>
                <div className="activity-message">{log.message}</div>
                <div className="activity-time">{formatTime(log.timestamp)}</div>
            </div>
        </div>
    );
}
