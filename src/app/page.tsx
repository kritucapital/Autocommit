'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { GitCommit, Zap, Shield, Clock, Github, ArrowRight, UserPlus, LogIn, Check } from 'lucide-react';
import { useStore } from '@/store/useStore';
import Link from 'next/link';

export default function Home() {
    const router = useRouter();
    const { isAuthenticated } = useStore();

    // Redirect if already authenticated
    useEffect(() => {
        if (isAuthenticated) {
            router.push('/dashboard');
        }
    }, [isAuthenticated, router]);

    if (isAuthenticated) {
        return null;
    }

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
                    <div className="nav-buttons" style={{ display: 'flex', gap: '0.75rem' }}>
                        <Link href="/auth" className="btn btn-secondary btn-sm">
                            <LogIn size={18} />
                            <span>Login</span>
                        </Link>
                        <Link href="/auth?mode=signup" className="btn btn-primary btn-sm">
                            <UserPlus size={18} />
                            <span>Sign Up</span>
                        </Link>
                    </div>
                </div>
            </nav>

            {/* Hero Section */}
            <section className="hero">
                <div className="container">
                    <div className="hero-content" style={{ maxWidth: '700px' }}>
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.6 }}
                            style={{ marginBottom: '1rem' }}
                        >
                            <span className="badge badge-info" style={{ fontSize: '0.8rem', padding: '0.5rem 1rem' }}>
                                <Zap size={14} />
                                Automated Commit Tracking
                            </span>
                        </motion.div>

                        <motion.h1
                            className="hero-title"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.6, delay: 0.1 }}
                            style={{ fontSize: 'clamp(2.5rem, 6vw, 3.5rem)' }}
                        >
                            Never Miss a <span>Commit</span> Again
                        </motion.h1>

                        <motion.p
                            className="hero-description"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.6, delay: 0.2 }}
                        >
                            AutoCommit monitors your repositories and automatically updates your README
                            when collaborators push changes. Stay active with zero effort.
                        </motion.p>

                        {/* CTA Buttons */}
                        <motion.div
                            className="cta-buttons"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.6, delay: 0.3 }}
                            style={{
                                display: 'flex',
                                gap: '1rem',
                                justifyContent: 'center',
                                flexWrap: 'wrap',
                            }}
                        >
                            <Link
                                href="/auth?mode=signup"
                                className="btn btn-primary cta-btn"
                            >
                                <UserPlus size={20} />
                                <span>New User? Sign Up</span>
                                <ArrowRight size={18} />
                            </Link>
                            <Link
                                href="/auth"
                                className="btn btn-secondary cta-btn"
                            >
                                <LogIn size={20} />
                                <span>Already a User? Login</span>
                            </Link>
                        </motion.div>
                    </div>

                    {/* Features */}
                    <motion.div
                        className="features-grid"
                        initial={{ opacity: 0, y: 40 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8, delay: 0.5 }}
                        style={{ marginTop: '4rem' }}
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
                                <Clock size={24} />
                            </div>
                            <h3 className="feature-title">Always Active</h3>
                            <p className="feature-description">
                                Background monitoring runs 24/7 even when you're offline or logged out.
                            </p>
                        </div>
                    </motion.div>

                    {/* How it works */}
                    <motion.div
                        initial={{ opacity: 0, y: 40 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8, delay: 0.7 }}
                        style={{ marginTop: '4rem', textAlign: 'center' }}
                    >
                        <h2 style={{ marginBottom: '2rem', fontSize: 'clamp(1.25rem, 4vw, 1.75rem)' }}>How It Works</h2>
                        <div className="how-it-works-grid" style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                            gap: '1.5rem',
                            maxWidth: '800px',
                            margin: '0 auto',
                        }}>
                            {[
                                { step: '1', title: 'Connect GitHub', desc: 'Add your personal access token' },
                                { step: '2', title: 'Add Repos', desc: 'Select repositories to monitor' },
                                { step: '3', title: 'Enable Monitoring', desc: 'Turn on background service' },
                                { step: '4', title: 'Auto Commit', desc: 'We handle the rest automatically' },
                            ].map((item, i) => (
                                <motion.div
                                    key={i}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.5, delay: 0.8 + i * 0.1 }}
                                    style={{ textAlign: 'center' }}
                                >
                                    <div style={{
                                        width: '48px',
                                        height: '48px',
                                        borderRadius: '50%',
                                        background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        margin: '0 auto 1rem',
                                        fontSize: '1.25rem',
                                        fontWeight: 700,
                                        color: 'white',
                                    }}>
                                        {item.step}
                                    </div>
                                    <h4 style={{ marginBottom: '0.5rem' }}>{item.title}</h4>
                                    <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>{item.desc}</p>
                                </motion.div>
                            ))}
                        </div>
                    </motion.div>

                    {/* Get Token Link */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.6, delay: 1 }}
                        style={{
                            marginTop: '3rem',
                            textAlign: 'center',
                            padding: '1.5rem',
                            background: 'var(--bg-card)',
                            borderRadius: '1rem',
                            maxWidth: '500px',
                            margin: '3rem auto 0',
                        }}
                    >
                        <p style={{ color: 'var(--text-muted)', marginBottom: '1rem' }}>
                            Need a GitHub Personal Access Token?
                        </p>
                        <a
                            href="https://github.com/settings/tokens/new"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn btn-secondary"
                        >
                            <Github size={18} />
                            <span>Create Token on GitHub</span>
                            <ArrowRight size={16} />
                        </a>
                    </motion.div>
                </div>
            </section>
        </>
    );
}
