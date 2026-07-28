'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import styles from './auth.module.css';

const ROLES = [
    { value: 'rider', label: '👤 Rider', desc: 'Book rides & order food' },
    { value: 'driver', label: '🚗 Driver', desc: 'Earn by driving & delivering' },
    { value: 'merchant', label: '🍔 Merchant', desc: 'Sell food & products' },
];

export default function RegisterPage() {
    const router = useRouter();
    const params = useSearchParams();
    const defaultRole = params.get('role') || 'rider';
    const [role, setRole] = useState(defaultRole);
    const [form, setForm] = useState({ name: '', phone: '', email: '', password: '', confirm: '' });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (form.password !== form.confirm) { setError('Passwords do not match'); return; }
        setLoading(true); setError('');
        try {
            const res = await fetch('/api/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: form.name, phone: form.phone, email: form.email || undefined, password: form.password, role }),
            });
            const data = await res.json();
            if (!res.ok) { setError(data.error || 'Registration failed'); return; }
            localStorage.setItem('user', JSON.stringify(data.user));
            localStorage.setItem('token', data.token);
            if (role === 'driver') router.push('/driver');
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
                    <h1 className={styles.authTitle}>Create account</h1>
                    <p className={styles.authSubtitle}>Join thousands of users on Apni Services</p>

                    <div className={styles.roleSelector}>
                        {ROLES.map(r => (
                            <button key={r.value} type="button"
                                className={`${styles.roleBtn} ${role === r.value ? styles.roleBtnActive : ''}`}
                                onClick={() => setRole(r.value)}>
                                <span>{r.label}</span>
                                <span className={styles.roleBtnDesc}>{r.desc}</span>
                            </button>
                        ))}
                    </div>

                    {error && <div className={styles.errorAlert}>{error}</div>}

                    <form onSubmit={handleSubmit} className={styles.form}>
                        <div className={styles.formRow}>
                            <div className="input-group">
                                <label className="input-label">Full Name</label>
                                <input className="input" type="text" placeholder="Your name" value={form.name}
                                    onChange={e => setForm({ ...form, name: e.target.value })} required />
                            </div>
                            <div className="input-group">
                                <label className="input-label">Phone Number</label>
                                <input className="input" type="tel" placeholder="03XX-XXXXXXX" value={form.phone}
                                    onChange={e => setForm({ ...form, phone: e.target.value })} required />
                            </div>
                        </div>
                        <div className="input-group">
                            <label className="input-label">Email (optional)</label>
                            <input className="input" type="email" placeholder="your@email.com" value={form.email}
                                onChange={e => setForm({ ...form, email: e.target.value })} />
                        </div>
                        <div className={styles.formRow}>
                            <div className="input-group">
                                <label className="input-label">Password</label>
                                <input className="input" type="password" placeholder="Min 6 characters" value={form.password}
                                    onChange={e => setForm({ ...form, password: e.target.value })} required minLength={6} />
                            </div>
                            <div className="input-group">
                                <label className="input-label">Confirm Password</label>
                                <input className="input" type="password" placeholder="Repeat password" value={form.confirm}
                                    onChange={e => setForm({ ...form, confirm: e.target.value })} required />
                            </div>
                        </div>
                        <button type="submit" className="btn btn-primary w-full btn-lg" disabled={loading}>
                            {loading ? <span className="spinner" style={{ width: 20, height: 20, borderWidth: 2 }} /> : '🚀 Create Account'}
                        </button>
                    </form>
                    <p className={styles.switchAuth}>Already have an account? <Link href="/login">Sign in</Link></p>
                </div>
            </div>
            <div className={styles.rightPanel}>
                <div className={styles.rightContent}>
                    <h2>Join Pakistan&apos;s fastest-growing SuperApp</h2>
                    <div className={styles.featureList}>
                        {[
                            { icon: '⚡', title: 'Quick Setup', desc: 'Get started in under 2 minutes' },
                            { icon: '🔐', title: 'Secure & Private', desc: 'Your data is encrypted & protected' },
                            { icon: '💰', title: 'Save Money', desc: 'Best rates, promo codes & cashback' },
                            { icon: '📞', title: '24/7 Support', desc: 'We\'re always here to help' },
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
