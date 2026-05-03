import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Layout from '../../components/common/Layout';
import Background3D from '../../components/common/Background3D';
import { useToast } from '../../components/common/Toast';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faGamepad,
    faPlus,
    faCircleInfo,
    faMagnifyingGlass,
    faLayerGroup,
    faGripVertical,
    faBookBookmark
} from '@fortawesome/free-solid-svg-icons';
import api from '../../services/api';
import './AppGameManagement.css';

const AppGameManagement = () => {
    const toast = useToast();
    const [loading, setLoading] = useState(true);
    const [buckets, setBuckets] = useState([]);
    const [allGames, setAllGames] = useState([]);
    const [selectedBucketId, setSelectedBucketId] = useState(null);
    const [selectedOrderedIds, setSelectedOrderedIds] = useState([]);
    const [detailGame, setDetailGame] = useState(null);
    const [saving, setSaving] = useState(false);

    const [newBucket, setNewBucket] = useState({ key: '', name: '', description: '' });
    const [newGame, setNewGame] = useState({ slug: '', name: '', shortDescription: '', fullDescription: '' });
    const [gameSearch, setGameSearch] = useState('');

    const selectedBucket = useMemo(
        () => buckets.find((b) => b.id === selectedBucketId) || null,
        [buckets, selectedBucketId]
    );

    const filteredGames = useMemo(() => {
        const q = gameSearch.trim().toLowerCase();
        if (!q) return allGames;
        return allGames.filter(
            (g) =>
                g.name.toLowerCase().includes(q) ||
                (g.slug && g.slug.toLowerCase().includes(q))
        );
    }, [allGames, gameSearch]);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                setLoading(true);
                const [bRes, gRes] = await Promise.all([
                    api.get('/api/admin/skill-buckets'),
                    api.get('/api/admin/games-catalog')
                ]);
                if (cancelled) return;
                setBuckets(bRes.data);
                setAllGames(gRes.data);
                if (bRes.data.length) {
                    setSelectedBucketId((prev) => prev || bRes.data[0].id);
                }
            } catch (e) {
                console.error(e);
                toast.error(e.response?.data?.message || 'Failed to load');
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [toast]);

    useEffect(() => {
        if (!selectedBucketId) return;
        let cancelled = false;
        (async () => {
            try {
                const { data } = await api.get(`/api/admin/skill-buckets/${selectedBucketId}/games`);
                if (cancelled) return;
                setSelectedOrderedIds((data.games || []).map((g) => g.id));
            } catch (e) {
                console.error(e);
                toast.error('Could not load bucket games');
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [selectedBucketId, toast]);

    const toggleGame = (id) => {
        setSelectedOrderedIds((prev) => {
            if (prev.includes(id)) return prev.filter((x) => x !== id);
            return [...prev, id];
        });
    };

    const saveBucketGames = async () => {
        if (!selectedBucketId) return;
        setSaving(true);
        try {
            await api.put(`/api/admin/skill-buckets/${selectedBucketId}/games`, { gameIds: selectedOrderedIds });
            toast.success('Games saved for this bucket');
        } catch (e) {
            toast.error(e.response?.data?.message || 'Save failed');
        } finally {
            setSaving(false);
        }
    };

    const createBucket = async () => {
        if (!newBucket.key.trim() || !newBucket.name.trim()) {
            toast.warning('Key and name required');
            return;
        }
        try {
            const { data } = await api.post('/api/admin/skill-buckets', {
                key: newBucket.key,
                name: newBucket.name,
                description: newBucket.description
            });
            setBuckets((b) => [...b, data]);
            setSelectedBucketId(data.id);
            setNewBucket({ key: '', name: '', description: '' });
            toast.success('Bucket created');
        } catch (e) {
            toast.error(e.response?.data?.message || 'Failed');
        }
    };

    const createGame = async () => {
        if (!newGame.slug.trim() || !newGame.name.trim()) {
            toast.warning('Slug and name required');
            return;
        }
        try {
            const { data } = await api.post('/api/admin/games-catalog', {
                slug: newGame.slug,
                name: newGame.name,
                shortDescription: newGame.shortDescription,
                fullDescription: newGame.fullDescription
            });
            setAllGames((g) => [...g, data].sort((a, b) => a.name.localeCompare(b.name)));
            setNewGame({ slug: '', name: '', shortDescription: '', fullDescription: '' });
            toast.success('Game added to catalog');
        } catch (e) {
            toast.error(e.response?.data?.message || 'Failed');
        }
    };

    if (loading) {
        return (
            <Layout title="App & Game Management" subtitle="Skill buckets and activities">
                <div className="loading-container">
                    <div className="spinner" />
                    <p className="loading-text">Loading…</p>
                </div>
            </Layout>
        );
    }

    return (
        <Layout title="App & Game Management" subtitle="Map regulation activities to skill buckets for the mobile app">
            <Background3D />
            <div className="agm-page">
                <motion.header
                    className="agm-hero"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.35 }}
                >
                    <div className="agm-hero-copy">
                        <span className="agm-hero-eyebrow">Mobile app configuration</span>
                        <h1 className="agm-hero-title">Skill buckets &amp; activity catalog</h1>
                        <p className="agm-hero-desc">
                            Choose which experiences appear under each skill area in the app. Selection order is kept when you save.
                        </p>
                    </div>
                    <div className="agm-hero-stats">
                        <div className="agm-stat">
                            <FontAwesomeIcon icon={faLayerGroup} className="agm-stat-icon" />
                            <div>
                                <span className="agm-stat-value">{buckets.length}</span>
                                <span className="agm-stat-label">Buckets</span>
                            </div>
                        </div>
                        <div className="agm-stat">
                            <FontAwesomeIcon icon={faGamepad} className="agm-stat-icon" />
                            <div>
                                <span className="agm-stat-value">{allGames.length}</span>
                                <span className="agm-stat-label">Catalog</span>
                            </div>
                        </div>
                        <div className="agm-stat agm-stat--highlight">
                            <FontAwesomeIcon icon={faBookBookmark} className="agm-stat-icon" />
                            <div>
                                <span className="agm-stat-value">{selectedOrderedIds.length}</span>
                                <span className="agm-stat-label">In this bucket</span>
                            </div>
                        </div>
                    </div>
                </motion.header>

                <div className="agm-layout">
                    <motion.aside
                        className="agm-card agm-card--buckets"
                        initial={{ opacity: 0, y: 14 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.05 }}
                    >
                        <div className="agm-card-head">
                            <div className="agm-card-head-icon">
                                <FontAwesomeIcon icon={faLayerGroup} />
                            </div>
                            <div>
                                <h2 className="agm-card-title">Skill buckets</h2>
                                <p className="agm-card-sub">Groups of activities per skill area in the app.</p>
                            </div>
                        </div>

                        <ul className="agm-bucket-list">
                            {buckets.map((b, i) => (
                                <motion.li
                                    key={b.id}
                                    initial={{ opacity: 0, x: -8 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: 0.04 + i * 0.03 }}
                                >
                                    <button
                                        type="button"
                                        className={`agm-bucket-btn ${selectedBucketId === b.id ? 'active' : ''}`}
                                        onClick={() => setSelectedBucketId(b.id)}
                                    >
                                        <span className="agm-bucket-name">{b.name}</span>
                                        <code className="agm-bucket-key">{b.key}</code>
                                        <span className="agm-badge">{b.gameCount ?? 0}</span>
                                    </button>
                                </motion.li>
                            ))}
                        </ul>

                        <div className="agm-create">
                            <div className="agm-create-label">
                                <span className="agm-create-kicker">Create</span>
                                <h3 className="agm-create-title">New bucket</h3>
                            </div>
                            <div className="agm-field">
                                <label className="agm-label" htmlFor="agm-bucket-key">
                                    Key
                                </label>
                                <input
                                    id="agm-bucket-key"
                                    className="form-input agm-input"
                                    placeholder="e.g. CUSTOM_ONE"
                                    value={newBucket.key}
                                    onChange={(e) => setNewBucket({ ...newBucket, key: e.target.value })}
                                />
                            </div>
                            <div className="agm-field">
                                <label className="agm-label" htmlFor="agm-bucket-name">
                                    Display name
                                </label>
                                <input
                                    id="agm-bucket-name"
                                    className="form-input agm-input"
                                    placeholder="Shown in the app"
                                    value={newBucket.name}
                                    onChange={(e) => setNewBucket({ ...newBucket, name: e.target.value })}
                                />
                            </div>
                            <div className="agm-field">
                                <label className="agm-label" htmlFor="agm-bucket-desc">
                                    Description <span className="agm-optional">(optional)</span>
                                </label>
                                <textarea
                                    id="agm-bucket-desc"
                                    className="form-input agm-input"
                                    rows={2}
                                    placeholder="Internal notes or player-facing copy"
                                    value={newBucket.description}
                                    onChange={(e) => setNewBucket({ ...newBucket, description: e.target.value })}
                                />
                            </div>
                            <button type="button" className="btn agm-btn-add" onClick={createBucket}>
                                <FontAwesomeIcon icon={faPlus} /> Add bucket
                            </button>
                        </div>
                    </motion.aside>

                    <motion.section
                        className="agm-card agm-card--games"
                        initial={{ opacity: 0, y: 14 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.08 }}
                    >
                        <div className="agm-games-toolbar">
                            <div>
                                <h2 className="agm-card-title agm-games-title">
                                    Games in bucket
                                    {selectedBucket && (
                                        <span className="agm-bucket-pill">{selectedBucket.name}</span>
                                    )}
                                </h2>
                                <p className="agm-card-sub agm-games-hint">
                                    <FontAwesomeIcon icon={faGripVertical} className="agm-hint-icon" />
                                    Turn activities on for this bucket. Numbers show save order; toggle off and on to move an item to the end.
                                </p>
                            </div>
                            <button
                                type="button"
                                className="btn btn-primary agm-save"
                                onClick={saveBucketGames}
                                disabled={saving || !selectedBucketId}
                            >
                                {saving ? 'Saving…' : 'Save changes'}
                            </button>
                        </div>

                        <div className="agm-search-wrap">
                            <FontAwesomeIcon icon={faMagnifyingGlass} className="agm-search-icon" />
                            <input
                                type="search"
                                className="form-input agm-input agm-search"
                                placeholder="Filter by name or slug…"
                                value={gameSearch}
                                onChange={(e) => setGameSearch(e.target.value)}
                                aria-label="Filter games"
                            />
                        </div>

                        <div className="agm-game-list">
                            {filteredGames.length === 0 ? (
                                <p className="agm-empty">No games match your search.</p>
                            ) : (
                                filteredGames.map((g, i) => {
                                    const on = selectedOrderedIds.includes(g.id);
                                    const orderIdx = on ? selectedOrderedIds.indexOf(g.id) + 1 : null;
                                    return (
                                        <motion.div
                                            key={g.id}
                                            className={`agm-game-row ${on ? 'agm-game-row--on' : ''}`}
                                            initial={{ opacity: 0, y: 6 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: Math.min(0.15, i * 0.012) }}
                                            onClick={() => toggleGame(g.id)}
                                        >
                                            <div className="agm-game-main">
                                                {on && <span className="agm-order-badge">{orderIdx}</span>}
                                                <span className="agm-game-title">{g.name}</span>
                                            </div>
                                            <code className="agm-game-slug" title={g.slug}>
                                                {g.slug}
                                            </code>
                                            <div className="agm-game-actions">
                                                <button
                                                    type="button"
                                                    className="agm-icon-btn"
                                                    title="View details"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setDetailGame(g);
                                                    }}
                                                >
                                                    <FontAwesomeIcon icon={faCircleInfo} />
                                                </button>
                                                <button
                                                    type="button"
                                                    role="switch"
                                                    aria-checked={on}
                                                    className={`agm-switch ${on ? 'agm-switch--on' : ''}`}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        toggleGame(g.id);
                                                    }}
                                                >
                                                    <span className="agm-switch-knob" />
                                                </button>
                                            </div>
                                        </motion.div>
                                    );
                                })
                            )}
                        </div>
                    </motion.section>

                    <motion.section
                        className="agm-card agm-card--catalog"
                        initial={{ opacity: 0, y: 14 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                    >
                        <div className="agm-card-head agm-card-head--compact">
                            <div className="agm-card-head-icon agm-card-head-icon--alt">
                                <FontAwesomeIcon icon={faPlus} />
                            </div>
                            <div>
                                <h2 className="agm-card-title">New game</h2>
                                <p className="agm-card-sub">Adds to the catalog for every bucket.</p>
                            </div>
                        </div>

                        <div className="agm-field">
                            <label className="agm-label" htmlFor="agm-game-slug">
                                Slug
                            </label>
                            <input
                                id="agm-game-slug"
                                className="form-input agm-input"
                                placeholder="unique_snake_case"
                                value={newGame.slug}
                                onChange={(e) => setNewGame({ ...newGame, slug: e.target.value })}
                            />
                        </div>
                        <div className="agm-field">
                            <label className="agm-label" htmlFor="agm-game-name">
                                Name
                            </label>
                            <input
                                id="agm-game-name"
                                className="form-input agm-input"
                                placeholder="Display name"
                                value={newGame.name}
                                onChange={(e) => setNewGame({ ...newGame, name: e.target.value })}
                            />
                        </div>
                        <div className="agm-field">
                            <label className="agm-label" htmlFor="agm-game-short">
                                Short description
                            </label>
                            <input
                                id="agm-game-short"
                                className="form-input agm-input"
                                placeholder="List / card copy"
                                value={newGame.shortDescription}
                                onChange={(e) => setNewGame({ ...newGame, shortDescription: e.target.value })}
                            />
                        </div>
                        <div className="agm-field">
                            <label className="agm-label" htmlFor="agm-game-full">
                                Full description
                            </label>
                            <textarea
                                id="agm-game-full"
                                className="form-input agm-input"
                                rows={4}
                                placeholder="Detail screen in the app"
                                value={newGame.fullDescription}
                                onChange={(e) => setNewGame({ ...newGame, fullDescription: e.target.value })}
                            />
                        </div>
                        <button type="button" className="btn agm-btn-catalog" onClick={createGame}>
                            <FontAwesomeIcon icon={faPlus} /> Add to catalog
                        </button>
                    </motion.section>
                </div>
            </div>

            <AnimatePresence>
                {detailGame && (
                    <motion.div
                        className="modal-overlay"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setDetailGame(null)}
                    >
                        <motion.div
                            className="modal modal-large agm-detail-modal"
                            initial={{ opacity: 0, scale: 0.96 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.96 }}
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="modal-header">
                                <h2 className="modal-title">{detailGame.name}</h2>
                                <button type="button" className="modal-close" onClick={() => setDetailGame(null)}>
                                    ×
                                </button>
                            </div>
                            <div className="modal-body modal-body-scroll">
                                <p className="agm-muted">{detailGame.shortDescription || detailGame.short_description}</p>
                                <pre className="agm-detail-pre">{detailGame.fullDescription || detailGame.full_description || '—'}</pre>
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn btn-primary" onClick={() => setDetailGame(null)}>
                                    Close
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </Layout>
    );
};

export default AppGameManagement;
