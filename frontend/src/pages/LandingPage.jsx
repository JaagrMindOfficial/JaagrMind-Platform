import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, useInView, useReducedMotion } from 'framer-motion';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faBrain,
    faSchool,
    faChartLine,
    faShieldAlt,
    faEnvelope,
    faPhone,
    faLocationDot,
    faArrowRight,
    faBuilding,
    faUserGraduate,
    faClipboardCheck,
    faCheckCircle,
    faPaperPlane,
    faSun,
    faMoon,
    faDesktop,
    faQuoteLeft,
    faStar,
    faHeart,
    faChevronDown,
    faUserShield,
    faTimes
} from '@fortawesome/free-solid-svg-icons';
import { useTheme } from '../context/ThemeContext';
import lightThemeLogo from '../assets/DarkColorLogo.svg';
import darkThemeLogo from '../assets/LightColorLogo.svg';
import founderPhotoSaurabh from '../assets/1756450146756.jpeg';
import founderPhotoSrishty from '../assets/1741067775476.jpeg';
import Background3D from '../components/common/Background3D';
import './LandingPage.css';
import './LandingSections.css';
import { AnimatePresence } from 'framer-motion';

const FOUNDER_PHOTOS = {
    saurabh: founderPhotoSaurabh,
    srishty: founderPhotoSrishty
};

const LOGIN_OPTIONS = [
    {
        to: '/student/login',
        label: 'Student',
        hint: 'Check-ins & assessments',
        icon: faUserGraduate
    },
    {
        to: '/login?portal=school',
        label: 'School',
        hint: 'Staff & counselor portal',
        icon: faSchool
    },
    {
        to: '/login?portal=admin',
        label: 'Admin',
        hint: 'Platform administration',
        icon: faUserShield
    }
];

const LoginMenu = () => {
    const [open, setOpen] = useState(false);
    const wrapRef = useRef(null);
    const reduceMotion = useReducedMotion();

    useEffect(() => {
        const close = (e) => {
            if (wrapRef.current && !wrapRef.current.contains(e.target)) {
                setOpen(false);
            }
        };
        const onKey = (e) => {
            if (e.key === 'Escape') setOpen(false);
        };
        document.addEventListener('mousedown', close);
        document.addEventListener('keydown', onKey);
        return () => {
            document.removeEventListener('mousedown', close);
            document.removeEventListener('keydown', onKey);
        };
    }, []);

    return (
        <div className={`nav-login-wrap${open ? ' nav-login-wrap--open' : ''}`} ref={wrapRef}>
            <button
                type="button"
                className="nav-login-trigger"
                aria-expanded={open}
                aria-haspopup="true"
                onClick={() => setOpen((v) => !v)}
            >
                <span>Login</span>
                <motion.span
                    className="nav-login-chevron"
                    animate={{ rotate: open ? 180 : 0 }}
                    transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                >
                    <FontAwesomeIcon icon={faChevronDown} />
                </motion.span>
            </button>
            <AnimatePresence>
                {open && (
                    <motion.div
                        className="nav-login-dropdown"
                        role="menu"
                        initial={{ opacity: 0, y: reduceMotion ? 0 : -8, scale: reduceMotion ? 1 : 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: reduceMotion ? 0 : -6, scale: reduceMotion ? 1 : 0.98 }}
                        transition={
                            reduceMotion
                                ? { duration: 0.15 }
                                : { type: 'spring', stiffness: 420, damping: 32 }
                        }
                    >
                        {LOGIN_OPTIONS.map((item) => (
                            <Link
                                key={item.label}
                                to={item.to}
                                role="menuitem"
                                className="nav-login-option"
                                onClick={() => setOpen(false)}
                            >
                                <span className="nav-login-option-icon">
                                    <FontAwesomeIcon icon={item.icon} />
                                </span>
                                <span className="nav-login-option-text">
                                    <span className="nav-login-option-label">{item.label}</span>
                                    <span className="nav-login-option-hint">{item.hint}</span>
                                </span>
                                <FontAwesomeIcon icon={faArrowRight} className="nav-login-option-arrow" />
                            </Link>
                        ))}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

const ThemeMenu = () => {
    const { theme, setTheme } = useTheme();
    const [isHovered, setIsHovered] = useState(false);

    let currentIcon = faDesktop;
    if (theme === 'light') currentIcon = faSun;
    if (theme === 'dark') currentIcon = faMoon;

    return (
        <motion.div
            className="theme-pill-container"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            layout
        >
            <AnimatePresence mode="wait">
                {!isHovered ? (
                    <motion.button
                        key="collapsed"
                        className="theme-btn active"
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        transition={{ duration: 0.15 }}
                    >
                        <FontAwesomeIcon icon={currentIcon} />
                    </motion.button>
                ) : (
                    <motion.div
                        key="expanded"
                        className="theme-btn-group"
                        initial={{ opacity: 0, width: 0 }}
                        animate={{ opacity: 1, width: 'auto' }}
                        exit={{ opacity: 0, width: 0 }}
                        transition={{ duration: 0.2 }}
                    >
                        <button
                            className={`theme-btn ${theme === 'light' ? 'active' : ''}`}
                            onClick={() => setTheme('light')}
                            title="Light Mode"
                        >
                            <FontAwesomeIcon icon={faSun} />
                        </button>
                        <button
                            className={`theme-btn ${theme === 'system' ? 'active' : ''}`}
                            onClick={() => setTheme('system')}
                            title="System Mode"
                        >
                            <FontAwesomeIcon icon={faDesktop} />
                        </button>
                        <button
                            className={`theme-btn ${theme === 'dark' ? 'active' : ''}`}
                            onClick={() => setTheme('dark')}
                            title="Dark Mode"
                        >
                            <FontAwesomeIcon icon={faMoon} />
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
};

const GlowButton = ({ children, className, href, to, onClick }) => {
    const handleMouseMove = (e) => {
        const { currentTarget: target } = e;
        const rect = target.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        target.style.setProperty('--mouse-x', `${x}px`);
        target.style.setProperty('--mouse-y', `${y}px`);
    };

    if (to) {
        return (
            <Link to={to} className={`glow-button ${className}`} onMouseMove={handleMouseMove} onClick={onClick}>
                <div className="glow-content">{children}</div>
            </Link>
        );
    }
    if (href) {
        return (
            <a href={href} className={`glow-button ${className}`} onMouseMove={handleMouseMove} onClick={onClick}>
                <div className="glow-content">{children}</div>
            </a>
        );
    }
    return (
        <button className={`glow-button ${className}`} onMouseMove={handleMouseMove} onClick={onClick}>
            <div className="glow-content">{children}</div>
        </button>
    );
};

const GlowCard = ({ children, className, as: Component = motion.div, ...props }) => {
    const handleMouseMove = (e) => {
        const { currentTarget: target } = e;
        const rect = target.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        target.style.setProperty('--mouse-x', `${x}px`);
        target.style.setProperty('--mouse-y', `${y}px`);
    };

    return (
        <Component
            className="glow-card"
            onMouseMove={handleMouseMove}
            {...props}
        >
            <div className={`glow-card-content ${className || ''}`}>{children}</div>
        </Component>
    );
};

const subtitleWords =
    'A comprehensive SaaS platform for schools to support, monitor, and encourage student emotional well-being through engaging, gamified check-ins.'.split(
        ' '
    );

const wordRevealParent = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: { staggerChildren: 0.055, delayChildren: 0.52 }
    }
};

const wordRevealParentReduced = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { duration: 0.35 } }
};

const wordRevealChild = {
    hidden: { opacity: 0, y: 8, filter: 'blur(4px)' },
    visible: {
        opacity: 1,
        y: 0,
        filter: 'blur(0px)',
        transition: { type: 'spring', stiffness: 120, damping: 28, mass: 0.85 }
    }
};

const wordRevealReduced = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { duration: 0.25 } }
};

const AnimatedStat = ({ end, suffix, label, icon }) => {
    const [count, setCount] = useState(0);
    const ref = useRef(null);
    const isInView = useInView(ref, { once: true, amount: 0.1 });

    useEffect(() => {
        if (!isInView) return;
        let start = 0;
        const duration = 2000;
        const incr = end / (duration / 16);
        const timer = setInterval(() => {
            start += incr;
            if (start >= end) {
                setCount(end);
                clearInterval(timer);
            } else {
                setCount(Math.ceil(start));
            }
        }, 16);
        return () => clearInterval(timer);
    }, [isInView, end]);

    return (
        <GlowCard className="stat-glass-card hover-lift" initial={{ opacity: 0, scale: 0.95 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }}>
            <div className="stat-icon-blob" ref={ref}><FontAwesomeIcon icon={icon} /></div>
            <div className="stat-number">{count}{suffix}</div>
            <div className="stat-text">{label}</div>
        </GlowCard>
    );
};

const LandingPage = () => {
    const { isDark } = useTheme();
    const prefersReducedMotion = useReducedMotion();
    const [navScrolled, setNavScrolled] = useState(false);
    const logoImg = isDark ? darkThemeLogo : lightThemeLogo;

    useEffect(() => {
        const onScroll = () => setNavScrolled(window.scrollY > 24);
        onScroll();
        window.addEventListener('scroll', onScroll, { passive: true });
        return () => window.removeEventListener('scroll', onScroll);
    }, []);
    const [formData, setFormData] = useState({
        name: '',
        school: '',
        email: '',
        message: ''
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitStatus, setSubmitStatus] = useState(null);
    const [storyModalOpen, setStoryModalOpen] = useState(false);
    const [storyScrollTarget, setStoryScrollTarget] = useState(null);

    const openStory = useCallback((target) => {
        setStoryScrollTarget(target);
        setStoryModalOpen(true);
    }, []);

    const closeStory = useCallback(() => {
        setStoryModalOpen(false);
        setStoryScrollTarget(null);
    }, []);

    useEffect(() => {
        if (!storyModalOpen) return;
        const onKey = (e) => {
            if (e.key === 'Escape') closeStory();
        };
        document.addEventListener('keydown', onKey);
        return () => document.removeEventListener('keydown', onKey);
    }, [storyModalOpen, closeStory]);

    useEffect(() => {
        if (!storyModalOpen || !storyScrollTarget) return;
        const id = `story-anchor-${storyScrollTarget}`;
        const t = window.setTimeout(() => {
            document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }, 80);
        return () => window.clearTimeout(t);
    }, [storyModalOpen, storyScrollTarget]);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            await api.post('/api/tickets/public', formData);
            setSubmitStatus('success');
            setFormData({ name: '', school: '', email: '', message: '' });
            setTimeout(() => setSubmitStatus(null), 5000);
        } catch (error) {
            console.error('Error sending message:', error);
            setSubmitStatus('error');
            setTimeout(() => setSubmitStatus(null), 5000);
        } finally {
            setIsSubmitting(false);
        }
    };

    const stats = [
        { end: 10000, suffix: '+', label: 'STUDENTS ASSESSED', icon: faUserGraduate },
        { end: 50, suffix: '+', label: 'PARTNER SCHOOLS', icon: faSchool },
        { end: 98, suffix: '%', label: 'SATISFACTION RATE', icon: faHeart },
        { end: 24, suffix: '/7', label: 'SUPPORT AVAILABLE', icon: faPhone }
    ];

    const features = [
        {
            icon: faBrain,
            title: 'Expert Designed Check-ins',
            description: 'Adaptive, emotion-responsive prompts that understand student context and provide personalized support.'
        },
        {
            icon: faSchool,
            title: 'Multi-School Support',
            description: 'Centralized dashboard for district-wide management and school-specific customization.'
        },
        {
            icon: faChartLine,
            title: 'Real-Time Insights',
            description: 'Predictive analytics that identify students at risk before they reach a crisis point.'
        },
        {
            icon: faShieldAlt,
            title: 'Privacy First',
            description: 'End-to-end encryption and compliance with top-tier education data security standards.'
        }
    ];

    return (
        <div className="landing-page">
            <Background3D />

            {/* Navbar */}
            <nav className={`landing-nav${navScrolled ? ' landing-nav--scrolled' : ''}`}>
                <div className="nav-container">
                    <Link to="/" className="nav-logo">
                        <img src={logoImg} alt="JaagrMind" />
                    </Link>
                    <div className="nav-links-center">
                        <a href="#features" className="nav-pill-link">Features</a>
                        <a href="#about" className="nav-pill-link">About</a>
                        <a
                            href="/community"
                            className="nav-pill-link"
                            onClick={(e) => e.preventDefault()}
                            title="Coming soon"
                        >
                            Community
                        </a>
                        <a href="#contact" className="nav-pill-link">Contact</a>
                    </div>
                    <div className="nav-links-right">
                        <ThemeMenu />
                        <LoginMenu />
                    </div>
                </div>
            </nav>

            {/* Hero Section */}
            <section className="hero-section">
                <div className="hero-ambient" aria-hidden="true">
                    <div className="bg-glow-orb purple-orb" />
                    <div className="bg-glow-orb blue-orb" />
                    <div className="bg-glow-orb pink-orb" />
                    <div className="hero-grid-mesh" />
                    <div className="hero-noise" />
                </div>
                <motion.div
                    className="hero-content"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 1.05, ease: [0.22, 1, 0.36, 1] }}
                >
                    <motion.div
                        className="hero-pill"
                        initial={{ opacity: 0, y: 10, filter: 'blur(3px)' }}
                        animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                        transition={{ delay: 0.08, duration: 0.95, ease: [0.25, 0.1, 0.25, 1] }}
                    >
                        INTRODUCING THE FUTURE OF STUDENT WELL-BEING
                    </motion.div>
                    <motion.h1
                        className="hero-title"
                        initial={{ opacity: 0, y: 18 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.22, duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
                    >
                        Empowering Student <br />
                        <span className="gradient-text gradient-text--hero">Emotional Well-being</span>
                    </motion.h1>
                    <motion.p
                        className="hero-subtitle"
                        variants={prefersReducedMotion ? wordRevealParentReduced : wordRevealParent}
                        initial="hidden"
                        animate="visible"
                    >
                        {subtitleWords.map((word, index) => (
                            <motion.span
                                key={`${word}-${index}`}
                                className="hero-word"
                                variants={prefersReducedMotion ? wordRevealReduced : wordRevealChild}
                            >
                                {word}
                                {index < subtitleWords.length - 1 ? ' ' : ''}
                            </motion.span>
                        ))}
                    </motion.p>
                    <div className="hero-cta">
                        <GlowButton to="/login" className="btn-primary-lg zoom-hover">
                            Get Started
                        </GlowButton>
                        <GlowButton href="#contact" className="btn-outline-lg zoom-hover">
                            Contact Us
                        </GlowButton>
                    </div>
                </motion.div>

                {/* Preview Cluster: Dashboard, Mobile, and Check-in Mockups */}
                <motion.div
                    className="preview-cluster"
                    initial={{ opacity: 0, y: 36 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 1.15, delay: 0.35, ease: [0.22, 1, 0.36, 1] }}
                >
                    <motion.div
                        className="preview-cluster-float"
                        animate={prefersReducedMotion ? undefined : { y: [0, -10, 0] }}
                        transition={
                            prefersReducedMotion
                                ? undefined
                                : { duration: 7, repeat: Infinity, ease: 'easeInOut' }
                        }
                    >
                        <div className="mac-window" data-device="desktop">
                            <div className="mac-window-chrome">
                                <div className="mac-traffic" aria-hidden="true">
                                    <span className="mac-dot mac-dot--close" />
                                    <span className="mac-dot mac-dot--min" />
                                    <span className="mac-dot mac-dot--max" />
                                </div>
                                <span className="mac-window-title">JaagrMind — School analytics</span>
                                <div className="mac-window-chrome-spacer" />
                            </div>
                            <div className="mac-window-body">
                                <div className="mockup-container">
                                    <div className="mockup-grid">
                                        {/* Top Cards */}
                                        <div className="m-top-cards">
                                            <div className="m-card">
                                                <div className="m-icon-bg"><FontAwesomeIcon icon={faBuilding} /></div>
                                                <div className="m-card-content">
                                                    <strong>6</strong>
                                                    <span>Total Schools</span>
                                                </div>
                                            </div>
                                            <div className="m-card">
                                                <div className="m-icon-bg"><FontAwesomeIcon icon={faUserGraduate} /></div>
                                                <div className="m-card-content">
                                                    <strong>47</strong>
                                                    <span>Total Students</span>
                                                </div>
                                            </div>
                                            <div className="m-card">
                                                <div className="m-icon-bg"><FontAwesomeIcon icon={faClipboardCheck} /></div>
                                                <div className="m-card-content">
                                                    <strong>1</strong>
                                                    <span>Check-ins</span>
                                                </div>
                                            </div>
                                            <div className="m-card">
                                                <div className="m-icon-bg"><FontAwesomeIcon icon={faCheckCircle} /></div>
                                                <div className="m-card-content">
                                                    <strong>4</strong>
                                                    <span>Submissions</span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Middle Charts */}
                                        <div className="m-middle-cards">
                                            <div className="m-panel">
                                                <h4>Focus Area Breakdown</h4>
                                                <div className="m-donuts">
                                                    <div className="m-donut-col">
                                                        <div className="m-donut-label">Focus & Attention</div>
                                                        <div className="m-donut orange"><span>3<br /><small>Students</small></span></div>
                                                        <div className="m-donut-label mt">Social Confidence</div>
                                                        <div className="m-donut green"><span>3<br /><small>Students</small></span></div>
                                                    </div>
                                                    <div className="m-donut-col">
                                                        <div className="m-donut-label">Self-Esteem</div>
                                                        <div className="m-donut orange"><span>3<br /><small>Students</small></span></div>
                                                        <div className="m-donut-label mt">Digital Hygiene</div>
                                                        <div className="m-donut red-green"><span>3<br /><small>Students</small></span></div>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="m-panel">
                                                <h4>Average Focus Area Indices</h4>
                                                <div className="m-bars">
                                                    <div className="m-y-axis"><span>32</span><span>24</span><span>16</span><span>8</span><span>0</span></div>
                                                    <div className="m-bar-col"><div className="m-bar h-50"></div><span>Focus & Attention</span></div>
                                                    <div className="m-bar-col"><div className="m-bar h-45"></div><span>Self-Esteem</span></div>
                                                    <div className="m-bar-col"><div className="m-bar h-40"></div><span>Social Confidence</span></div>
                                                    <div className="m-bar-col"><div className="m-bar h-45"></div><span>Digital Hygiene</span></div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Bottom Charts */}
                                        <div className="m-bottom-cards">
                                            <div className="m-panel wide-panel">
                                                <h4>Well-being Trends (Last 6 Months)</h4>
                                                <div className="m-area-chart">
                                                    <div className="m-y-axis"><span>60</span><span>45</span><span>30</span><span>15</span><span>0</span></div>
                                                    <div className="m-area-path"></div>
                                                    <div className="m-x-axis"><span>Oct</span><span>Nov</span><span>Dec</span><span>Jan</span><span>Mar</span><span>Mar</span></div>
                                                </div>
                                            </div>
                                            <div className="m-panel right-panel">
                                                <h4>Student Well-being Distribution</h4>
                                                <div className="m-large-donut">
                                                    <div className="m-big-donut-shape"></div>
                                                </div>
                                                <div className="m-legend">
                                                    <span><i className="l-orange"></i> Skill Emerging (75%)</span>
                                                    <span><i className="l-red"></i> Unknown (25%)</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </motion.div>

                {/* Stats Row */}
                <div className="stats-glass-section">
                    <div className="container">
                        <div className="stats-glass-grid">
                            {stats.map((stat, index) => (
                                <AnimatedStat key={index} end={stat.end} suffix={stat.suffix} label={stat.label} icon={stat.icon} />
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            {/* Problem / Solution Section */}
            <section className="problem-solution-section">
                <div className="container">
                    <div className="ps-grid">
                        <motion.div className="ps-card ps-problem hover-lift" initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
                            <span className="ps-badge error">THE OLD WAY</span>
                            <h3>Reactive, delayed, and isolated</h3>
                            <ul className="ps-list">
                                <li><strong>Wait for a crisis:</strong> Support only kicks in after a breakdown.</li>
                                <li><strong>Blindspots:</strong> Counselors rely on rare 1-on-1 check-ins.</li>
                                <li><strong>Fragmented tools:</strong> Isolated data with no predictive insights.</li>
                                <li><strong>No Post-analysis:</strong> No way to handle Students Emotional Balance </li>
                            </ul>
                        </motion.div>
                        <motion.div className="ps-card ps-solution hover-lift" initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.1, duration: 0.6 }}>
                            <span className="ps-badge success">THE JAAGRMIND WAY</span>
                            <h3>Proactive, unified, and holistic</h3>
                            <ul className="ps-list">
                                <li><strong>Early detection:</strong> Counsellors and Experts identifies risk before it escalates.</li>
                                <li><strong>Continuous monitoring:</strong> Gamified daily check-ins for true visibility.</li>
                                <li><strong>Centralized ecosystem:</strong> One dashboard for counselors, admins, and students.</li>
                                <li><strong>Post-analysis:</strong>Handle Students Emotional Balance with Gamified and Proven Mind Relaxing activities</li>
                            </ul>
                        </motion.div>
                    </div>
                </div>
            </section>

            {/* Accessibility Section */}
            <section className="accessibility-section">
                <div className="container">
                    <div className="access-grid">
                        <motion.div
                            className="access-content"
                            initial={{ opacity: 0, x: -40 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.8 }}
                        >
                            <div className="hero-pill">CROSS-PLATFORM EXPERIENCE</div>
                            <h2>Seamless Mobile <br /> <span className="gradient-text">Accessibility</span></h2>
                            <p>
                                Stay connected to your emotional well-being wherever you are. Our intuitive mobile interface mirrors the full functionality of the web platform, bringing emotional support to your fingertips.
                            </p>
                            <ul className="access-features">
                                <li><FontAwesomeIcon icon={faCheckCircle} /> Daily interactive check-ins & reflection</li>
                                <li><FontAwesomeIcon icon={faCheckCircle} /> Engaging wellness quizzes</li>
                                <li><FontAwesomeIcon icon={faCheckCircle} /> Real-time activity tracking & insights</li>
                            </ul>
                            <div className="hero-cta" style={{ justifyContent: 'flex-start', marginTop: '30px' }}>
                                <GlowButton to="/login" className="btn-primary-lg">
                                    Learn More
                                </GlowButton>
                            </div>
                        </motion.div>

                        <motion.div
                            className="access-visuals"
                            initial={{ opacity: 0, x: 40 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.8 }}
                        >
                            {/* Mobile App Mockup */}
                            <div className="mobile-mockup-solid">
                                <div className="phone-notch"></div>
                                <div className="phone-content">
                                    <img src={logoImg} className="phone-logo" alt="JaagrMind" />
                                    <h3>Welcome Back</h3>
                                    <div className="m-app-card">
                                        <span>Daily Check-in</span>
                                        <strong>Pending</strong>
                                    </div>
                                    <div className="m-app-card">
                                        <span>Recent Activities</span>
                                        <div className="m-app-line"></div>
                                        <div className="m-app-line w-75"></div>
                                    </div>
                                    <div className="phone-nav">
                                        <span></span><span></span><span></span>
                                    </div>
                                </div>
                            </div>

                            {/* Check-in Quiz Mockup */}
                            <div className="checkin-mockup-solid">
                                <h3>I feel mentally tired before I begin my work</h3>
                                <p className="quiz-section-label">Section:</p>
                                <div className="quiz-options">
                                    <div className="quiz-opt active"><div className="opt-num">1</div>Not true for me</div>
                                    <div className="quiz-opt"><div className="opt-num">2</div>Sometimes true</div>
                                    <div className="quiz-opt"><div className="opt-num">3</div>Often true</div>
                                    <div className="quiz-opt"><div className="opt-num">4</div>Almost always true</div>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                </div>
            </section>

            {/* Why Choose Section */}
            <section id="features" className="features-new-section">
                <div className="container">
                    <motion.div
                        className="features-header"
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                    >
                        <h2>Why Choose JaagrMind?</h2>
                        <div className="header-underline"></div>
                    </motion.div>

                    <div className="features-new-grid">
                        {features.map((feature, i) => (
                            <GlowCard
                                key={i}
                                className="feature-card-new"
                                initial={{ opacity: 0, y: 30 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true, margin: '-40px' }}
                                transition={{ delay: i * 0.08, type: 'spring', stiffness: 120, damping: 22 }}
                                whileHover={{ y: -6, transition: { type: 'spring', stiffness: 400, damping: 28 } }}
                            >
                                <div className="feature-icon-wrapper">
                                    <FontAwesomeIcon icon={feature.icon} />
                                </div>
                                <h3>{feature.title}</h3>
                                <p>{feature.description}</p>
                            </GlowCard>
                        ))}
                    </div>
                </div>
            </section>

            {/* How It Works (Timeline) */}
            <section className="timeline-section">
                <div className="container">
                    <motion.div
                        className="timeline-section-header"
                        initial={{ opacity: 0, y: 30 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true, margin: "-50px" }}
                        transition={{ duration: 0.7, ease: "easeOut" }}
                    >
                        <h2>How JaagrMind Works</h2>
                        <p>A seamless ecosystem designed for proactive emotional support.</p>
                    </motion.div>

                    <div className="timeline-wrapper">
                        <motion.div
                            className="timeline-step"
                            initial={{ opacity: 0, y: 50, scale: 0.95 }}
                            whileInView={{ opacity: 1, y: 0, scale: 1 }}
                            viewport={{ once: false, margin: "-100px" }}
                            transition={{ type: "spring", stiffness: 100, damping: 20 }}
                        >
                            <div className="t-icon"><FontAwesomeIcon icon={faDesktop} /></div>
                            <div className="t-content">
                                <span className="t-num">01</span>
                                <h3>Gamified Check-ins</h3>
                                <p>Students engage with quick, interactive wellness checks to log their emotional state and earn cosmic tokens.</p>
                            </div>
                        </motion.div>

                        <motion.div
                            className="timeline-step"
                            initial={{ opacity: 0, y: 50, scale: 0.95 }}
                            whileInView={{ opacity: 1, y: 0, scale: 1 }}
                            viewport={{ once: false, margin: "-100px" }}
                            transition={{ type: "spring", stiffness: 100, damping: 20, delay: 0.1 }}
                        >
                            <div className="t-icon"><FontAwesomeIcon icon={faBrain} /></div>
                            <div className="t-content">
                                <span className="t-num">02</span>
                                <h3>AI-assisted Pattern Analysis</h3>
                                <p>Our expert Counsellors And proprietary model securely analyzes language and behavioral patterns to predict underlying well-being flags.</p>
                            </div>
                        </motion.div>

                        <motion.div
                            className="timeline-step"
                            initial={{ opacity: 0, y: 50, scale: 0.95 }}
                            whileInView={{ opacity: 1, y: 0, scale: 1 }}
                            viewport={{ once: false, margin: "-100px" }}
                            transition={{ type: "spring", stiffness: 100, damping: 20, delay: 0.2 }}
                        >
                            <div className="t-icon"><FontAwesomeIcon icon={faShieldAlt} /></div>
                            <div className="t-content">
                                <span className="t-num">03</span>
                                <h3>Proactive Alerting</h3>
                                <p>School counselors receive real-time, categorized alerts on an intuitive dashboard to intervene exactly when needed.</p>
                            </div>
                        </motion.div>
                    </div>
                </div>
            </section>

            {/* Healthier Future Section */}
            <section id="about" className="mission-section">
                <div className="container">
                    <div className="mission-grid">
                        <motion.div
                            className="mission-visual"
                            initial={{ opacity: 0, scale: 0.9 }}
                            whileInView={{ opacity: 1, scale: 1 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.8 }}
                        >
                            <div className="magic-circle">
                                <div className="sparkles">
                                    <svg viewBox="0 0 24 24" className="sparkle s1"><path d="M12 2l2.4 7.6L22 12l-7.6 2.4L12 22l-2.4-7.6L2 12l7.6-2.4z" fill="currentColor" /></svg>
                                    <svg viewBox="0 0 24 24" className="sparkle s2"><path d="M12 2l2.4 7.6L22 12l-7.6 2.4L12 22l-2.4-7.6L2 12l7.6-2.4z" fill="currentColor" /></svg>
                                    <svg viewBox="0 0 24 24" className="sparkle s3"><path d="M12 2l2.4 7.6L22 12l-7.6 2.4L12 22l-2.4-7.6L2 12l7.6-2.4z" fill="currentColor" /></svg>
                                </div>
                            </div>
                        </motion.div>
                        <motion.div
                            className="mission-content"
                            initial={{ opacity: 0, x: 40 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.8 }}
                        >
                            <h2>Building a <em>Healthier</em><br /><em>Future</em></h2>
                            <p className="mission-text-main">
                                At JaagrMind, we believe every student deserves access to emotional well-being support that is as intuitive as the apps they use every day.
                            </p>
                            <p className="mission-text-secondary">
                                Our mission is to bridge the gap between academic pressure and emotional health, creating a sustainable environment where vulnerability is seen as strength, and help is always just a heartbeat away.
                            </p>
                            <div className="founder-lines">
                                <div className="founder-line">
                                    <div className="founder-line__identity">
                                        <div className="founder-avatar">
                                            <img src={FOUNDER_PHOTOS.saurabh} alt="" />
                                        </div>
                                        <div className="founder-info">
                                            <h4>Saurabh Saxena</h4>
                                            <span>Co-founder</span>
                                        </div>
                                    </div>
                                    <div className="founder-line__rail">
                                        <button
                                            type="button"
                                            className="story-link story-link--rail"
                                            onClick={() => openStory('saurabh')}
                                        >
                                            Read our story <FontAwesomeIcon icon={faArrowRight} />
                                        </button>
                                    </div>
                                </div>
                                <div className="founder-line">
                                    <div className="founder-line__identity">
                                        <div className="founder-avatar">
                                            <img src={FOUNDER_PHOTOS.srishty} alt="" />
                                        </div>
                                        <div className="founder-info">
                                            <h4>Dr.Srishty Puri Gajbhiye</h4>
                                            <span>Co-founder</span>
                                        </div>
                                    </div>
                                    <div className="founder-line__rail">
                                        <button
                                            type="button"
                                            className="story-link story-link--rail"
                                            onClick={() => openStory('srishty')}
                                        >
                                            Read our story <FontAwesomeIcon icon={faArrowRight} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                </div>
            </section>

            {/* Testimonials */}
            <section className="testimonials-section">
                <div className="container">
                    <motion.div className="section-header" initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
                        <h2>Trusted by Innovative Educators</h2>
                        <p>Hear from schools that have transformed their well-being approach.</p>
                    </motion.div>
                    <div className="test-grid">
                        <GlowCard className="test-card" initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
                            <div className="quote-icon"><FontAwesomeIcon icon={faQuoteLeft} /></div>
                            <p className="test-quote">"JaagrMind completely shifted our school culture. We now detect emotional struggles weeks before they become crises."</p>
                            <div className="test-author">
                                <div className="stars"><FontAwesomeIcon icon={faStar} /><FontAwesomeIcon icon={faStar} /><FontAwesomeIcon icon={faStar} /><FontAwesomeIcon icon={faStar} /><FontAwesomeIcon icon={faStar} /></div>
                                <strong> Preeti Kumbhaj</strong>
                                <span>Principal, Oakwood Academy</span>
                            </div>
                        </GlowCard>
                        <GlowCard className="test-card" initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.1 }}>
                            <div className="quote-icon"><FontAwesomeIcon icon={faQuoteLeft} /></div>
                            <p className="test-quote">"The predictive AI is incredible. My counselors feel supported and our students actually enjoy doing their daily check-ins."</p>
                            <div className="test-author">
                                <div className="stars"><FontAwesomeIcon icon={faStar} /><FontAwesomeIcon icon={faStar} /><FontAwesomeIcon icon={faStar} /><FontAwesomeIcon icon={faStar} /><FontAwesomeIcon icon={faStar} /></div>
                                <strong>Jatin Chulet</strong>
                                <span>Director of Student Well-being</span>
                            </div>
                        </GlowCard>
                        <GlowCard className="test-card" initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.2 }}>
                            <div className="quote-icon"><FontAwesomeIcon icon={faQuoteLeft} /></div>
                            <p className="test-quote">"An essential tool for modern education. It bridges the gap between academics and emotional intelligence beautifully."</p>
                            <div className="test-author">
                                <div className="stars"><FontAwesomeIcon icon={faStar} /><FontAwesomeIcon icon={faStar} /><FontAwesomeIcon icon={faStar} /><FontAwesomeIcon icon={faStar} /><FontAwesomeIcon icon={faStar} /></div>
                                <strong>Nitish Kumar</strong>
                                <span>School Counselor</span>
                            </div>
                        </GlowCard>
                    </div>
                </div>
            </section>

            {/* Let's Connect Section */}
            <section id="contact" className="connect-section">
                <div className="container">
                    <div className="connect-grid">
                        <motion.div
                            className="connect-info"
                            initial={{ opacity: 0, x: -30 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            viewport={{ once: true }}
                        >
                            <h2>Let's connect</h2>
                            <p className="connect-desc">
                                Our team is ready to help you transform your school's emotional support ecosystem.
                            </p>
                            <div className="contact-details">
                                <div className="c-item">
                                    <div className="c-icon"><FontAwesomeIcon icon={faPhone} /></div>
                                    <div>
                                        <span>PHONE</span>
                                        <p>+91 78200 01282</p>
                                    </div>
                                </div>
                                <div className="c-item">
                                    <div className="c-icon"><FontAwesomeIcon icon={faEnvelope} /></div>
                                    <div>
                                        <span>EMAIL</span>
                                        <p>support@jaagrmind.com</p>
                                    </div>
                                </div>
                                <div className="c-item">
                                    <div className="c-icon"><FontAwesomeIcon icon={faLocationDot} /></div>
                                    <div>
                                        <span>LOCATION</span>
                                        <p>Bengaluru, India</p>
                                    </div>
                                </div>
                            </div>
                        </motion.div>

                        <GlowCard
                            as={motion.form}
                            className="connect-form"
                            initial={{ opacity: 0, x: 30 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            viewport={{ once: true }}
                            onSubmit={handleSubmit}
                        >
                            {submitStatus === 'success' && (
                                <div className="form-alert success">Message sent successfully!</div>
                            )}
                            {submitStatus === 'error' && (
                                <div className="form-alert error">Failed to send message. Please try again.</div>
                            )}
                            <div className="form-row">
                                <div className="form-group-new">
                                    <label>FULL NAME</label>
                                    <input type="text" name="name" value={formData.name} onChange={handleChange} placeholder="Divyanshu pandey" required />
                                </div>
                                <div className="form-group-new">
                                    <label>SCHOOL NAME</label>
                                    <input type="text" name="school" value={formData.school} onChange={handleChange} placeholder="Scaler School" required />
                                </div>
                            </div>
                            <div className="form-group-new">
                                <label>EMAIL ADDRESS</label>
                                <input type="email" name="email" value={formData.email} onChange={handleChange} placeholder="divpandey@edu.in" required />
                            </div>
                            <div className="form-group-new">
                                <label>YOUR MESSAGE</label>
                                <textarea name="message" value={formData.message} onChange={handleChange} placeholder="How can we help your students?" rows="4" required></textarea>
                            </div>
                            <button type="submit" className="btn btn-primary-fw" disabled={isSubmitting}>
                                {isSubmitting ? 'Sending...' : 'Send Inquiry'}
                            </button>
                        </GlowCard>
                    </div>
                </div>
            </section>

            {/* Final CTA */}
            <section className="final-cta-section">
                <div className="container">
                    <motion.div className="final-cta-box" initial={{ opacity: 0, scale: 0.95 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }}>
                        <div className="cta-radial-glow"></div>
                        <h2>Ready to transform student well-being?</h2>
                        <p>Join 50+ innovative schools already using JaagrMind to build emotional resilience.</p>
                        <div className="hero-cta" style={{ justifyContent: 'center' }}>
                            <GlowButton to="/login" className="btn-primary-lg zoom-hover">Start the Journey</GlowButton>
                        </div>
                    </motion.div>
                </div>
            </section>

            {/* Footer */}
            <footer className="footer-new">
                <div className="container">
                    <div className="footer-grid">
                        <div className="f-brand">
                            <img src={logoImg} alt="JaagrMind" />
                            <p>Empowering student well-being through proactive AI monitoring and cosmic mindfulness.</p>
                            <div className="f-social">
                                <a
                                    href="https://www.instagram.com/jaagrmind"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    aria-label="JaagrMind on Instagram"
                                >
                                    <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                                        <path d="M7.75 2C4.678 2 2 4.678 2 7.75v8.5C2 19.322 4.678 22 7.75 22h8.5C19.322 22 22 19.322 22 16.25v-8.5C22 4.678 19.322 2 16.25 2h-8.5zm0 2h8.5C18.216 4 20 5.784 20 7.75v8.5C20 18.216 18.216 20 16.25 20h-8.5C5.784 20 4 18.216 4 16.25v-8.5C4 5.784 5.784 4 7.75 4zm4.25 2.5A5.75 5.75 0 1 0 17.75 12 5.757 5.757 0 0 0 12 6.5zm0 2A3.75 3.75 0 1 1 8.25 12 3.754 3.754 0 0 1 12 8.5zm5.5-2.75a1.25 1.25 0 1 0 1.25 1.25 1.252 1.252 0 0 0-1.25-1.25z" />
                                    </svg>
                                </a>
                                <a
                                    href="https://www.linkedin.com/company/jaagr-mind"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    aria-label="JaagrMind on LinkedIn"
                                >
                                    <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                                        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                                    </svg>
                                </a>
                                <a
                                    href="https://twitter.com/JaagrMind"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    aria-label="JaagrMind on X (Twitter)"
                                >
                                    <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                                        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                                    </svg>
                                </a>
                            </div>
                        </div>
                        <div className="f-links">
                            <h4>Quick Links</h4>
                            <a href="#features">Features</a>
                            <a href="#about">About</a>
                            <a href="#contact">Contact</a>
                        </div>
                        <div className="f-links">
                            <h4>Portals</h4>
                            <Link to="/student/login">Student Portal</Link>
                            <Link to="/login">Admin Portal</Link>
                            <Link to="/">Legal Terms</Link>
                        </div>
                        <div className="f-newsletter">
                            <h4>Newsletter</h4>
                            <p>Stay updated with our latest mindfulness techniques.</p>
                            <div className="f-sub-form">
                                <input type="email" placeholder="Email" />
                                <button type="button"><FontAwesomeIcon icon={faPaperPlane} /></button>
                            </div>
                        </div>
                    </div>
                    <div className="f-bottom">
                        <p>&copy; {new Date().getFullYear()} JaagrMind. The Change Maker.</p>
                    </div>
                </div>
            </footer>

            <AnimatePresence>
                {storyModalOpen && (
                    <motion.div
                        className="story-modal-overlay"
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="story-modal-title"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        onClick={closeStory}
                    >
                        <motion.div
                            className="story-modal"
                            initial={{ opacity: 0, y: 22, scale: 0.98 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 14, scale: 0.995 }}
                            transition={{ type: 'spring', stiffness: 380, damping: 34 }}
                            onClick={(e) => e.stopPropagation()}
                        >
                            <button
                                type="button"
                                className="story-modal-close"
                                onClick={closeStory}
                                aria-label="Close"
                            >
                                <FontAwesomeIcon icon={faTimes} />
                            </button>
                            <div className="story-modal-inner">
                                <h3 id="story-modal-title" className="story-modal-page-title">
                                    Our story
                                </h3>
                                <div
                                    id="story-anchor-saurabh"
                                    className="story-modal-founder-row"
                                >
                                    <div className="story-modal-founder-note">
                                        <p className="story-modal-kicker">Co-founder&apos;s note</p>
                                        <h4 className="story-modal-founder-heading">Why I started JaagrMind</h4>
                                        <div className="story-modal-body">
                                            <p>
                                                I grew up seeing how easily stress hides behind attendance sheets and report
                                                cards. JaagrMind started from a stubborn idea: every student should get help
                                                that feels human and immediate—not buried in paperwork or stigma.
                                            </p>
                                            <p>
                                                I wanted to build something counselors could trust and students would actually
                                                use—quiet, intelligent, and there before a hard moment turns into a crisis.
                                            </p>
                                            <p className="story-modal-signoff">— Saurabh Saxena</p>
                                        </div>
                                    </div>
                                    <div className="story-modal-founder-visual">
                                        <div className="story-modal-avatar-wrap">
                                            <img src={FOUNDER_PHOTOS.saurabh} alt="Saurabh Saxena" />
                                        </div>
                                    </div>
                                </div>
                                <div className="story-modal-divider" role="presentation" />
                                <div
                                    id="story-anchor-srishty"
                                    className="story-modal-founder-row"
                                >
                                    <div className="story-modal-founder-note">
                                        <p className="story-modal-kicker">Co-founder&apos;s note</p>
                                        <h4 className="story-modal-founder-heading">The change we want to see</h4>
                                        <div className="story-modal-body">
                                            <p>
                                                For me, well-being is not an add-on—it belongs at the center of how schools
                                                care for young people. I joined this journey to make emotional safety as
                                                measurable and actionable as academics, without losing empathy in the data.
                                            </p>
                                            <p>
                                                Together with Saurabh, I&apos;m focused on design, culture, and making sure
                                                every voice in a classroom feels seen—especially the quiet ones.
                                            </p>
                                            <p className="story-modal-signoff">— Dr.Srishty Puri Gajbhiye</p>
                                        </div>
                                    </div>
                                    <div className="story-modal-founder-visual">
                                        <div className="story-modal-avatar-wrap">
                                            <img src={FOUNDER_PHOTOS.srishty} alt="Srishty Puri Gajbhiye" />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default LandingPage;
