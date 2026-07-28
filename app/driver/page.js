'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import styles from './driver.module.css';

const LAHORE = [31.5204, 74.3587];

export default function DriverDashboard() {
    const router = useRouter();
    const mapRef = useRef(null);
    const leafletMap = useRef(null);
    const [user, setUser] = useState(null);
    const [isOnline, setIsOnline] = useState(false);
    const [activeTab, setActiveTab] = useState('home');
    const [incomingRide, setIncomingRide] = useState(null);
    const [activeRide, setActiveRide] = useState(null);
    const [timer, setTimer] = useState(15);
    const [earnings, setEarnings] = useState({ today: 0, week: 0, total: 0, rides: 0 });
    const [rides, setRides] = useState([]);
    const timerRef = useRef(null);

    useEffect(() => {
        const u = localStorage.getItem('user');
        if (!u) { router.push('/login'); return; }
        const parsed = JSON.parse(u);
        if (parsed.role !== 'driver') { router.push('/login'); return; }
        setUser(parsed);
        fetchEarnings(parsed);
        fetchRides(parsed);
    }, [router]);

    useEffect(() => {
        if (!mapRef.current || leafletMap.current || activeTab !== 'home') return;
        import('leaflet').then(L => {
            const map = L.map(mapRef.current, { center: LAHORE, zoom: 14, zoomControl: false });
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(map);
            L.control.zoom({ position: 'bottomright' }).addTo(map);
            leafletMap.current = map;
            if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition(pos => map.setView([pos.coords.latitude, pos.coords.longitude], 15), () => { });
            }
        });
    }, [activeTab]);

    // Simulate incoming ride request when online
    useEffect(() => {
        if (!isOnline) return;
        const t = setTimeout(() => {
            setIncomingRide({
                id: 'demo-' + Date.now(),
                pickup: 'DHA Phase 5, Lahore',
                dropoff: 'Gulberg III, Lahore',
                fare: 320, distance: '6.2 km', eta: '8 min', rider: 'Ahmed K.', rating: 4.7,
            });
            setTimer(15);
        }, 4000);
        return () => clearTimeout(t);
    }, [isOnline]);

    // Countdown timer for incoming ride
    useEffect(() => {
        if (!incomingRide) return;
        timerRef.current = setInterval(() => {
            setTimer(t => {
                if (t <= 1) { clearInterval(timerRef.current); setIncomingRide(null); return 15; }
                return t - 1;
            });
        }, 1000);
        return () => clearInterval(timerRef.current);
    }, [incomingRide]);

    const acceptRide = () => {
        clearInterval(timerRef.current);
        setActiveRide(incomingRide);
        setIncomingRide(null);
    };

    const rejectRide = () => {
        clearInterval(timerRef.current);
        setIncomingRide(null);
    };

    const completeRide = () => {
        if (!activeRide) return;
        setEarnings(e => ({ ...e, today: e.today + activeRide.fare * 0.8, rides: e.rides + 1 }));
        setActiveRide(null);
    };

    const fetchEarnings = async (u) => {
        const token = localStorage.getItem('token');
        try {
            const res = await fetch('/api/auth/me', { headers: { Authorization: `Bearer ${token}` } });
            const data = await res.json();
            if (res.ok && data.user?.driverProfile) {
                setEarnings(e => ({ ...e, total: data.user.driverProfile.totalEarnings || 0, rides: data.user.driverProfile.totalRides || 0 }));
            }
        } catch { }
    };

    const fetchRides = async (u) => {
        const token = localStorage.getItem('token');
        try {
            const res = await fetch('/api/rides?role=driver&limit=8', { headers: { Authorization: `Bearer ${token}` } });
            const data = await res.json();
            if (res.ok) setRides(data.rides || []);
        } catch { }
    };

    const toggleOnline = () => {
        setIsOnline(v => !v);
        if (isOnline) setIncomingRide(null);
    };

    if (!user) return <div className="loading-screen"><div className="spinner" /></div>;

    return (
        <div className={styles.layout}>
            {/* SIDEBAR */}
            <aside className={styles.sidebar}>
                <div className={styles.brand}>🚀 <span className={styles.brandText}>Captain Portal</span></div>
                <div className={styles.profile}>
                    <div className={styles.avatar}>{user.name?.[0]}</div>
                    <div>
                        <div className={styles.name}>{user.name}</div>
                        <div className={styles.phone}>{user.phone}</div>
                    </div>
                </div>

                <div className={`${styles.onlineToggle} ${isOnline ? styles.online : ''}`} onClick={toggleOnline}>
                    <div className={styles.toggleKnob} />
                    <div className={styles.toggleLabels}>
                        <span>{isOnline ? '🟢 ONLINE' : '⭕ OFFLINE'}</span>
                        <span className={styles.toggleSub}>{isOnline ? 'Accepting rides' : 'Tap to go online'}</span>
                    </div>
                </div>

                <div className={styles.quickStats}>
                    <div className={styles.qStat}>
                        <div className={styles.qStatVal}>₨{earnings.today.toFixed(0)}</div>
                        <div className={styles.qStatLabel}>Today</div>
                    </div>
                    <div className={styles.qStat}>
                        <div className={styles.qStatVal}>{earnings.rides}</div>
                        <div className={styles.qStatLabel}>Rides</div>
                    </div>
                    <div className={styles.qStat}>
                        <div className={styles.qStatVal}>4.9★</div>
                        <div className={styles.qStatLabel}>Rating</div>
                    </div>
                </div>

                <nav className={styles.nav}>
                    {[
                        { id: 'home', icon: '🗺️', label: 'Live Map' },
                        { id: 'earnings', icon: '💰', label: 'Earnings' },
                        { id: 'history', icon: '📋', label: 'Trip History' },
                        { id: 'docs', icon: '📄', label: 'My Documents' },
                    ].map(item => (
                        <button key={item.id} className={`${styles.navItem} ${activeTab === item.id ? styles.navActive : ''}`}
                            onClick={() => setActiveTab(item.id)}>
                            <span>{item.icon}</span><span>{item.label}</span>
                        </button>
                    ))}
                </nav>
                <button className={styles.logoutBtn} onClick={() => { localStorage.clear(); router.push('/login'); }}>🚪 Logout</button>
            </aside>

            {/* MAIN CONTENT */}
            <main className={styles.main}>
                {/* INCOMING RIDE MODAL */}
                {incomingRide && (
                    <div className={styles.rideModal}>
                        <div className={styles.rideModalCard}>
                            <div className={styles.timerRing}>
                                <svg viewBox="0 0 36 36" className={styles.timerSvg}>
                                    <circle cx="18" cy="18" r="15.9" strokeDasharray={`${(timer / 15) * 100} 100`} />
                                </svg>
                                <span className={styles.timerNum}>{timer}</span>
                            </div>
                            <h3>🔔 New Ride Request!</h3>
                            <div className={styles.rideDetails}>
                                <div className={styles.rideDetailRow}><span>👤 Rider</span><span>{incomingRide.rider} · ★{incomingRide.rating}</span></div>
                                <div className={styles.rideDetailRow}><span>🟢 Pickup</span><span>{incomingRide.pickup}</span></div>
                                <div className={styles.rideDetailRow}><span>🔴 Drop</span><span>{incomingRide.dropoff}</span></div>
                                <div className={styles.rideDetailRow}><span>📏 Distance</span><span>{incomingRide.distance}</span></div>
                                <div className={`${styles.rideDetailRow} ${styles.fareHighlight}`}><span>💰 Fare</span><span>₨{incomingRide.fare}</span></div>
                            </div>
                            <div className={styles.rideActions}>
                                <button className="btn btn-danger" onClick={rejectRide}>✕ Reject</button>
                                <button className="btn btn-primary btn-lg" onClick={acceptRide}>✓ Accept</button>
                            </div>
                        </div>
                    </div>
                )}

                {/* ACTIVE RIDE BANNER */}
                {activeRide && (
                    <div className={styles.activeRideBanner}>
                        <div>
                            <div className={styles.activeRideTitle}>🟢 Active Ride</div>
                            <div className={styles.activeRideRoute}>{activeRide.pickup} → {activeRide.dropoff}</div>
                        </div>
                        <div>
                            <div className={styles.activeRideFare}>₨{activeRide.fare}</div>
                            <button className="btn btn-primary btn-sm" onClick={completeRide}>Mark Complete ✓</button>
                        </div>
                    </div>
                )}

                {/* HOME / MAP */}
                {activeTab === 'home' && (
                    <div ref={mapRef} className={styles.map}>
                        {!isOnline && (
                            <div className={styles.offlineOverlay}>
                                <div className={styles.offlineCard}>
                                    <span style={{ fontSize: '3rem' }}>⭕</span>
                                    <h3>You are Offline</h3>
                                    <p>Go online to start receiving ride requests</p>
                                    <button className="btn btn-primary btn-lg" onClick={toggleOnline}>Go Online</button>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* EARNINGS */}
                {activeTab === 'earnings' && (
                    <div className={styles.pageContent}>
                        <h2 className={styles.pageTitle}>💰 My Earnings</h2>
                        <div className={styles.earningsGrid}>
                            {[
                                { label: "Today's Earnings", value: `₨${earnings.today.toFixed(0)}`, icon: '📅', color: '#00C851' },
                                { label: 'This Week', value: `₨${earnings.week.toFixed(0)}`, icon: '📆', color: '#3B82F6' },
                                { label: 'Total Earnings', value: `₨${earnings.total.toFixed(0)}`, icon: '💎', color: '#8B5CF6' },
                                { label: 'Total Rides', value: earnings.rides, icon: '🚗', color: '#FFB800' },
                            ].map((s, i) => (
                                <div key={i} className="stat-card" style={{ '--accent': s.color }}>
                                    <div className="stat-icon" style={{ background: `${s.color}22` }}>{s.icon}</div>
                                    <div className="stat-value" style={{ color: s.color }}>{s.value}</div>
                                    <div className="stat-label">{s.label}</div>
                                </div>
                            ))}
                        </div>
                        <div className={styles.chartCard}>
                            <h3 className={styles.chartTitle}>This Week</h3>
                            <div className={styles.barChart}>
                                {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, i) => {
                                    const h = [60, 80, 45, 95, 70, 100, 55][i];
                                    return (
                                        <div key={day} className={styles.barGroup}>
                                            <div className={styles.bar} style={{ height: `${h}%` }}>
                                                <span className={styles.barVal}>₨{Math.round(h * 18)}</span>
                                            </div>
                                            <span className={styles.barLabel}>{day}</span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                )}

                {/* TRIP HISTORY */}
                {activeTab === 'history' && (
                    <div className={styles.pageContent}>
                        <h2 className={styles.pageTitle}>📋 Trip History</h2>
                        {rides.length === 0 ? (
                            <div className={styles.empty}>
                                <span style={{ fontSize: '3rem' }}>🚗</span>
                                <p>No completed trips yet. Go online to start earning!</p>
                            </div>
                        ) : (
                            <div className={styles.tripList}>
                                {rides.map(r => (
                                    <div key={r.id} className={styles.tripItem}>
                                        <div className={styles.tripInfo}>
                                            <div className={styles.tripRoute}>{r.pickupAddress} → {r.dropoffAddress}</div>
                                            <div className={styles.tripMeta}>{new Date(r.createdAt).toLocaleDateString()} · {r.vehicleType}</div>
                                        </div>
                                        <div className={styles.tripRight}>
                                            <span className={`badge badge-${r.status === 'completed' ? 'success' : 'warning'}`}>{r.status}</span>
                                            <div className={styles.tripFare}>₨{r.fareFinal || r.fareEstimate || '--'}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* DOCUMENTS */}
                {activeTab === 'docs' && (
                    <div className={styles.pageContent}>
                        <h2 className={styles.pageTitle}>📄 My Documents</h2>
                        <div className={styles.docsGrid}>
                            {[
                                { name: "Driver's License", status: 'verified', icon: '🪪' },
                                { name: 'Vehicle Registration', status: 'verified', icon: '📋' },
                                { name: 'CNIC / NIC', status: 'pending', icon: '💳' },
                                { name: 'Vehicle Insurance', status: 'missing', icon: '🛡️' },
                                { name: 'Profile Photo', status: 'verified', icon: '📸' },
                            ].map(doc => (
                                <div key={doc.name} className={styles.docCard}>
                                    <span style={{ fontSize: '2rem' }}>{doc.icon}</span>
                                    <div className={styles.docName}>{doc.name}</div>
                                    <span className={`badge badge-${doc.status === 'verified' ? 'success' : doc.status === 'pending' ? 'warning' : 'danger'}`}>
                                        {doc.status}
                                    </span>
                                    {doc.status !== 'verified' && <button className="btn btn-sm btn-secondary" style={{ marginTop: 8 }}>Upload</button>}
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}
