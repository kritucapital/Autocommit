'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { GitCommit, Zap, Shield, Clock, Github, ArrowRight, Loader2, Mail, Lock, Eye, EyeOff } from 'lucide-react';
import { useStore } from '@/store/useStore';

type AuthMode = 'login' | 'signup';

export default function Home() {
    const [authMode, setAuthMode] = useState<AuthMode>('login');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [token, setToken] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const router = useRouter();
    const { setUser, isAuthenticated } = useStore();

    // Redirect if already authenticated
    useEffect(() => {
        if (isAuthenticated) {
            router.push('/dashboard');
        }
    }, [isAuthenticated, router]);

    // Show nothing while redirecting
    if (isAuthenticated) {
        return null;
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!email.trim() || !password.trim()) {
            setError('Please fill in all fields');
            return;
        }

        if (authMode === 'signup' && !token.trim()) {
            setError('GitHub token is required for signup');
            return;
        }

        setIsLoading(true);

        try {
            const endpoint = authMode === 'login' ? '/api/auth/login' : '/api/auth/signup';
            const body = authMode === 'login'
                ? { email, password }
                : { email, password, token };

            const response = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });

            const data = await response.json();

            if (!response.ok) {
                setError(data.error || 'Authentication failed');
                return;
            }

            setUser(data.user.email, data.user.username, data.user.avatarUrl);
            router.push('/dashboard');
        } catch {
            setError('Something went wrong. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    const switchMode = () => {
        setAuthMode(authMode === 'login' ? 'signup' : 'login');
        setError('');
        setToken('');
    };

    return (
        <>
            {/* Navbar */}
            <nav className="navbar">
                <div className="container navbar-content">
                    <a href="/" className="logo">
                        <div className="logo-icon">
                            <GitCommit size={24} color="white" />
                        </div>
                        <span>AutoCommit</span>
                    </a>
                    <a
                        href="https://github.com/settings/tokens/new"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn btn-secondary btn-sm"
                    >
                        <Github size={18} />
                        <span>Get Token</span>
                    </a>
                </div>
            </nav>

            {/* Hero Section */}
            <section className="hero">
                <div className="container">
                    <div className="hero-content">
                        <motion.h1
                            className="hero-title"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.6 }}
                        >
                            Never Miss a <span>Commit</span> Again
                        </motion.h1>
                        <motion.p
                            className="hero-description"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.6, delay: 0.1 }}
                        >
                            AutoCommit automatically updates your README whenever a collaborator
                            pushes to your repository. Stay active and engaged with minimal effort.
                        </motion.p>

                        {/* Auth Form */}
                        <motion.div
                            className="card"
                            style={{
                                padding: '2rem',
                                maxWidth: '400px',
                                margin: '0 auto',
                                background: 'rgba(15, 23, 42, 0.8)',
                                backdropFilter: 'blur(10px)',
                            }}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.6, delay: 0.2 }}
                        >
                            {/* Auth Tabs */}
                            <div style={{
                                display: 'flex',
                                marginBottom: '1.5rem',
                                borderRadius: '8px',
                                background: 'var(--bg-secondary)',
                                padding: '4px',
                            }}>
                                <button
                                    type="button"
                                    onClick={() => { setAuthMode('login'); setError(''); }}
                                    style={{
                                        flex: 1,
                                        padding: '0.75rem',
                                        border: 'none',
                                        borderRadius: '6px',
                                        cursor: 'pointer',
                                        fontWeight: 500,
                                        transition: 'all 0.2s',
                                        background: authMode === 'login' ? 'var(--accent-primary)' : 'transparent',
                                        color: authMode === 'login' ? 'white' : 'var(--text-secondary)',
                                    }}
                                >
                                    Login
                                </button>
                                <button
                                    type="button"
                                    onClick={() => { setAuthMode('signup'); setError(''); }}
                                    style={{
                                        flex: 1,
                                        padding: '0.75rem',
                                        border: 'none',
                                        borderRadius: '6px',
                                        cursor: 'pointer',
                                        fontWeight: 500,
                                        transition: 'all 0.2s',
                                        background: authMode === 'signup' ? 'var(--accent-primary)' : 'transparent',
                                        color: authMode === 'signup' ? 'white' : 'var(--text-secondary)',
                                    }}
                                >
                                    Sign Up
                                </button>
                            </div>

                            <form onSubmit={handleSubmit}>
                                {/* Email Field */}
                                <div className="input-group">
                                    <label htmlFor="email">
                                        <Mail size={16} style={{ marginRight: '0.5rem', verticalAlign: 'middle' }} />
                                        Email
                                    </label>
                                    <input
                                        id="email"
                                        type="email"
                                        className={`input ${error ? 'input-error' : ''}`}
                                        placeholder="you@example.com"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        disabled={isLoading}
                                        autoComplete="email"
                                    />
                                </div>

                                {/* Password Field */}
                                <div className="input-group">
                                    <label htmlFor="password">
                                        <Lock size={16} style={{ marginRight: '0.5rem', verticalAlign: 'middle' }} />
                                        Password
                                    </label>
                                    <div style={{ position: 'relative' }}>
                                        <input
                                            id="password"
                                            type={showPassword ? 'text' : 'password'}
                                            className={`input ${error ? 'input-error' : ''}`}
                                            placeholder="••••••••"
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            disabled={isLoading}
                                            autoComplete={authMode === 'login' ? 'current-password' : 'new-password'}
                                            style={{ paddingRight: '3rem' }}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            style={{
                                                position: 'absolute',
                                                right: '12px',
                                                top: '50%',
                                                transform: 'translateY(-50%)',
                                                background: 'none',
                                                border: 'none',
                                                cursor: 'pointer',
                                                color: 'var(--text-muted)',
                                                padding: '4px',
                                            }}
                                        >
                                            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                        </button>
                                    </div>
                                </div>

                                {/* GitHub Token (only for signup) */}
                                {authMode === 'signup' && (
                                    <motion.div
                                        className="input-group"
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: 'auto' }}
                                        transition={{ duration: 0.3 }}
                                    >
                                        <label htmlFor="token">
                                            <Github size={16} style={{ marginRight: '0.5rem', verticalAlign: 'middle' }} />
                                            GitHub Personal Access Token
                                        </label>
                                        <input
                                            id="token"
                                            type="password"
                                            className="input"
                                            placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                                            value={token}
                                            onChange={(e) => setToken(e.target.value)}
                                            disabled={isLoading}
                                        />
                                        <p style={{
                                            fontSize: '0.75rem',
                                            color: 'var(--text-muted)',
                                            marginTop: '0.5rem'
                                        }}>
                                            Token needs <strong>repo</strong> scope.
                                            <a
                                                href="https://github.com/settings/tokens/new"
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                style={{ color: 'var(--accent-primary)', marginLeft: '0.25rem' }}
                                            >
                                                Create one here
                                            </a>
                                        </p>
                                    </motion.div>
                                )}

                                {error && <p className="error-message">{error}</p>}

                                <button
                                    type="submit"
                                    className="btn btn-primary"
                                    disabled={isLoading}
                                    style={{ width: '100%', marginTop: '1rem' }}
                                >
                                    {isLoading ? (
                                        <>
                                            <Loader2 size={20} className="spinner" />
                                            <span>{authMode === 'login' ? 'Logging in...' : 'Creating account...'}</span>
                                        </>
                                    ) : (
                                        <>
                                            <span>{authMode === 'login' ? 'Login' : 'Create Account'}</span>
                                            <ArrowRight size={20} />
                                        </>
                                    )}
                                </button>
                            </form>

                            <p style={{
                                textAlign: 'center',
                                marginTop: '1rem',
                                color: 'var(--text-muted)',
                                fontSize: '0.9rem',
                            }}>
                                {authMode === 'login' ? (
                                    <>
                                        Don&apos;t have an account?{' '}
                                        <button
                                            type="button"
                                            onClick={switchMode}
                                            style={{
                                                background: 'none',
                                                border: 'none',
                                                color: 'var(--accent-primary)',
                                                cursor: 'pointer',
                                                fontWeight: 500,
                                            }}
                                        >
                                            Sign up
                                        </button>
                                    </>
                                ) : (
                                    <>
                                        Already have an account?{' '}
                                        <button
                                            type="button"
                                            onClick={switchMode}
                                            style={{
                                                background: 'none',
                                                border: 'none',
                                                color: 'var(--accent-primary)',
                                                cursor: 'pointer',
                                                fontWeight: 500,
                                            }}
                                        >
                                            Login
                                        </button>
                                    </>
                                )}
                            </p>
                        </motion.div>
                    </div>

                    {/* Features */}
                    <motion.div
                        className="features-grid"
                        initial={{ opacity: 0, y: 40 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8, delay: 0.4 }}
                    >
                        <div className="card feature-card">
                            <div className="feature-icon">
                                <Zap size={24} />
                            </div>
                            <h3 className="feature-title">Instant Detection</h3>
                            <p className="feature-description">
                                Monitors your repositories in real-time and detects collaborator commits instantly.
                            </p>
                        </div>

                        <div className="card feature-card">
                            <div className="feature-icon">
                                <Shield size={24} />
                            </div>
                            <h3 className="feature-title">Smart Commits</h3>
                            <p className="feature-description">
                                Makes subtle README updates that maintain your commit streak without spam.
                            </p>
                        </div>

                        <div className="card feature-card">
                            <div className="feature-icon">
                                <Clock size={24} />
                            </div>
                            <h3 className="feature-title">Always Active</h3>
                            <p className="feature-description">
                                Set it and forget it. AutoCommit runs in the background while you focus on what matters.
                            </p>
                        </div>
                    </motion.div>
                </div>
            </section>
        </>
    );
}
