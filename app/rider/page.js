'use client';
import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import styles from './rider.module.css';

const VEHICLES = [
    { id: 'bike', icon: '🏍️', name: 'Bike', pax: 1, base: 50, perKm: 20, eta: '2-4' },
    { id: 'rickshaw', icon: '🛺', name: 'Rickshaw', pax: 3, base: 70, perKm: 25, eta: '3-6' },
    { id: 'car', icon: '🚗', name: 'Car', pax: 4, base: 150, perKm: 45, eta: '4-8' },
    { id: 'car_xl', icon: '🚙', name: 'Car XL', pax: 6, base: 200, perKm: 65, eta: '5-10' },
    { id: 'van', icon: '🚐', name: 'Van', pax: 12, base: 300, perKm: 80, eta: '6-12' },
];

const LAHORE = [31.5204, 74.3587];

function haversine(lat1, lng1, lat2, lng2) {
    const R = 6371;
    const dL = (lat2 - lat1) * Math.PI / 180;
    const dG = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dL / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dG / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Map pick mode: 'pickup' | 'dropoff' | null
let _pickMode = null;

export default function RiderHome() {
    const router = useRouter();
    const mapRef = useRef(null);
    const mapInst = useRef(null);
    const mkPickup = useRef(null);
    const mkDropoff = useRef(null);
    const mkDriver = useRef(null);
    const routeLine = useRef(null);
    const driverSim = useRef(null);

    const [user, setUser] = useState(null);
    const [profile, setProfile] = useState(null);
    const [pickMode, setPickMode] = useState(null); // 'pickup' | 'dropoff'
    const [pickup, setPickup] = useState('');
    const [dropoff, setDropoff] = useState('');
    const [pickupLL, setPickupLL] = useState(null);   // [lat,lng]
    const [dropoffLL, setDropoffLL] = useState(null);
    const [vehicle, setVehicle] = useState('car');
    const [route, setRoute] = useState(null);   // {dist, dur, fare}
    const [step, setStep] = useState('booking'); // booking|confirming|tracking
    const [rideStatus, setRideStatus] = useState('');
    const [driverInfo, setDriverInfo] = useState(null);
    const [driverPos, setDriverPos] = useState(null);
    const [wallet, setWallet] = useState(0);
    const [history, setHistory] = useState([]);
    const [activeTab, setActiveTab] = useState('ride');
    const [notif, setNotif] = useState(null);
    const [loading, setLoading] = useState(false);
    // Profile edit
    const [editMode, setEditMode] = useState(false);
    const [profForm, setProfForm] = useState({});
    const [profSaving, setProfSaving] = useState(false);

    // ─── Auth ────────────────────────────────────────────────────────────
    useEffect(() => {
        const u = localStorage.getItem('user');
        if (!u) { router.push('/login'); return; }
        const parsed = JSON.parse(u);
        if (parsed.role !== 'rider') {
            if (parsed.role === 'driver') router.push('/driver');
            else if (parsed.role === 'merchant') router.push('/merchant');
            else if (parsed.role === 'admin' || parsed.role === 'support') router.push('/admin');
            return;
        }
        setUser(parsed);
        fetchProfile();
        fetchHistory();
    }, [router]);

    // ─── Init Leaflet Map ────────────────────────────────────────────────
    useEffect(() => {
        if (!mapRef.current || mapInst.current) return;
        let alive = true;

        import('leaflet').then(L => {
            if (!alive || !mapRef.current || mapInst.current) return;

            const map = L.map(mapRef.current, { center: LAHORE, zoom: 13, zoomControl: false });
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '© OpenStreetMap', maxZoom: 19,
            }).addTo(map);
            L.control.zoom({ position: 'bottomright' }).addTo(map);
            mapInst.current = map;

            // Demo nearby drivers
            [[31.523, 74.358], [31.518, 74.363], [31.525, 74.353], [31.515, 74.356], [31.527, 74.366]]
                .forEach(([lt, lg]) => {
                    const ic = L.divIcon({ className: '', html: '<div style="font-size:20px">🏍️</div>', iconSize: [24, 24], iconAnchor: [12, 12] });
                    L.marker([lt, lg], { icon: ic }).addTo(map);
                });

            // Try user GPS
            if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition(pos => {
                    const { latitude: lat, longitude: lng } = pos.coords;
                    map.setView([lat, lng], 15);
                    handleSetPickup(L, map, lat, lng, 'My Location');
                }, () => { });
            }

            // Click handler uses module-level var to avoid stale closure
            map.on('click', e => {
                const { lat, lng } = e.latlng;
                if (_pickMode === 'pickup') handleSetPickup(L, map, lat, lng, `${lat.toFixed(5)}, ${lng.toFixed(5)}`);
                else if (_pickMode === 'dropoff') handleSetDropoff(L, map, lat, lng, `${lat.toFixed(5)}, ${lng.toFixed(5)}`);
            });
        });

        return () => { alive = false; };
    }, []);

    // Keep module var in sync with state
    useEffect(() => { _pickMode = pickMode; }, [pickMode]);

    // ─── Helpers: set pickup / dropoff markers ───────────────────────────
    function handleSetPickup(L, map, lat, lng, label) {
        if (mkPickup.current) mkPickup.current.remove();
        const ic = L.divIcon({ className: '', html: '<div style="font-size:24px;filter:drop-shadow(0 2px 4px rgba(0,0,0,.5))">🟢</div>', iconSize: [24, 24], iconAnchor: [12, 24] });
        mkPickup.current = L.marker([lat, lng], { icon: ic }).addTo(map).bindPopup('📍 Pickup').openPopup();
        setPickupLL([lat, lng]);
        setPickup(label);
        setPickMode(null);
        _pickMode = null;
    }

    function handleSetDropoff(L, map, lat, lng, label) {
        if (mkDropoff.current) mkDropoff.current.remove();
        const ic = L.divIcon({ className: '', html: '<div style="font-size:24px;filter:drop-shadow(0 2px 4px rgba(0,0,0,.5))">🔴</div>', iconSize: [24, 24], iconAnchor: [12, 24] });
        mkDropoff.current = L.marker([lat, lng], { icon: ic }).addTo(map).bindPopup('📍 Dropoff').openPopup();
        setDropoffLL([lat, lng]);
        setDropoff(label);
        setPickMode(null);
        _pickMode = null;
    }

    // ─── OSRM route calculation ──────────────────────────────────────────
    useEffect(() => {
        if (!pickupLL || !dropoffLL) return;
        calcRoute(pickupLL, dropoffLL);
    }, [pickupLL, dropoffLL, vehicle]);

    async function calcRoute(pLL, dLL) {
        try {
            const url = `https://router.project-osrm.org/route/v1/driving/${pLL[1]},${pLL[0]};${dLL[1]},${dLL[0]}?overview=full&geometries=geojson`;
            const res = await fetch(url);
            const data = await res.json();
            if (data.code !== 'Ok') throw new Error('OSRM error');

            const dist = data.routes[0].distance / 1000; // km
            const dur = Math.round(data.routes[0].duration / 60); // minutes
            const v = VEHICLES.find(v => v.id === vehicle) || VEHICLES[2];
            const fare = Math.round(v.base + v.perKm * dist);

            setRoute({ dist: dist.toFixed(1), dur, fare, geometry: data.routes[0].geometry });

            // Draw route on map
            import('leaflet').then(L => {
                if (!mapInst.current) return;
                if (routeLine.current) routeLine.current.remove();
                routeLine.current = L.geoJSON(data.routes[0].geometry, {
                    style: { color: '#00C851', weight: 4, opacity: 0.85, dashArray: '8 4' },
                }).addTo(mapInst.current);
                mapInst.current.fitBounds(routeLine.current.getBounds(), { padding: [60, 60] });
            });
        } catch {
            // Fallback haversine
            if (!pickupLL || !dropoffLL) return;
            const dist = haversine(pLL[0], pLL[1], dLL[0], dLL[1]);
            const v = VEHICLES.find(v => v.id === vehicle) || VEHICLES[2];
            const fare = Math.round(v.base + v.perKm * dist);
            setRoute({ dist: dist.toFixed(1), dur: Math.round(dist * 3), fare, geometry: null });
        }
    }

    // ─── Profile fetch ───────────────────────────────────────────────────
    async function fetchProfile() {
        const token = localStorage.getItem('token');
        try {
            const res = await fetch('/api/auth/me', { headers: { Authorization: `Bearer ${token}` } });
            const data = await res.json();
            if (res.ok) {
                setProfile(data.user);
                setWallet(data.user?.wallet?.balance || 0);
                setProfForm({
                    name: data.user.name || '',
                    email: data.user.email || '',
                    phone: data.user.phone || '',
                    cnic: data.user.cnic || '',
                    dateOfBirth: data.user.dateOfBirth || '',
                    gender: data.user.gender || '',
                    address: data.user.address || '',
                    city: data.user.city || '',
                });
            }
        } catch { }
    }

    async function fetchHistory() {
        const token = localStorage.getItem('token');
        try {
            const res = await fetch('/api/rides?limit=10', { headers: { Authorization: `Bearer ${token}` } });
            const data = await res.json();
            if (res.ok) setHistory(data.rides || []);
        } catch { }
    }

    // ─── Save profile ────────────────────────────────────────────────────
    async function saveProfile() {
        setProfSaving(true);
        const token = localStorage.getItem('token');
        try {
            const res = await fetch('/api/auth/me', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify(profForm),
            });
            const data = await res.json();
            if (res.ok) {
                setProfile(p => ({ ...p, ...data.user }));
                const u = JSON.parse(localStorage.getItem('user') || '{}');
                localStorage.setItem('user', JSON.stringify({ ...u, ...data.user }));
                setEditMode(false);
                showNotif('✅ Profile updated successfully!', 'success');
            } else { showNotif(data.error || 'Update failed', 'error'); }
        } catch { showNotif('Network error', 'error'); }
        finally { setProfSaving(false); }
    }

    // ─── Book ride ───────────────────────────────────────────────────────
    const handleBookRide = () => {
        if (!pickupLL || !dropoffLL) { showNotif('Tap the map to set 📍 Pickup and 🔴 Dropoff', 'error'); return; }
        setStep('confirming');
    };

    const handleConfirmRide = async () => {
        setLoading(true);
        const token = localStorage.getItem('token');
        try {
            const res = await fetch('/api/rides', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({
                    pickupLat: pickupLL[0], pickupLng: pickupLL[1], pickupAddress: pickup,
                    dropoffLat: dropoffLL[0], dropoffLng: dropoffLL[1], dropoffAddress: dropoff,
                    vehicleType: vehicle, paymentMethod: 'cash',
                }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            setStep('tracking');
            setRideStatus('Searching for driver…');
            setDriverInfo({ name: 'Ali Hassan', rating: 4.9, vehicle: 'Honda CG125', plate: 'LEA-2024', phone: '0300-1234567' });
            showNotif('🎉 Ride booked! Finding your driver…', 'success');
            simulateDriver();
        } catch (e) { showNotif(e.message || 'Failed to book', 'error'); }
        finally { setLoading(false); }
    };

    function simulateDriver() {
        if (!pickupLL) return;
        let pos = [pickupLL[0] - 0.015, pickupLL[1] + 0.015];
        const move = () => {
            pos = [pos[0] + (pickupLL[0] - pos[0]) * 0.1, pos[1] + (pickupLL[1] - pos[1]) * 0.1];
            setDriverPos([...pos]);
            import('leaflet').then(L => {
                if (!mapInst.current) return;
                if (mkDriver.current) mkDriver.current.remove();
                const ic = L.divIcon({ className: '', html: '<div style="font-size:26px">🚗</div>', iconSize: [30, 30], iconAnchor: [15, 15] });
                mkDriver.current = L.marker(pos, { icon: ic }).addTo(mapInst.current);
                mapInst.current.panTo(pos);
            });
            if (Math.abs(pos[0] - pickupLL[0]) > 0.001) {
                driverSim.current = setTimeout(move, 1800);
            } else {
                setRideStatus('Driver has arrived!');
                showNotif('🟢 Driver has arrived at pickup!', 'success');
            }
        };
        driverSim.current = setTimeout(move, 2000);
    }

    const resetRide = () => {
        if (driverSim.current) clearTimeout(driverSim.current);
        if (mkPickup.current) { mkPickup.current.remove(); mkPickup.current = null; }
        if (mkDropoff.current) { mkDropoff.current.remove(); mkDropoff.current = null; }
        if (mkDriver.current) { mkDriver.current.remove(); mkDriver.current = null; }
        if (routeLine.current) { routeLine.current.remove(); routeLine.current = null; }
        setPickup(''); setDropoff(''); setPickupLL(null); setDropoffLL(null);
        setRoute(null); setStep('booking'); setDriverInfo(null); setPickMode(null);
    };

    const showNotif = (msg, type = 'info') => {
        setNotif({ msg, type });
        setTimeout(() => setNotif(null), 4000);
    };

    const logout = () => { localStorage.clear(); router.push('/login'); };

    if (!user) return <div className="loading-screen"><div className="spinner" /><p>Loading…</p></div>;

    const selVehicle = VEHICLES.find(v => v.id === vehicle) || VEHICLES[2];

    // ─── Render ──────────────────────────────────────────────────────────
    return (
        <div className={styles.layout}>
            {/* ── SIDEBAR ─────────────────────────────────────── */}
            <aside className={styles.sidebar}>
                <div className={styles.sidebarTop}>
                    <div className={styles.brand}><span>🚀</span><span className={styles.brandText}>Apni Services</span></div>
                    <div className={styles.userCard}>
                        <div className={styles.userAvatar}>{user.name?.[0]?.toUpperCase()}</div>
                        <div>
                            <div className={styles.userName}>{user.name}</div>
                            <div className={styles.userPhone}>{user.phone}</div>
                        </div>
                    </div>
                    <div className={styles.walletBadge}>
                        <span>💰</span><span>₨ {wallet.toFixed(0)}</span>
                        <button className="btn btn-sm btn-primary" style={{ marginLeft: 'auto' }}>Top Up</button>
                    </div>
                </div>

                <nav className={styles.nav}>
                    {[
                        { id: 'ride', icon: '🚗', label: 'Book Ride' },
                        { id: 'food', icon: '🍔', label: 'Order Food' },
                        { id: 'parcel', icon: '📦', label: 'Send Parcel' },
                        { id: 'history', icon: '📋', label: 'My Rides' },
                        { id: 'profile', icon: '👤', label: 'Profile' },
                    ].map(item => (
                        <button key={item.id}
                            className={`${styles.navItem} ${activeTab === item.id ? styles.navItemActive : ''}`}
                            onClick={() => { setActiveTab(item.id); if (item.id === 'ride') setStep('booking'); }}>
                            <span>{item.icon}</span><span>{item.label}</span>
                        </button>
                    ))}
                </nav>
                <button onClick={logout} className={styles.logoutBtn}>🚪 Logout</button>
            </aside>

            {/* ── MAP ─────────────────────────────────────────── */}
            <main className={styles.main}>
                {/* Map always present in background for ride tab */}
                <div ref={mapRef} className={styles.map}
                    style={{ display: activeTab === 'ride' ? 'block' : 'none' }} />

                {/* ── PICK-MODE HINT BANNER ── */}
                {activeTab === 'ride' && pickMode && (
                    <div className={styles.pickBanner}>
                        {pickMode === 'pickup'
                            ? '📍 Tap map to set PICKUP location'
                            : '🔴 Tap map to set DROPOFF location'}
                        <button className={styles.pickBannerClose} onClick={() => setPickMode(null)}>✕</button>
                    </div>
                )}

                {/* ── BOOKING PANEL ── */}
                {activeTab === 'ride' && step === 'booking' && (
                    <div className={styles.bookingPanel}>
                        <h3 className={styles.panelTitle}>🚗 Book a Ride</h3>

                        {/* Location rows */}
                        <div className={styles.locationInputs}>
                            <div className={styles.locationRow}>
                                <span className={styles.dot} style={{ background: '#00C851' }} />
                                <input className="input" placeholder="Pickup location"
                                    value={pickup} onChange={e => setPickup(e.target.value)}
                                    style={{ flex: 1 }} readOnly={false} />
                                <button className={`btn btn-sm ${pickMode === 'pickup' ? 'btn-primary' : 'btn-secondary'}`}
                                    style={{ flexShrink: 0 }}
                                    onClick={() => setPickMode(m => m === 'pickup' ? null : 'pickup')}>
                                    📍 Map
                                </button>
                            </div>
                            <div className={styles.locationDivider} />
                            <div className={styles.locationRow}>
                                <span className={styles.dot} style={{ background: '#FF4136' }} />
                                <input className="input" placeholder="Dropoff location"
                                    value={dropoff} onChange={e => setDropoff(e.target.value)}
                                    style={{ flex: 1 }} readOnly={false} />
                                <button className={`btn btn-sm ${pickMode === 'dropoff' ? 'btn-primary' : 'btn-secondary'}`}
                                    style={{ flexShrink: 0 }}
                                    onClick={() => setPickMode(m => m === 'dropoff' ? null : 'dropoff')}>
                                    🔴 Map
                                </button>
                            </div>
                        </div>

                        {/* Route info chip */}
                        {route && (
                            <div className={styles.routeChip}>
                                <span>📏 {route.dist} km</span>
                                <span>⏱ {route.dur} min</span>
                                <span>💰 ₨{route.fare} est.</span>
                            </div>
                        )}

                        {/* Vehicle selector */}
                        <div className={styles.vehiclesGrid}>
                            {VEHICLES.map(v => {
                                const dist = pickupLL && dropoffLL
                                    ? parseFloat(route?.dist || haversine(pickupLL[0], pickupLL[1], dropoffLL[0], dropoffLL[1]).toFixed(1))
                                    : 3;
                                const fare = Math.round(v.base + v.perKm * dist);
                                return (
                                    <button key={v.id}
                                        className={`${styles.vehicleBtn} ${vehicle === v.id ? styles.vehicleBtnSelected : ''}`}
                                        onClick={() => setVehicle(v.id)}>
                                        <span className={styles.vehicleEmoji}>{v.icon}</span>
                                        <span className={styles.vehicleName}>{v.name}</span>
                                        <span className={styles.vehicleFare}>₨{fare}</span>
                                        <span className={styles.vehicleEta}>{v.eta}m</span>
                                    </button>
                                );
                            })}
                        </div>

                        <button className="btn btn-primary w-full btn-lg" onClick={handleBookRide}>
                            🔍 Find Drivers
                        </button>
                    </div>
                )}

                {/* ── CONFIRMING PANEL ── */}
                {activeTab === 'ride' && step === 'confirming' && (
                    <div className={styles.bookingPanel}>
                        <button className={styles.backBtn} onClick={() => setStep('booking')}>← Back</button>
                        <h3 className={styles.panelTitle}>✅ Confirm Ride</h3>
                        <div className={styles.confirmDetails}>
                            <div className={styles.confirmRow}><span>🟢 From</span><span>{pickup}</span></div>
                            <div className={styles.confirmRow}><span>🔴 To</span><span>{dropoff}</span></div>
                            <div className={styles.confirmRow}><span>{selVehicle.icon} Vehicle</span><span>{selVehicle.name}</span></div>
                            <div className={styles.confirmRow}><span>📏 Distance</span><span>{route?.dist || '--'} km</span></div>
                            <div className={styles.confirmRow}><span>⏱ Duration</span><span>~ {route?.dur || '--'} min</span></div>
                            <div className={`${styles.confirmRow} ${styles.fareRow}`}>
                                <span>💰 Est. Fare</span><span>₨ {route?.fare || '--'}</span>
                            </div>
                        </div>
                        <div className={styles.paymentOptions}>
                            <div className={styles.paymentOption}>💵 Cash on Arrival</div>
                            <div className={styles.paymentOption}>👛 Wallet (₨{wallet.toFixed(0)})</div>
                        </div>
                        <button className="btn btn-primary w-full btn-lg" onClick={handleConfirmRide} disabled={loading}>
                            {loading ? <span className="spinner" style={{ width: 20, height: 20, borderWidth: 2 }} /> : '🚀 Confirm Ride'}
                        </button>
                    </div>
                )}

                {/* ── TRACKING PANEL ── */}
                {activeTab === 'ride' && step === 'tracking' && (
                    <div className={styles.trackingPanel}>
                        <div className={styles.trackingStatus}>
                            <div className="pulse-dot" /><span>{rideStatus || 'Driver on the way…'}</span>
                        </div>
                        {driverInfo && (
                            <div className={styles.driverCard}>
                                <div className={styles.driverAvatar}>{driverInfo.name[0]}</div>
                                <div className={styles.driverInfo}>
                                    <div className={styles.driverName}>{driverInfo.name}</div>
                                    <div className={styles.driverRating}>★ {driverInfo.rating}</div>
                                    <div className={styles.driverVehicle}>{driverInfo.vehicle} · {driverInfo.plate}</div>
                                </div>
                                <div className={styles.driverActions}>
                                    <a href={`tel:${driverInfo.phone}`} className="btn btn-secondary btn-sm">📞</a>
                                    <button className="btn btn-danger btn-sm" onClick={resetRide}>Cancel</button>
                                </div>
                            </div>
                        )}
                        <div className={styles.etaBar}>
                            {['🔍 Found', '🚗 En Route', '📍 Arrived', '✅ Done'].map((s, i) => (
                                <div key={s} className={styles.etaStep}
                                    data-active={i === 0 || undefined}>{s}</div>
                            ))}
                        </div>
                    </div>
                )}

                {/* ── FOOD & PARCEL TABS ── */}
                {activeTab === 'food' && (
                    <div className={styles.altPanel}>
                        <h3 className={styles.panelTitle}>🍔 Order Food</h3>
                        <p className="text-muted">Browse local restaurants and get food delivered fast.</p>
                    </div>
                )}
                {activeTab === 'parcel' && (
                    <div className={styles.altPanel}>
                        <h3 className={styles.panelTitle}>📦 Send a Parcel</h3>
                        <p className="text-muted">Same-day city-wide parcel delivery.</p>
                    </div>
                )}

                {/* ── HISTORY TAB ── */}
                {activeTab === 'history' && (
                    <div className={styles.historyPanel}>
                        <h3 className={styles.panelTitle}>📋 Ride History</h3>
                        {history.length === 0 ? (
                            <div className={styles.empty}>
                                <span style={{ fontSize: '3rem' }}>🚗</span>
                                <p>No rides yet. Book your first ride!</p>
                            </div>
                        ) : history.map(r => (
                            <div key={r.id} className={styles.historyItem}>
                                <div>
                                    <div className={styles.historyAddr}>{r.pickupAddress} → {r.dropoffAddress}</div>
                                    <div className={styles.historyMeta}>
                                        {new Date(r.createdAt).toLocaleDateString()} · {r.vehicleType} · {r.distanceKm?.toFixed(1) || '--'} km
                                    </div>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                    <span className={`badge badge-${r.status === 'completed' ? 'success' : r.status === 'cancelled' ? 'danger' : 'warning'}`}>
                                        {r.status}
                                    </span>
                                    <div className={styles.historyFare}>₨{r.fareFinal || r.fareEstimate || '--'}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* ── PROFILE TAB ── */}
                {activeTab === 'profile' && (
                    <div className={styles.profilePanel}>
                        <div className={styles.profileHeader}>
                            <div className={styles.profileAvatar}>{(profile?.name || user.name)?.[0]?.toUpperCase()}</div>
                            <div>
                                <div className={styles.profileName}>{profile?.name || user.name}</div>
                                <div className={styles.profileRole}>👤 Rider Account</div>
                                {profile?.isVerified && <span className="badge badge-success" style={{ marginTop: 6 }}>✅ Verified</span>}
                            </div>
                            <button className={`btn btn-sm ${editMode ? 'btn-danger' : 'btn-primary'}`}
                                onClick={() => { setEditMode(e => !e); }}
                                style={{ marginLeft: 'auto' }}>
                                {editMode ? '✕ Cancel' : '✏️ Edit Profile'}
                            </button>
                        </div>

                        <div className={styles.profGrid}>
                            {[
                                { key: 'name', label: 'Full Name', icon: '👤', type: 'text', placeholder: 'Enter full name' },
                                { key: 'phone', label: 'Phone Number', icon: '📱', type: 'tel', placeholder: '03XX-XXXXXXX', readonly: true },
                                { key: 'email', label: 'Email', icon: '📧', type: 'email', placeholder: 'your@email.com' },
                                { key: 'cnic', label: 'CNIC Number', icon: '🪪', type: 'text', placeholder: 'XXXXX-XXXXXXX-X' },
                                { key: 'dateOfBirth', label: 'Date of Birth', icon: '🎂', type: 'date', placeholder: '' },
                                { key: 'gender', label: 'Gender', icon: '⚧️', type: 'select', options: ['', 'Male', 'Female', 'Prefer not to say'] },
                                { key: 'city', label: 'City', icon: '🏙️', type: 'text', placeholder: 'e.g. Lahore' },
                                { key: 'address', label: 'Home Address', icon: '🏠', type: 'text', placeholder: 'Street, Block, Area' },
                            ].map(field => (
                                <div key={field.key} className={styles.profField}>
                                    <label className={styles.profLabel}>{field.icon} {field.label}</label>
                                    {editMode && !field.readonly ? (
                                        field.type === 'select' ? (
                                            <select className="input" value={profForm[field.key] || ''}
                                                onChange={e => setProfForm(f => ({ ...f, [field.key]: e.target.value }))}>
                                                {field.options.map(o => <option key={o} value={o}>{o || 'Select…'}</option>)}
                                            </select>
                                        ) : (
                                            <input className="input" type={field.type}
                                                placeholder={field.placeholder}
                                                value={profForm[field.key] || ''}
                                                onChange={e => setProfForm(f => ({ ...f, [field.key]: e.target.value }))} />
                                        )
                                    ) : (
                                        <div className={styles.profValue}>
                                            {(profile?.[field.key] || profForm[field.key]) || <span className="text-muted">Not set</span>}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>

                        {editMode && (
                            <button className="btn btn-primary w-full btn-lg" onClick={saveProfile} disabled={profSaving}
                                style={{ marginTop: 20 }}>
                                {profSaving ? <span className="spinner" style={{ width: 20, height: 20, borderWidth: 2 }} /> : '💾 Save Changes'}
                            </button>
                        )}

                        {/* Wallet card */}
                        <div className={styles.walletCard}>
                            <div className={styles.walletCardIcon}>💰</div>
                            <div>
                                <div className={styles.walletCardBal}>₨ {wallet.toFixed(2)}</div>
                                <div className={styles.walletCardLabel}>Wallet Balance</div>
                            </div>
                            <button className="btn btn-primary btn-sm" style={{ marginLeft: 'auto' }}>Top Up</button>
                        </div>
                    </div>
                )}

                {/* ── TOAST ── */}
                {notif && (
                    <div className={`${styles.toast} ${styles['toast_' + notif.type]}`}>{notif.msg}</div>
                )}
            </main>
        </div>
    );
}
