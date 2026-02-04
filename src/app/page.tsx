'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { GitCommit, Zap, Shield, Clock, Github, ArrowRight, Loader2 } from 'lucide-react';
import { useStore } from '@/store/useStore';

export default function Home() {
    const [token, setToken] = useState('');
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

        if (!token.trim()) {
            setError('Please enter your GitHub token');
            return;
        }

        setIsLoading(true);

        try {
            const response = await fetch('/api/auth/validate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token }),
            });

            const data = await response.json();

            if (!response.ok) {
                setError(data.error || 'Failed to validate token');
                return;
            }

            setUser(data.user.username, data.user.avatarUrl, token);
            router.push('/dashboard');
        } catch {
            setError('Something went wrong. Please try again.');
        } finally {
            setIsLoading(false);
        }
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

                        {/* Token Form */}
                        <motion.form
                            onSubmit={handleSubmit}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.6, delay: 0.2 }}
                        >
                            <div className="input-group">
                                <label htmlFor="token">GitHub Personal Access Token</label>
                                <input
                                    id="token"
                                    type="password"
                                    className={`input ${error ? 'input-error' : ''}`}
                                    placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                                    value={token}
                                    onChange={(e) => setToken(e.target.value)}
                                    disabled={isLoading}
                                />
                                {error && <p className="error-message">{error}</p>}
                            </div>
                            <button type="submit" className="btn btn-primary" disabled={isLoading}>
                                {isLoading ? (
                                    <>
                                        <Loader2 size={20} className="spinner" />
                                        <span>Validating...</span>
                                    </>
                                ) : (
                                    <>
                                        <span>Get Started</span>
                                        <ArrowRight size={20} />
                                    </>
                                )}
                            </button>
                        </motion.form>

                        <motion.p
                            style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '1rem' }}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ duration: 0.6, delay: 0.3 }}
                        >
                            Your token needs <strong>repo</strong> scope. We never store it in plain text.
                        </motion.p>
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
