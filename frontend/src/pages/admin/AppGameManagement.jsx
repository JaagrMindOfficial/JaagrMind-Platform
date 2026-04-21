import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Layout from '../../components/common/Layout';
import Background3D from '../../components/common/Background3D';
import { useToast } from '../../components/common/Toast';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faGamepad, faPlus, faCircleInfo } from '@fortawesome/free-solid-svg-icons';
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
                <div className="agm-grid">
                    <motion.section className="agm-card" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
                        <h2>
                            <FontAwesomeIcon icon={faGamepad} /> Skill buckets
                        </h2>
                        <p className="agm-muted">Each bucket groups games shown in the app for that skill area.</p>
                        <ul className="agm-bucket-list">
                            {buckets.map((b) => (
                                <li key={b.id}>
                                    <button
                                        type="button"
                                        className={`agm-bucket-btn ${selectedBucketId === b.id ? 'active' : ''}`}
                                        onClick={() => setSelectedBucketId(b.id)}
                                    >
                                        <span className="agm-bucket-name">{b.name}</span>
                                        <span className="agm-bucket-key">{b.key}</span>
                                        <span className="agm-badge">{b.gameCount ?? 0}</span>
                                    </button>
                                </li>
                            ))}
                        </ul>

                        <div className="agm-create">
                            <h3>New bucket</h3>
                            <input
                                className="form-input"
                                placeholder="KEY (e.g. CUSTOM_ONE)"
                                value={newBucket.key}
                                onChange={(e) => setNewBucket({ ...newBucket, key: e.target.value })}
                            />
                            <input
                                className="form-input"
                                placeholder="Display name"
                                value={newBucket.name}
                                onChange={(e) => setNewBucket({ ...newBucket, name: e.target.value })}
                            />
                            <textarea
                                className="form-input"
                                rows={2}
                                placeholder="Description (optional)"
                                value={newBucket.description}
                                onChange={(e) => setNewBucket({ ...newBucket, description: e.target.value })}
                            />
                            <button type="button" className="btn btn-secondary" onClick={createBucket}>
                                <FontAwesomeIcon icon={faPlus} /> Add bucket
                            </button>
                        </div>
                    </motion.section>

                    <motion.section className="agm-card agm-card-wide" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
                        <h2>Games in bucket</h2>
                        <p className="agm-muted">
                            Select games from the catalog. Order is preserved in the order you add them (toggle off and on again to move to end).
                        </p>
                        <div className="agm-game-list">
                            {allGames.map((g) => (
                                <label key={g.id} className="agm-game-row">
                                    <input
                                        type="checkbox"
                                        checked={selectedOrderedIds.includes(g.id)}
                                        onChange={() => toggleGame(g.id)}
                                    />
                                    <span className="agm-game-title">{g.name}</span>
                                    <span className="agm-game-slug">{g.slug}</span>
                                    <button
                                        type="button"
                                        className="btn btn-outline btn-sm"
                                        onClick={() => setDetailGame(g)}
                                    >
                                        <FontAwesomeIcon icon={faCircleInfo} />
                                    </button>
                                </label>
                            ))}
                        </div>
                        <button type="button" className="btn btn-primary agm-save" onClick={saveBucketGames} disabled={saving || !selectedBucketId}>
                            {saving ? 'Saving…' : 'Save bucket games'}
                        </button>
                    </motion.section>

                    <motion.section className="agm-card" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
                        <h2>New game (catalog)</h2>
                        <p className="agm-muted">Adding a game here makes it available for all buckets.</p>
                        <input
                            className="form-input"
                            placeholder="slug_unique"
                            value={newGame.slug}
                            onChange={(e) => setNewGame({ ...newGame, slug: e.target.value })}
                        />
                        <input
                            className="form-input"
                            placeholder="Name"
                            value={newGame.name}
                            onChange={(e) => setNewGame({ ...newGame, name: e.target.value })}
                        />
                        <input
                            className="form-input"
                            placeholder="Short description (list view)"
                            value={newGame.shortDescription}
                            onChange={(e) => setNewGame({ ...newGame, shortDescription: e.target.value })}
                        />
                        <textarea
                            className="form-input"
                            rows={5}
                            placeholder="Full description (app detail)"
                            value={newGame.fullDescription}
                            onChange={(e) => setNewGame({ ...newGame, fullDescription: e.target.value })}
                        />
                        <button type="button" className="btn btn-secondary" onClick={createGame}>
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
