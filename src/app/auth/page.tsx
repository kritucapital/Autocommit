'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { GitCommit, Github, ArrowRight, Loader2, Mail, Lock, Eye, EyeOff, ArrowLeft } from 'lucide-react';
import { useStore } from '@/store/useStore';
import Link from 'next/link';

type AuthMode = 'login' | 'signup';

function AuthForm() {
    const searchParams = useSearchParams();
    const initialMode = searchParams.get('mode') === 'signup' ? 'signup' : 'login';

    const [authMode, setAuthMode] = useState<AuthMode>(initialMode);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [token, setToken] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const router = useRouter();
    const { setUser, isAuthenticated } = useStore();

    // Update mode when URL changes
    useEffect(() => {
        const mode = searchParams.get('mode') === 'signup' ? 'signup' : 'login';
        setAuthMode(mode);
    }, [searchParams]);

    // Redirect if already authenticated
    useEffect(() => {
        if (isAuthenticated) {
            router.push('/dashboard');
        }
    }, [isAuthenticated, router]);

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

    const switchMode = (mode: AuthMode) => {
        setAuthMode(mode);
        setError('');
        setToken('');
        // Update URL without navigation
        window.history.replaceState(null, '', mode === 'signup' ? '/auth?mode=signup' : '/auth');
    };

    return (
        <>
            {/* Navbar */}
            <nav className="navbar">
                <div className="container navbar-content">
                    <Link href="/" className="logo">
                        <div className="logo-icon">
                            <GitCommit size={24} color="white" />
                        </div>
                        <span>AutoCommit</span>
                    </Link>
                    <Link href="/" className="btn btn-secondary btn-sm">
                        <ArrowLeft size={18} />
                        <span>Back to Home</span>
                    </Link>
                </div>
            </nav>

            {/* Auth Section */}
            <section className="hero" style={{ paddingTop: '8rem' }}>
                <div className="container">
                    <div className="hero-content" style={{ maxWidth: '450px' }}>
                        <motion.h1
                            className="hero-title"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5 }}
                            style={{ fontSize: 'clamp(1.75rem, 4vw, 2.25rem)', marginBottom: '0.5rem' }}
                        >
                            {authMode === 'login' ? 'Welcome Back' : 'Create Account'}
                        </motion.h1>
                        <motion.p
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5, delay: 0.1 }}
                            style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}
                        >
                            {authMode === 'login'
                                ? 'Sign in to access your dashboard'
                                : 'Get started with AutoCommit'}
                        </motion.p>

                        {/* Auth Form Card */}
                        <motion.div
                            className="card"
                            style={{
                                padding: '2rem',
                                background: 'rgba(15, 23, 42, 0.8)',
                                backdropFilter: 'blur(10px)',
                            }}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5, delay: 0.2 }}
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
                                    onClick={() => switchMode('login')}
                                    style={{
                                        flex: 1,
                                        padding: '0.75rem',
                                        border: 'none',
                                        borderRadius: '6px',
                                        cursor: 'pointer',
                                        fontWeight: 500,
                                        fontSize: '0.95rem',
                                        transition: 'all 0.2s',
                                        background: authMode === 'login' ? 'var(--accent-primary)' : 'transparent',
                                        color: authMode === 'login' ? 'white' : 'var(--text-secondary)',
                                    }}
                                >
                                    Login
                                </button>
                                <button
                                    type="button"
                                    onClick={() => switchMode('signup')}
                                    style={{
                                        flex: 1,
                                        padding: '0.75rem',
                                        border: 'none',
                                        borderRadius: '6px',
                                        cursor: 'pointer',
                                        fontWeight: 500,
                                        fontSize: '0.95rem',
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
                                            <span>{authMode === 'login' ? 'Signing in...' : 'Creating account...'}</span>
                                        </>
                                    ) : (
                                        <>
                                            <span>{authMode === 'login' ? 'Sign In' : 'Create Account'}</span>
                                            <ArrowRight size={20} />
                                        </>
                                    )}
                                </button>
                            </form>
                        </motion.div>
                    </div>
                </div>
            </section>
        </>
    );
}

export default function AuthPage() {
    return (
        <Suspense fallback={
            <div className="gradient-bg" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
                <div className="spinner" style={{ width: '48px', height: '48px' }} />
            </div>
        }>
            <AuthForm />
        </Suspense>
    );
}
