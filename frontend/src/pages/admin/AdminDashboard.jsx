import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, AreaChart, Area } from 'recharts';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBrain, faCheckCircle, faExclamationCircle, faHeartPulse, faMobileScreenButton, faRobot, faSchool } from '@fortawesome/free-solid-svg-icons';
import Layout from '../../components/common/Layout';
import api from '../../services/api';
import './AdminDashboard.css';

const AdminDashboard = () => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchDashboardData();
    }, []);

    const fetchDashboardData = async () => {
        try {
            const response = await api.get('/api/admin/dashboard');
            setData(response.data);
        } catch (error) {
            console.error('Dashboard fetch error:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <Layout title="Dashboard">
                <div className="loading-container">
                    <div className="spinner"></div>
                    <p className="loading-text">Loading dashboard...</p>
                </div>
            </Layout>
        );
    }

    // Prepare chart data
    const bucketData = data?.analytics?.bucketDistribution
        ? Object.entries(data.analytics.bucketDistribution).map(([name, value]) => ({
            name,
            value,
            color: name.includes('Stable') ? '#34d399' :
                name.includes('Emerging') ? '#fbbf24' : '#f87171'
        }))
        : [];

    const sectionData = data?.analytics?.sectionAverages
        ? [
            { name: 'Focus', score: data.analytics.sectionAverages.A, fill: '#8B5CF6' },
            { name: 'Esteem', score: data.analytics.sectionAverages.B, fill: '#6366f1' },
            { name: 'Social', score: data.analytics.sectionAverages.C, fill: '#06b6d4' },
            { name: 'Hygiene', score: data.analytics.sectionAverages.D, fill: '#f43f5e' }
        ]
        : [];

    const trendData = data?.wellnessTrends || [];
    const attentionData = data?.attentionNeeded || [];
    const latestTrend = trendData.length > 0 ? trendData[trendData.length - 1] : null;
    const avgScore = latestTrend?.score || 0;
    const submissionsInTrendWindow = trendData.reduce((sum, m) => sum + (m.count || 0), 0);
    const mostCommonBucket = bucketData.length > 0
        ? bucketData.reduce((best, cur) => (cur.value > best.value ? cur : best), bucketData[0])
        : null;

    const containerVariants = {
        hidden: { opacity: 0 },
        show: {
            opacity: 1,
            transition: { staggerChildren: 0.1 }
        }
    };

    const itemVariants = {
        hidden: { opacity: 0, y: 10 },
        show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } }
    };

    return (
        <Layout title="Admin Dashboard" subtitle="Platform analytics overview">
            
            <motion.div 
                className="admin-dashboard-wrapper"
                variants={containerVariants}
                initial="hidden"
                animate="show"
            >
                {/* Minimalist Hero Stats */}
                <div className="hero-stats-row">
                    <motion.div variants={itemVariants} className="stat-card aesthetic-card">
                        <div className="stat-info">
                            <div className="stat-value">{data?.overview?.totalSchools || 0}</div>
                            <div className="stat-label">Schools</div>
                        </div>
                    </motion.div>

                    <motion.div variants={itemVariants} className="stat-card aesthetic-card">
                        <div className="stat-info">
                            <div className="stat-value">{data?.overview?.totalStudents || 0}</div>
                            <div className="stat-label">Total Students</div>
                        </div>
                    </motion.div>

                    <motion.div variants={itemVariants} className="stat-card aesthetic-card">
                        <div className="stat-info">
                            <div className="stat-value">{data?.overview?.totalAssessments || 0}</div>
                            <div className="stat-label">Total Check-ins</div>
                        </div>
                    </motion.div>

                    <motion.div variants={itemVariants} className="stat-card aesthetic-card">
                        <div className="stat-info">
                            <div className="stat-value">{data?.overview?.totalSubmissions || 0}</div>
                            <div className="stat-label">Submissions</div>
                        </div>
                    </motion.div>
                </div>

                {/* Bento Box Master Grid */}
                <div className="dashboard-grid-main" style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1.2fr', gap: '24px' }}>
                    
                    {/* Row 1 / Col 1 - Trends */}
                    <motion.div variants={itemVariants} style={{ gridColumn: '1' }}>
                        <div className="chart-card aesthetic-card" style={{ height: '320px' }}>
                            <div className="chart-title">
                                <span>Wellness Progress</span>
                                <span style={{ fontSize: '0.85rem', color: '#10B981', fontWeight: 600 }}>+4.2%</span>
                            </div>
                            {trendData.length > 0 ? (
                                <div style={{ width: '100%', height: '100%' }}>
                                    <ResponsiveContainer>
                                        <AreaChart data={trendData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                                            <defs>
                                                <linearGradient id="trendLightObj" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="0%" stopColor="#8B5CF6" stopOpacity={0.2} />
                                                    <stop offset="100%" stopColor="#8B5CF6" stopOpacity={0} />
                                                </linearGradient>
                                            </defs>
                                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.03)" vertical={false} />
                                            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#9CA3AF', fontSize: 11 }} />
                                            <YAxis domain={[0, 32]} axisLine={false} tickLine={false} tick={{ fill: '#9CA3AF', fontSize: 11 }} />
                                            <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'rgba(0,0,0,0.05)' }} />
                                            <Area type="monotone" dataKey="score" stroke="#8B5CF6" strokeWidth={2} fillOpacity={1} fill="url(#trendLightObj)" />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                </div>
                            ) : (
                                <div className="chart-empty">No trend data available</div>
                            )}
                        </div>
                    </motion.div>

                    {/* Row 1 / Col 2 - Average Indices */}
                    <motion.div variants={itemVariants} style={{ gridColumn: '2' }}>
                        <div className="chart-card aesthetic-card" style={{ height: '320px' }}>
                            <div className="chart-title">
                                <span>Core Indices</span>
                            </div>
                            {sectionData.length > 0 && sectionData.some(s => s.score > 0) ? (
                                <div style={{ width: '100%', height: '100%' }}>
                                    <ResponsiveContainer>
                                        <BarChart data={sectionData} margin={{ top: 10, right: 0, left: -25, bottom: 0 }}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.03)" vertical={false} />
                                            <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
                                            <YAxis domain={[0, 32]} tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
                                            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(0,0,0,0.02)', radius: 8 }} />
                                            <Bar dataKey="score" radius={[6, 6, 0, 0]} barSize={20}>
                                                {sectionData.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={entry.fill} opacity={0.8} />
                                                ))}
                                            </Bar>
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            ) : (
                                <div className="chart-empty">No indices available</div>
                            )}
                        </div>
                    </motion.div>

                    {/* Row 1 & 2 / Col 3 - Analytics Summary */}
                    <motion.div variants={itemVariants} style={{ gridColumn: '3', gridRow: '1 / span 2' }}>
                        <div className="ai-assistant-card image-glass-card" style={{ height: '100%' }}>
                            <div>
                                <h3 className="chart-title"><FontAwesomeIcon icon={faRobot} /> Analytics</h3>
                                <p className="chart-subtitle">At-a-glance distribution and health signals</p>
                                
                                {bucketData.length > 0 && (
                                    <div style={{ height: 280, position: 'relative' }}>
                                        <ResponsiveContainer width="100%" height="100%">
                                            <PieChart>
                                                <Pie
                                                    data={bucketData}
                                                    cx="50%"
                                                    cy="50%"
                                                    innerRadius={70}
                                                    outerRadius={100}
                                                    paddingAngle={3}
                                                    dataKey="value"
                                                    stroke="rgba(255,255,255,0.1)"
                                                    strokeWidth={2}
                                                >
                                                    {bucketData.map((entry, index) => (
                                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                                    ))}
                                                </Pie>
                                                <Tooltip content={<CustomPieTooltip />} />
                                            </PieChart>
                                        </ResponsiveContainer>
                                        <div className="chart-center-text" style={{ color: 'white' }}>
                                            {data?.overview?.totalStudents || 0}
                                            <span style={{ color: 'rgba(255,255,255,0.7)' }}>Total</span>
                                        </div>
                                    </div>
                                )}

                                <div className="analytics-kpis">
                                    <div className="analytics-kpi">
                                        <div className="analytics-kpi-label">Avg score (latest month)</div>
                                        <div className="analytics-kpi-value">{avgScore || '—'}</div>
                                    </div>
                                    <div className="analytics-kpi">
                                        <div className="analytics-kpi-label">Trend submissions (6 mo)</div>
                                        <div className="analytics-kpi-value">{submissionsInTrendWindow}</div>
                                    </div>
                                    <div className="analytics-kpi">
                                        <div className="analytics-kpi-label">Flagged schools</div>
                                        <div className="analytics-kpi-value">{attentionData.length}</div>
                                    </div>
                                    <div className="analytics-kpi">
                                        <div className="analytics-kpi-label">Top bucket</div>
                                        <div className="analytics-kpi-value">{mostCommonBucket ? mostCommonBucket.name : '—'}</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </motion.div>

                    {/* Row 2 / Col 1 - Priority Support List */}
                    <motion.div variants={itemVariants} style={{ gridColumn: '1' }}>
                        <div className="integrations-panel image-glass-card" style={{ height: '100%', gridColumn: '1' }}>
                            <h3 className="chart-title">Intervention Required</h3>
                            <p className="chart-subtitle">Schools flagged by system analytics</p>
                            
                            {attentionData.length > 0 ? (
                                <div className="glass-list">
                                    {attentionData.slice(0, 3).map((school, i) => (
                                        <div key={school.id || i} className="glass-list-item">
                                            <div className="item-icon">
                                                <FontAwesomeIcon icon={faExclamationCircle} color="#fca5a5" />
                                            </div>
                                            <div className="item-info">
                                                <h4>{school.name}</h4>
                                                <p>{school.details}</p>
                                            </div>
                                            <div className="item-value">
                                                {school.riskScore}% Risk
                                            </div>
                                        </div>
                                    ))}
                                    <a href="/admin/schools" style={{ color: 'white', fontSize: '0.85rem', textAlign: 'center', display: 'block', marginTop: '8px', textDecoration: 'none', fontWeight: 500 }}>
                                        + View all flagged schools
                                    </a>
                                </div>
                            ) : (
                                <div className="chart-empty" style={{ color: 'white', background: 'rgba(0,0,0,0.2)', backdropFilter: 'blur(10px)', borderRadius: '16px' }}>
                                    <FontAwesomeIcon icon={faCheckCircle} size="2x" style={{ marginBottom: '12px', color: '#10B981' }} />
                                    <p>All networks stable</p>
                                </div>
                            )}
                        </div>
                    </motion.div>

                    {/* Row 2 / Col 2 - Focus Area Breakdown */}
                    <motion.div variants={itemVariants} style={{ gridColumn: '2' }}>
                        <div className="chart-card aesthetic-card" style={{ height: '100%' }}>
                            <div className="chart-title">
                                <span>Focus Areas</span>
                            </div>
                            <div className="four-chart-grid">
                                {[
                                    { key: 'A', title: 'Focus', icon: faBrain, color: '#8B5CF6' },
                                    { key: 'B', title: 'Self-Esteem', icon: faHeartPulse, color: '#6366f1' },
                                    { key: 'C', title: 'Social', icon: faSchool, color: '#06b6d4' },
                                    { key: 'D', title: 'Digital', icon: faMobileScreenButton, color: '#f43f5e' }
                                ].map((section) => {
                                    const dist = data?.analytics?.sectionDistributions?.[section.key];
                                    const chartData = [
                                        { name: 'Stable', value: dist?.['Skill Stable'] || 0, color: '#34d399' },
                                        { name: 'Emerging', value: dist?.['Skill Emerging'] || 0, color: '#fbbf24' },
                                        { name: 'Support', value: dist?.['Skill Support Needed'] || 0, color: '#f87171' }
                                    ];
                                    const total = chartData.reduce((sum, item) => sum + item.value, 0);

                                    return (
                                        <div key={section.key} className="mini-chart">
                                            <h4><FontAwesomeIcon icon={section.icon} style={{ color: section.color, marginRight: 6 }} />{section.title}</h4>
                                            <div style={{ width: '100%', height: 100 }}>
                                                <ResponsiveContainer>
                                                    <PieChart>
                                                        <Pie
                                                            data={chartData}
                                                            cx="50%"
                                                            cy="50%"
                                                            innerRadius={25}
                                                            outerRadius={38}
                                                            paddingAngle={2}
                                                            dataKey="value"
                                                            stroke="none"
                                                        >
                                                            {chartData.map((entry, index) => (
                                                                <Cell key={`cell-${index}`} fill={entry.color} opacity={0.8} />
                                                            ))}
                                                        </Pie>
                                                        <Tooltip content={<CustomPieTooltip />} />
                                                    </PieChart>
                                                </ResponsiveContainer>
                                                <div className="chart-center-text">
                                                    {total}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </motion.div>
                    
                </div>
            </motion.div>
        </Layout>
    );
};

// Minimalist Tooltips
const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
        return (
            <div className="custom-tooltip-light">
                <p className="label" style={{ margin: 0, fontSize: '0.8rem', color: '#6B7280' }}>{label}</p>
                <p className="value" style={{ margin: 0, fontSize: '1rem', color: payload[0].color || payload[0].fill, fontWeight: '700' }}>
                    {payload[0].value}
                </p>
            </div>
        );
    }
    return null;
};

const CustomPieTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
        return (
            <div className="custom-tooltip-light">
                <p className="label" style={{ margin: 0, fontSize: '0.8rem', color: '#6B7280' }}>{payload[0].name}</p>
                <p className="value" style={{ margin: 0, fontSize: '1rem', color: payload[0].payload.color || payload[0].fill, fontWeight: '700' }}>
                    {payload[0].value} Students
                </p>
            </div>
        );
    }
    return null;
};

export default AdminDashboard;
