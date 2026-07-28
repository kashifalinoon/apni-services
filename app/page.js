'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import styles from './landing.module.css';

const STATS = [
    { value: '50K+', label: 'Active Riders' },
    { value: '8K+', label: 'Drivers' },
    { value: '1.2K+', label: 'Restaurants' },
    { value: '4.9★', label: 'Avg Rating' },
];

const SERVICES = [
    { icon: '🏍️', name: 'Bike Ride', desc: 'Fast & affordable motorcycle rides', tag: 'Most Popular', color: '#00C851' },
    { icon: '🚗', name: 'Car Ride', desc: 'Comfortable sedan & hatchback rides', tag: 'Premium', color: '#3B82F6' },
    { icon: '🛺', name: 'Rickshaw', desc: 'Budget-friendly auto rickshaw', tag: 'Budget', color: '#FFB800' },
    { icon: '🚐', name: 'Van / XL', desc: 'Group travel up to 12 passengers', tag: 'Group', color: '#8B5CF6' },
    { icon: '🍔', name: 'Food Delivery', desc: 'From 1200+ restaurants near you', tag: 'New', color: '#FF6B35' },
    { icon: '🛒', name: 'Grocery', desc: 'Fresh groceries in 30 minutes', tag: 'Quick', color: '#10B981' },
    { icon: '📦', name: 'Parcels', desc: 'Same-day package delivery citywide', tag: '', color: '#6366F1' },
    { icon: '💊', name: 'Pharmacy', desc: 'Medicines delivered to your door', tag: '', color: '#EC4899' },
];

const HOW_IT_WORKS = [
    { step: '01', icon: '📍', title: 'Set Your Location', desc: 'Enter your pickup and drop-off points with our smart address search.' },
    { step: '02', icon: '🚗', title: 'Choose a Service', desc: 'Pick from rides, food, grocery, or parcels based on your need.' },
    { step: '03', icon: '⚡', title: 'Get Matched Instantly', desc: 'Our algorithm finds the nearest available captain in seconds.' },
    { step: '04', icon: '📡', title: 'Track in Real Time', desc: 'Watch your captain move on the live map until arrival.' },
];

const TESTIMONIALS = [
    { name: 'Fatima A.', city: 'Lahore', text: 'Apni Services is a lifesaver! Cheaper than other apps and the driver arrived in under 4 minutes. The live tracking is amazing.', stars: 5, avatar: '👩' },
    { name: 'Ahmed R.', city: 'Karachi', text: 'I switched my restaurant to Apni Services delivery and my orders tripled. Dashboard is super easy to manage.', stars: 5, avatar: '👨' },
    { name: 'Sara M.', city: 'Islamabad', text: 'As a driver, the earnings are great and the app is simple. I can easily see my daily and weekly income.', stars: 5, avatar: '👩‍💼' },
];

export default function LandingPage() {
    const [activeService, setActiveService] = useState(0);
    const [statsVisible, setStatsVisible] = useState(false);

    useEffect(() => {
        const timer = setTimeout(() => setStatsVisible(true), 500);
        return () => clearTimeout(timer);
    }, []);

    return (
        <div className={styles.page}>
            {/* NAV */}
            <nav className={styles.nav}>
                <div className={styles.navLogo}>
                    <span className={styles.navLogoIcon}>🚀</span>
                    <span className={styles.navLogoText}>Apni Services</span>
                </div>
                <div className={styles.navLinks}>
                    <a href="#services">Services</a>
                    <a href="#how-it-works">How It Works</a>
                    <a href="#driver">Drive With Us</a>
                    <Link href="/login" className={styles.navLogin}>Login</Link>
                    <Link href="/register" className={`${styles.navBtn} btn btn-primary`}>Get Started</Link>
                </div>
            </nav>

            {/* HERO */}
            <section className={styles.hero}>
                <div className={styles.heroContent}>
                    <div className={styles.heroBadge}>🇵🇰 Pakistan&apos;s #1 SuperApp</div>
                    <h1 className={styles.heroTitle}>
                        Rides, Food & Delivery —<br />
                        <span className="gradient-text">All in One App</span>
                    </h1>
                    <p className={styles.heroDesc}>
                        Book a ride, order food, send packages, or get groceries delivered in minutes. Apni Services brings everything to your doorstep.
                    </p>
                    <div className={styles.heroActions}>
                        <Link href="/register" className="btn btn-primary btn-lg">🚀 Start Now — It&apos;s Free</Link>
                        <Link href="/login" className="btn btn-ghost btn-lg">Sign In</Link>
                    </div>
                    <div className={styles.heroCities}>
                        <span>📍 Available in:</span>
                        {['Lahore', 'Karachi', 'Islamabad', 'Faisalabad', 'Rawalpindi'].map(c => (
                            <span key={c} className={styles.cityPill}>{c}</span>
                        ))}
                    </div>
                </div>
                <div className={styles.heroVisual}>
                    <div className={styles.phoneFrame}>
                        <div className={styles.phoneMockup}>
                            <div className={styles.mockMap}>
                                <div className={styles.mockMapDot} style={{ top: '40%', left: '45%' }}>📍</div>
                                <div className={styles.mockMapCar} style={{ top: '55%', left: '60%' }}>🚗</div>
                                <div className={styles.mockEta}>ETA: 3 min</div>
                            </div>
                            <div className={styles.mockCard}>
                                <div className={styles.mockDriver}>
                                    <span>👨‍✈️</span>
                                    <div>
                                        <div style={{ fontWeight: 700, fontSize: '0.85rem' }}>Ali Hassan</div>
                                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>★ 4.9 · Honda CG125</div>
                                    </div>
                                    <div style={{ marginLeft: 'auto', color: 'var(--brand-primary)', fontWeight: 700 }}>₨ 180</div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className={styles.floatBadge1}>🏍️ Nearby drivers: 12</div>
                    <div className={styles.floatBadge2}>⚡ Avg wait: 2 min</div>
                </div>
            </section>

            {/* STATS */}
            <section className={styles.statsBar}>
                {STATS.map((s, i) => (
                    <div key={i} className={`${styles.statItem} ${statsVisible ? styles.statVisible : ''}`} style={{ transitionDelay: `${i * 0.1}s` }}>
                        <div className={styles.statValue}>{s.value}</div>
                        <div className={styles.statLabel}>{s.label}</div>
                    </div>
                ))}
            </section>

            {/* SERVICES */}
            <section className={styles.services} id="services">
                <div className={styles.sectionHeader}>
                    <span className={styles.sectionTag}>What We Offer</span>
                    <h2>Everything You Need, <span className="gradient-text">One App</span></h2>
                    <p>From daily commute to grocery runs — Apni Services has you covered 24/7.</p>
                </div>
                <div className={styles.servicesGrid}>
                    {SERVICES.map((s, i) => (
                        <div
                            key={i}
                            className={`${styles.serviceCard} ${activeService === i ? styles.serviceCardActive : ''}`}
                            onMouseEnter={() => setActiveService(i)}
                            style={{ '--accent': s.color }}
                        >
                            {s.tag && <span className={styles.serviceTag} style={{ background: s.color }}>{s.tag}</span>}
                            <div className={styles.serviceIcon}>{s.icon}</div>
                            <h3 className={styles.serviceName}>{s.name}</h3>
                            <p className={styles.serviceDesc}>{s.desc}</p>
                            <div className={styles.serviceArrow}>→</div>
                        </div>
                    ))}
                </div>
            </section>

            {/* HOW IT WORKS */}
            <section className={styles.howItWorks} id="how-it-works">
                <div className={styles.sectionHeader}>
                    <span className={styles.sectionTag}>Simple Process</span>
                    <h2>How <span className="gradient-text">Apni Services</span> Works</h2>
                </div>
                <div className={styles.stepsGrid}>
                    {HOW_IT_WORKS.map((step, i) => (
                        <div key={i} className={styles.stepCard}>
                            <div className={styles.stepNumber}>{step.step}</div>
                            <div className={styles.stepIcon}>{step.icon}</div>
                            <h3>{step.title}</h3>
                            <p>{step.desc}</p>
                            {i < HOW_IT_WORKS.length - 1 && <div className={styles.stepConnector}>→</div>}
                        </div>
                    ))}
                </div>
            </section>

            {/* DRIVER CTA */}
            <section className={styles.driverCta} id="driver">
                <div className={styles.driverCtaContent}>
                    <span className={styles.sectionTag}>Earn With Us</span>
                    <h2>Drive or Deliver — <span className="gradient-text">Earn on Your Schedule</span></h2>
                    <p>Join thousands of captains earning well on Apni Services. Flexible hours, great pay, weekly settlements.</p>
                    <ul className={styles.driverPerks}>
                        {['💰 Earn ₨800–2500/day', '⏰ Work when you want', '📊 Real-time earnings dashboard', '🎁 Bonuses & incentives', '🆓 Free onboarding'].map(perk => (
                            <li key={perk}>{perk}</li>
                        ))}
                    </ul>
                    <Link href="/register?role=driver" className="btn btn-primary btn-lg">Register as Driver</Link>
                </div>
                <div className={styles.driverCtaVisual}>
                    <div className={styles.earningsCard}>
                        <div className={styles.earningsHeader}>📊 Weekly Earnings</div>
                        <div className={styles.earningsAmount}>₨ 14,500</div>
                        <div className={styles.earningsChange}>↑ 23% vs last week</div>
                        <div className={styles.earningsBar}>
                            {[60, 80, 45, 90, 70, 100, 75].map((h, i) => (
                                <div key={i} className={styles.earningsBarItem} style={{ height: `${h}%` }} />
                            ))}
                        </div>
                        <div className={styles.earningsDays}>Mo Tu We Th Fr Sa Su</div>
                    </div>
                </div>
            </section>

            {/* TESTIMONIALS */}
            <section className={styles.testimonials}>
                <div className={styles.sectionHeader}>
                    <span className={styles.sectionTag}>What People Say</span>
                    <h2>Loved by <span className="gradient-text">Thousands</span></h2>
                </div>
                <div className={styles.testimonialsGrid}>
                    {TESTIMONIALS.map((t, i) => (
                        <div key={i} className={styles.testimonialCard}>
                            <div className={styles.testimonialStars}>{'★'.repeat(t.stars)}</div>
                            <p className={styles.testimonialText}>&ldquo;{t.text}&rdquo;</p>
                            <div className={styles.testimonialAuthor}>
                                <span className={styles.testimonialAvatar}>{t.avatar}</span>
                                <div>
                                    <div style={{ fontWeight: 700 }}>{t.name}</div>
                                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{t.city}</div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            {/* FOOTER */}
            <footer className={styles.footer}>
                <div className={styles.footerTop}>
                    <div>
                        <div className={styles.navLogo} style={{ marginBottom: 12 }}>
                            <span className={styles.navLogoIcon}>🚀</span>
                            <span className={styles.navLogoText}>Apni Services</span>
                        </div>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', maxWidth: 260 }}>
                            Pakistan&apos;s superapp for rides, food delivery, and logistics. Available 24/7.
                        </p>
                    </div>
                    <div className={styles.footerLinks}>
                        <div>
                            <h4>Services</h4>
                            <a href="#">Rides</a><a href="#">Food Delivery</a><a href="#">Grocery</a><a href="#">Parcels</a>
                        </div>
                        <div>
                            <h4>Company</h4>
                            <a href="#">About Us</a><a href="#">Careers</a><a href="#">Press</a><a href="#">Blog</a>
                        </div>
                        <div>
                            <h4>Support</h4>
                            <a href="#">Help Center</a><a href="#">Safety</a><a href="#">Contact</a>
                            <Link href="/login">Login</Link>
                        </div>
                    </div>
                </div>
                <div className={styles.footerBottom}>
                    <span>© 2026 Apni Services. All rights reserved.</span>
                    <span>Lahore, Pakistan 🇵🇰</span>
                </div>
            </footer>
        </div>
    );
}
