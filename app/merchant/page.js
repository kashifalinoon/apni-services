'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import styles from './merchant.module.css';

const DEMO_ORDERS = [
    { id: 'o1', customer: 'Ahmad B.', items: [{ name: 'Chicken Biryani', qty: 2 }, { name: 'Raita', qty: 1 }], total: 680, status: 'pending', time: '2 min ago', address: 'DHA Phase 4' },
    { id: 'o2', customer: 'Sara K.', items: [{ name: 'Burger Meal', qty: 1 }, { name: 'Fries', qty: 2 }], total: 450, status: 'preparing', time: '8 min ago', address: 'Gulberg III' },
    { id: 'o3', customer: 'Usman R.', items: [{ name: 'Pizza (Large)', qty: 1 }], total: 890, status: 'ready', time: '15 min ago', address: 'Model Town' },
    { id: 'o4', customer: 'Fatima N.', items: [{ name: 'Pasta Arabiata', qty: 2 }], total: 540, status: 'delivered', time: '32 min ago', address: 'Bahria Town' },
];

const COLUMNS = [
    { key: 'pending', label: '🔔 New Orders', color: '#FFB800' },
    { key: 'preparing', label: '👨‍🍳 Preparing', color: '#3B82F6' },
    { key: 'ready', label: '✅ Ready', color: '#00C851' },
    { key: 'delivered', label: '✓ Delivered', color: '#8B5CF6' },
];

export default function MerchantDashboard() {
    const router = useRouter();
    const [user, setUser] = useState(null);
    const [activeTab, setActiveTab] = useState('orders');
    const [orders, setOrders] = useState(DEMO_ORDERS);
    const [isOpen, setIsOpen] = useState(true);
    const [stats, setStats] = useState({ today: 0, week: 0, pending: 0 });
    const [menuItems] = useState([
        { id: 'm1', name: 'Chicken Biryani', price: 340, category: 'Main Course', available: true },
        { id: 'm2', name: 'Burger Meal', price: 450, category: 'Fast Food', available: true },
        { id: 'm3', name: 'Pizza (Large)', price: 890, category: 'Pizza', available: true },
        { id: 'm4', name: 'Pasta Arabiata', price: 270, category: 'Pasta', available: false },
        { id: 'm5', name: 'Raita', price: 80, category: 'Sides', available: true },
    ]);

    useEffect(() => {
        const u = localStorage.getItem('user');
        if (!u) { router.push('/login'); return; }
        const parsed = JSON.parse(u);
        if (parsed.role !== 'merchant') { router.push('/login'); return; }
        setUser(parsed);
        const total = DEMO_ORDERS.filter(o => o.status === 'delivered').reduce((a, o) => a + o.total, 0);
        const pending = DEMO_ORDERS.filter(o => o.status === 'pending').length;
        setStats({ today: total, week: total * 4, pending });
    }, [router]);

    const moveOrder = (id, newStatus) => {
        setOrders(prev => prev.map(o => o.id === id ? { ...o, status: newStatus } : o));
    };

    if (!user) return <div className="loading-screen"><div className="spinner" /></div>;

    return (
        <div className={styles.layout}>
            <aside className={styles.sidebar}>
                <div className={styles.brand}>🚀 <span>Merchant Hub</span></div>
                <div className={styles.merchantInfo}>
                    <div className={styles.merchantAvatar}>{user.name?.[0]}</div>
                    <div>
                        <div className={styles.merchantName}>{user.name}</div>
                        <div className={`${styles.statusBadge} ${isOpen ? styles.open : styles.closed}`} onClick={() => setIsOpen(v => !v)}>
                            {isOpen ? '🟢 Open' : '🔴 Closed'} — tap to toggle
                        </div>
                    </div>
                </div>

                <div className={styles.sideStats}>
                    <div className={styles.sideStat}><div className={styles.sideStatVal}>₨{stats.today}</div><div className={styles.sideStatLabel}>Today's Revenue</div></div>
                    <div className={styles.sideStat}><div className={styles.sideStatVal}>{stats.pending}</div><div className={styles.sideStatLabel}>Pending Orders</div></div>
                </div>

                <nav className={styles.nav}>
                    {[
                        { id: 'orders', icon: '📦', label: 'Orders' },
                        { id: 'menu', icon: '🍽️', label: 'Menu' },
                        { id: 'analytics', icon: '📊', label: 'Analytics' },
                    ].map(item => (
                        <button key={item.id} className={`${styles.navItem} ${activeTab === item.id ? styles.navActive : ''}`}
                            onClick={() => setActiveTab(item.id)}>
                            <span>{item.icon}</span><span>{item.label}</span>
                        </button>
                    ))}
                </nav>
                <button className={styles.logoutBtn} onClick={() => { localStorage.clear(); router.push('/login'); }}>🚪 Logout</button>
            </aside>

            <main className={styles.main}>
                {/* ORDERS KANBAN */}
                {activeTab === 'orders' && (
                    <div className={styles.pageContent}>
                        <div className={styles.pageHeader}>
                            <h2>📦 Order Management</h2>
                            <span className="badge badge-warning">{orders.filter(o => o.status === 'pending').length} new</span>
                        </div>
                        <div className={styles.kanban}>
                            {COLUMNS.map(col => {
                                const colOrders = orders.filter(o => o.status === col.key);
                                return (
                                    <div key={col.key} className={styles.kanbanCol}>
                                        <div className={styles.kanbanHeader} style={{ borderBottom: `2px solid ${col.color}` }}>
                                            <span>{col.label}</span>
                                            <span className={styles.colCount} style={{ background: col.color + '22', color: col.color }}>{colOrders.length}</span>
                                        </div>
                                        {colOrders.map(order => (
                                            <div key={order.id} className={styles.orderCard}>
                                                <div className={styles.orderTop}>
                                                    <span className={styles.orderId}>#{order.id}</span>
                                                    <span className={styles.orderTime}>{order.time}</span>
                                                </div>
                                                <div className={styles.orderCustomer}>👤 {order.customer}</div>
                                                <div className={styles.orderAddr}>📍 {order.address}</div>
                                                <div className={styles.orderItems}>
                                                    {order.items.map(i => <span key={i.name}>{i.qty}× {i.name}</span>)}
                                                </div>
                                                <div className={styles.orderBottom}>
                                                    <span className={styles.orderTotal}>₨ {order.total}</span>
                                                    <div className={styles.orderBtns}>
                                                        {col.key === 'pending' && (
                                                            <>
                                                                <button className="btn btn-sm btn-danger" onClick={() => moveOrder(order.id, 'delivered')}>✕</button>
                                                                <button className="btn btn-sm btn-primary" onClick={() => moveOrder(order.id, 'preparing')}>Accept ✓</button>
                                                            </>
                                                        )}
                                                        {col.key === 'preparing' && (
                                                            <button className="btn btn-sm btn-primary" onClick={() => moveOrder(order.id, 'ready')}>Mark Ready</button>
                                                        )}
                                                        {col.key === 'ready' && (
                                                            <button className="btn btn-sm btn-secondary" onClick={() => moveOrder(order.id, 'delivered')}>Handed Off</button>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                        {colOrders.length === 0 && <div className={styles.emptyCol}>No orders</div>}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* MENU */}
                {activeTab === 'menu' && (
                    <div className={styles.pageContent}>
                        <div className={styles.pageHeader}>
                            <h2>🍽️ Menu Management</h2>
                            <button className="btn btn-primary btn-sm">+ Add Item</button>
                        </div>
                        <div className={styles.menuTable}>
                            <table className="data-table">
                                <thead>
                                    <tr>
                                        <th>Item</th><th>Category</th><th>Price</th><th>Status</th><th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {menuItems.map(item => (
                                        <tr key={item.id}>
                                            <td><strong>{item.name}</strong></td>
                                            <td>{item.category}</td>
                                            <td style={{ color: 'var(--brand-primary)', fontWeight: 700 }}>₨ {item.price}</td>
                                            <td>
                                                <span className={`badge badge-${item.available ? 'success' : 'danger'}`}>
                                                    {item.available ? 'Available' : 'Unavailable'}
                                                </span>
                                            </td>
                                            <td>
                                                <button className="btn btn-sm btn-secondary" style={{ marginRight: 6 }}>Edit</button>
                                                <button className="btn btn-sm btn-ghost">{item.available ? 'Disable' : 'Enable'}</button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* ANALYTICS */}
                {activeTab === 'analytics' && (
                    <div className={styles.pageContent}>
                        <h2 className={styles.pageTitle}>📊 Analytics</h2>
                        <div className={styles.analyticsGrid}>
                            {[
                                { label: "Today's Revenue", value: `₨${stats.today}`, change: '+12%', icon: '💰', color: '#00C851' },
                                { label: 'This Week', value: `₨${stats.week}`, change: '+28%', icon: '📅', color: '#3B82F6' },
                                { label: 'Orders Today', value: '24', change: '+5', icon: '📦', color: '#FFB800' },
                                { label: 'Avg Order Value', value: '₨540', change: '+3%', icon: '🛒', color: '#8B5CF6' },
                            ].map((s, i) => (
                                <div key={i} className="stat-card">
                                    <div className="stat-icon" style={{ background: s.color + '22' }}>{s.icon}</div>
                                    <div className="stat-value" style={{ color: s.color }}>{s.value}</div>
                                    <div className="stat-label">{s.label}</div>
                                    <div className="stat-change up">↑ {s.change} vs yesterday</div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}
