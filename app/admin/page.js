'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import styles from './admin.module.css';

const NAV_ITEMS = [
    { id: 'dashboard', icon: '📊', label: 'Dashboard' },
    { id: 'riders', icon: '👤', label: 'Riders' },
    { id: 'drivers', icon: '🚗', label: 'Drivers' },
    { id: 'merchants', icon: '🍔', label: 'Merchants' },
    { id: 'rides', icon: '📍', label: 'All Rides' },
    { id: 'orders', icon: '📦', label: 'All Orders' },
    { id: 'fleet', icon: '🗺️', label: 'Fleet Map' },
    { id: 'finance', icon: '💰', label: 'Finance' },
];

export default function AdminDashboard() {
    const router = useRouter();
    const mapRef = useRef(null);
    const leafletMap = useRef(null);
    const [user, setUser] = useState(null);
    const [activeTab, setActiveTab] = useState('dashboard');
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [recentRides, setRecentRides] = useState([]);

    // Demo data
    const demoStats = {
        users: { total: 4820, riders: 4200, drivers: 512, merchants: 108 },
        rides: { total: 18640, completed: 16423, completionRate: 88 },
        orders: { total: 9347, completed: 8600 },
        fleet: { activeDrivers: 47 },
        financials: { gmv: 6842000, revenue: 1026300, currency: 'PKR' },
    };
    const demoRides = [
        { id: 'r1', rider: { name: 'Ahmad B.' }, driver: { name: 'Ali H.' }, pickupAddress: 'DHA Phase 4', dropoffAddress: 'Gulberg III', status: 'completed', fareEstimate: 320, createdAt: new Date().toISOString() },
        { id: 'r2', rider: { name: 'Sara K.' }, driver: null, pickupAddress: 'Model Town', dropoffAddress: 'Johar Town', status: 'requested', fareEstimate: 180, createdAt: new Date().toISOString() },
        { id: 'r3', rider: { name: 'Usman R.' }, driver: { name: 'Hassan M.' }, pickupAddress: 'Bahria Town', dropoffAddress: 'Airport', status: 'started', fareEstimate: 650, createdAt: new Date().toISOString() },
    ];

    useEffect(() => {
        const u = localStorage.getItem('user');
        if (!u) { router.push('/login'); return; }
        const parsed = JSON.parse(u);
        if (!['admin', 'support'].includes(parsed.role)) { router.push('/login'); return; }
        setUser(parsed);
        // Try real API, fall back to demo
        const token = localStorage.getItem('token');
        fetch('/api/admin/stats', { headers: { Authorization: `Bearer ${token}` } })
            .then(r => r.json())
            .then(d => { if (d.success) { setStats(d.stats); setRecentRides(d.recent?.rides || []); } else { setStats(demoStats); setRecentRides(demoRides); } })
            .catch(() => { setStats(demoStats); setRecentRides(demoRides); })
            .finally(() => setLoading(false));
    }, [router]);

    useEffect(() => {
        if (activeTab !== 'fleet' || leafletMap.current) return;
        import('leaflet').then(L => {
            if (!mapRef.current) return;
            const map = L.map(mapRef.current, { center: [31.5204, 74.3587], zoom: 12, zoomControl: true });
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(map);
            leafletMap.current = map;
            // Demo driver pins
            const colors = ['#00C851', '#3B82F6', '#FFB800', '#FF6B35', '#8B5CF6'];
            for (let i = 0; i < 28; i++) {
                const lat = 31.5204 + (Math.random() - 0.5) * 0.12;
                const lng = 74.3587 + (Math.random() - 0.5) * 0.15;
                const emoji = ['🏍️', '🚗', '🚙', '🛺'][Math.floor(Math.random() * 4)];
                const icon = L.divIcon({ className: '', html: `<div style="font-size:18px">${emoji}</div>`, iconSize: [22, 22], iconAnchor: [11, 11] });
                L.marker([lat, lng], { icon }).addTo(map).bindPopup(`Driver ${i + 1}`);
            }
        });
    }, [activeTab]);

    const fmtCurrency = v => `₨${(v / 1000).toFixed(0)}K`;
    const fmtNum = v => v?.toLocaleString() || '0';

    if (!user || loading) return <div className="loading-screen"><div className="spinner" /><p>Loading admin panel...</p></div>;

    const s = stats || demoStats;

    return (
        <div className={styles.layout}>
            <aside className={styles.sidebar}>
                <div className={styles.brand}>🚀 <span>Admin Panel</span></div>
                <div className={styles.adminInfo}>
                    <div className={styles.adminAvatar}>{user.name?.[0]}</div>
                    <div>
                        <div className={styles.adminName}>{user.name}</div>
                        <span className="badge badge-danger" style={{ fontSize: '0.68rem' }}>👑 Admin</span>
                    </div>
                </div>
                <nav className={styles.nav}>
                    {NAV_ITEMS.map(item => (
                        <button key={item.id} className={`${styles.navItem} ${activeTab === item.id ? styles.navActive : ''}`}
                            onClick={() => setActiveTab(item.id)}>
                            <span>{item.icon}</span><span>{item.label}</span>
                        </button>
                    ))}
                </nav>
                <button className={styles.logoutBtn} onClick={() => { localStorage.clear(); router.push('/login'); }}>🚪 Logout</button>
            </aside>

            <main className={styles.main}>
                {/* DASHBOARD */}
                {activeTab === 'dashboard' && (
                    <div className={styles.pageContent}>
                        <div className={styles.pageHeader}>
                            <h2>📊 Operations Dashboard</h2>
                            <div className={styles.liveIndicator}><div className="pulse-dot" /><span>Live</span></div>
                        </div>

                        {/* KPI GRID */}
                        <div className={styles.kpiGrid}>
                            {[
                                { label: 'Total GMV', value: fmtCurrency(s.financials.gmv), icon: '💰', color: '#00C851', sub: 'All time' },
                                { label: 'Revenue (15%)', value: fmtCurrency(s.financials.revenue), icon: '📈', color: '#3B82F6', sub: 'Commission' },
                                { label: 'Total Users', value: fmtNum(s.users.total), icon: '👥', color: '#FFB800', sub: `${s.users.riders} riders` },
                                { label: 'Active Drivers', value: s.fleet.activeDrivers, icon: '🚗', color: '#FF6B35', sub: 'Online now' },
                                { label: 'Total Rides', value: fmtNum(s.rides.total), icon: '📍', color: '#8B5CF6', sub: `${s.rides.completionRate}% completion` },
                                { label: 'Total Orders', value: fmtNum(s.orders.total), icon: '📦', color: '#EC4899', sub: `Food & grocery` },
                                { label: 'Drivers', value: fmtNum(s.users.drivers), icon: '🏎️', color: '#10B981', sub: 'All registered' },
                                { label: 'Merchants', value: fmtNum(s.users.merchants), icon: '🍔', color: '#6366F1', sub: 'Active shops' },
                            ].map((k, i) => (
                                <div key={i} className={styles.kpiCard}>
                                    <div className={styles.kpiIcon} style={{ background: k.color + '22', fontSize: '1.4rem' }}>{k.icon}</div>
                                    <div className={styles.kpiValue} style={{ color: k.color }}>{k.value}</div>
                                    <div className={styles.kpiLabel}>{k.label}</div>
                                    <div className={styles.kpiSub}>{k.sub}</div>
                                </div>
                            ))}
                        </div>

                        {/* RECENT RIDES */}
                        <div className={styles.tableCard}>
                            <div className={styles.tableHeader}>
                                <h3>Recent Rides</h3>
                                <button className="btn btn-ghost btn-sm" onClick={() => setActiveTab('rides')}>View All →</button>
                            </div>
                            <table className="data-table">
                                <thead>
                                    <tr><th>Rider</th><th>Driver</th><th>Route</th><th>Fare</th><th>Status</th><th>Time</th></tr>
                                </thead>
                                <tbody>
                                    {(recentRides.length > 0 ? recentRides : demoRides).map(r => (
                                        <tr key={r.id}>
                                            <td>{r.rider?.name || '—'}</td>
                                            <td>{r.driver?.name || <span className="text-muted">Unassigned</span>}</td>
                                            <td style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                                                {r.pickupAddress?.slice(0, 18)}… → {r.dropoffAddress?.slice(0, 18)}…
                                            </td>
                                            <td style={{ color: 'var(--brand-primary)', fontWeight: 700 }}>₨{r.fareEstimate || '--'}</td>
                                            <td>
                                                <span className={`badge badge-${r.status === 'completed' ? 'success' : r.status === 'cancelled' ? 'danger' : r.status === 'requested' ? 'warning' : 'info'}`}>
                                                    {r.status}
                                                </span>
                                            </td>
                                            <td className="text-muted text-sm">{new Date(r.createdAt).toLocaleTimeString()}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* FLEET MAP */}
                {activeTab === 'fleet' && (
                    <div className={styles.fleetLayout}>
                        <div className={styles.fleetSidebar}>
                            <h3>🚗 Live Fleet ({s.fleet.activeDrivers} online)</h3>
                            <div className={styles.fleetLegend}>
                                <div className={styles.fleetLegendItem}><span>🏍️</span> Bike Captains</div>
                                <div className={styles.fleetLegendItem}><span>🚗</span> Car Drivers</div>
                                <div className={styles.fleetLegendItem}><span>🚙</span> XL/SUV</div>
                                <div className={styles.fleetLegendItem}><span>🛺</span> Rickshaw</div>
                            </div>
                            <div className={styles.fleetStats}>
                                <div className={styles.fStat}><div>48</div><div>Online</div></div>
                                <div className={styles.fStat}><div>12</div><div>On Ride</div></div>
                                <div className={styles.fStat}><div>36</div><div>Available</div></div>
                            </div>
                        </div>
                        <div ref={mapRef} className={styles.fleetMap} />
                    </div>
                )}

                {/* RIDERS / DRIVERS / MERCHANTS TABLE */}
                {['riders', 'drivers', 'merchants'].includes(activeTab) && (
                    <div className={styles.pageContent}>
                        <div className={styles.pageHeader}>
                            <h2>{NAV_ITEMS.find(n => n.id === activeTab)?.icon} {NAV_ITEMS.find(n => n.id === activeTab)?.label} Management</h2>
                            <div className={styles.headerActions}>
                                <input className="input" style={{ width: 240 }} placeholder="🔍 Search users..." />
                                <button className="btn btn-primary btn-sm">+ Add</button>
                            </div>
                        </div>
                        <div className={styles.tableCard}>
                            <table className="data-table">
                                <thead>
                                    <tr><th>Name</th><th>Phone</th><th>Status</th><th>Joined</th><th>Actions</th></tr>
                                </thead>
                                <tbody>
                                    {[
                                        { name: 'Ahmad Bilal', phone: '03001234567', status: 'active', date: '2026-01-15' },
                                        { name: 'Sara Khan', phone: '03012345678', status: 'active', date: '2026-02-03' },
                                        { name: 'Usman Rao', phone: '03123456789', status: 'suspended', date: '2026-02-20' },
                                        { name: 'Fatima Naz', phone: '03234567890', status: 'active', date: '2026-03-01' },
                                        { name: 'Ali Hassan', phone: '03001111222', status: 'active', date: '2026-03-10' },
                                    ].map((u, i) => (
                                        <tr key={i}>
                                            <td><strong>{u.name}</strong></td>
                                            <td className="text-muted">{u.phone}</td>
                                            <td><span className={`badge badge-${u.status === 'active' ? 'success' : 'danger'}`}>{u.status}</span></td>
                                            <td className="text-muted text-sm">{u.date}</td>
                                            <td>
                                                <button className="btn btn-sm btn-secondary" style={{ marginRight: 6 }}>View</button>
                                                <button className="btn btn-sm btn-danger">Suspend</button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* FINANCE */}
                {activeTab === 'finance' && (
                    <div className={styles.pageContent}>
                        <h2 className={styles.pageTitle}>💰 Financial Overview</h2>
                        <div className={styles.financeGrid}>
                            {[
                                { label: 'Total GMV', value: `₨${(s.financials.gmv / 1000).toFixed(0)}K`, desc: 'Gross Merchandise Value', color: '#00C851' },
                                { label: 'Platform Revenue', value: `₨${(s.financials.revenue / 1000).toFixed(0)}K`, desc: '15% commission', color: '#3B82F6' },
                                { label: 'Driver Payouts', value: `₨${((s.financials.gmv * 0.8) / 1000).toFixed(0)}K`, desc: '80% of ride fare', color: '#FFB800' },
                                { label: 'Merchant Payouts', value: `₨${((s.financials.gmv * 0.65) / 1000).toFixed(0)}K`, desc: '85% of order value', color: '#8B5CF6' },
                            ].map((f, i) => (
                                <div key={i} className="stat-card">
                                    <div className="stat-icon" style={{ background: f.color + '22' }}>💵</div>
                                    <div className="stat-value" style={{ color: f.color }}>{f.value}</div>
                                    <div className="stat-label">{f.label}</div>
                                    <div className="text-muted text-sm mt-1">{f.desc}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}
