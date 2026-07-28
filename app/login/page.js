'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import styles from './auth.module.css';

export default function LoginPage() {
    const router = useRouter();
    const params = useSearchParams();
    const [form, setForm] = useState({ phone: '', password: '' });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true); setError('');
        try {
            const res = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(form),
            });
            const data = await res.json();
            if (!res.ok) { setError(data.error || 'Login failed'); return; }
            localStorage.setItem('user', JSON.stringify(data.user));
            localStorage.setItem('token', data.token);
            const role = data.user.role;
            if (role === 'admin' || role === 'support') router.push('/admin');
            else if (role === 'driver') router.push('/driver');
            else if (role === 'merchant') router.push('/merchant');
            else router.push('/rider');
        } catch { setError('Network error. Please try again.'); }
        finally { setLoading(false); }
    };

    return (
        <div className={styles.page}>
            <div className={styles.leftPanel}>
                <div className={styles.leftContent}>
                    <Link href="/" className={styles.backLink}>← Back to Home</Link>
                    <div className={styles.logoBlock}>
                        <span className={styles.logoIcon}>🚀</span>
                        <span className={styles.logoText}>Apni Services</span>
                    </div>
                    <h1 className={styles.authTitle}>Welcome back</h1>
                    <p className={styles.authSubtitle}>Sign in to your account to continue</p>

                    {error && <div className={styles.errorAlert}>{error}</div>}

                    <form onSubmit={handleSubmit} className={styles.form}>
                        <div className="input-group">
                            <label className="input-label">Phone Number</label>
                            <div className="input-with-icon">
                                <span className="input-icon">📱</span>
                                <input className="input" type="tel" placeholder="03XX-XXXXXXX" value={form.phone}
                                    onChange={e => setForm({ ...form, phone: e.target.value })} required />
                            </div>
                        </div>
                        <div className="input-group">
                            <label className="input-label">Password</label>
                            <div className="input-with-icon">
                                <span className="input-icon">🔒</span>
                                <input className="input" type="password" placeholder="Your password" value={form.password}
                                    onChange={e => setForm({ ...form, password: e.target.value })} required />
                            </div>
                        </div>
                        <button type="submit" className="btn btn-primary w-full btn-lg" disabled={loading}>
                            {loading ? <span className="spinner" style={{ width: 20, height: 20, borderWidth: 2 }} /> : '🔐 Sign In'}
                        </button>
                    </form>

                    <p className={styles.switchAuth}>
                        Don&apos;t have an account? <Link href="/register">Create one</Link>
                    </p>

                    <div className={styles.demoHint}>
                        <strong>Demo Accounts:</strong>
                        <div className={styles.demoRow}>
                            <span>👤 Rider: 03001111111 / pass123</span>
                            <span>🚗 Driver: 03002222222 / pass123</span>
                        </div>
                        <div className={styles.demoRow}>
                            <span>🍔 Merchant: 03003333333 / pass123</span>
                            <span>🛡️ Admin: 03004444444 / pass123</span>
                        </div>
                    </div>
                </div>
            </div>
            <div className={styles.rightPanel}>
                <div className={styles.rightContent}>
                    <h2>Everything you need,<br />right at your fingertips</h2>
                    <div className={styles.featureList}>
                        {[
                            { icon: '🏍️', title: 'Instant Rides', desc: 'Bike to Van — matched in seconds' },
                            { icon: '🍔', title: 'Food & Grocery', desc: 'Delivered hot in under 30 min' },
                            { icon: '📦', title: 'Parcels & Couriers', desc: 'Same-day city-wide delivery' },
                            { icon: '📡', title: 'Live GPS Tracking', desc: 'Watch your driver in real-time' },
                        ].map(f => (
                            <div key={f.title} className={styles.featureItem}>
                                <span className={styles.featureIcon}>{f.icon}</span>
                                <div>
                                    <div className={styles.featureTitle}>{f.title}</div>
                                    <div className={styles.featureDesc}>{f.desc}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
