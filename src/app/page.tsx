"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Header from "@/components/common/HeadFoot/header";
import { getCategories, type CategoryData } from "@/lib/profile";

const CAT_CACHE_KEY = "oc_categories_cache";

const FEATURES = [
  { icon: "📡", bg: "#d4ead9", title: "Live Streaming", desc: "HD live classes directly from any device — no special software needed. Teachers go live in minutes." },
  { icon: "🎙️", bg: "#ddeaf8", title: "Webinar Format", desc: "Host structured webinars with slides, presentations, and interactive polls — ideal for larger audiences." },
  { icon: "💬", bg: "#fdf3e0", title: "Live Chat & Q&A", desc: "Students comment and ask questions in real-time during every session. Teachers respond live — true classroom energy, online." },
  { icon: "⭐", bg: "#f8ede5", title: "Session Ratings", desc: "After every class, students rate the session and leave comments. Teachers build reputation through genuine feedback." },
  { icon: "🔔", bg: "#f0ebff", title: "Subscribe to Teachers", desc: "Follow any teacher and get notified the moment they schedule or go live. Build your own learning feed." },
  { icon: "🤝", bg: "#e1f5f0", title: "Teacher Profiles", desc: "Every teacher has a rich profile — bio, subjects, ratings, past sessions, and upcoming schedule. Know who you're learning from." },
  { icon: "✍️", bg: "#d4ead9", title: "Direct Messaging", desc: "Students can message teachers directly — ask doubts, seek guidance, or continue a conversation after class." },
  { icon: "📼", bg: "#ddeaf8", title: "Auto Replay Archive", desc: "Every session is automatically saved and publicly accessible. Learn anytime, not just when live." },
  { icon: "🌐", bg: "#fdf3e0", title: "Multi-language Support", desc: "Classes in Hindi, Tamil, Bengali, Telugu, Kannada, English and more. Learning in your mother tongue." },
];

const TESTIMONIALS = [
  { quote: "I live in a small town in Bihar with no coaching center nearby. OpenClass gave me access to the same teachers my peers in Delhi have. I cleared my Class 12 boards with distinction.", name: "Arjun Kumar", role: "Student, Sitamarhi, Bihar", initials: "AK", bg: "#1d6b3c" },
  { quote: "I retired from teaching after 30 years and worried my knowledge would just fade away. Now I teach 3,000 students every week from my home. OpenClass gave me purpose again.", name: "Prof. Sudha Rao", role: "Retired Educator, Mysuru", initials: "SR", bg: "#1a4f7a" },
  { quote: "My daughter has autism and traditional classrooms are difficult for her. With OpenClass, she learns at her own pace with replays. For the first time she loves studying.", name: "Pallavi Mathur", role: "Parent, Pune, Maharashtra", initials: "PM", bg: "#c45b2a" },
];

type ChatMsg = { av: string; bg: string; avColor?: string; name: string; text: string; pinned?: boolean };
type DmMsg  = { text: string; isMe: boolean; time: string };
type ExpTab = "chat" | "rate" | "profile" | "message";

const INIT_CHAT: ChatMsg[] = [
  { av: "AK", bg: "#1d6b3c", name: "Arjun K.", text: "Can you explain eigenvectors once more? 🙏" },
  { av: "SR", bg: "#1a4f7a", name: "Shruti R.", text: "This is so clear!! Thank you Prof. Rao 🙌" },
  { av: "PJ", bg: "#c45b2a", name: "Priya J.", text: "What's the difference between eigenvalue and eigenvector?" },
  { av: "NM", bg: "#8b5cf6", name: "Nikhil M.", text: "For CBSE students — is this in Class 12?", pinned: true },
  { av: "DL", bg: "#e8a020", avColor: "#402810", name: "Divya L.", text: "👏👏👏 best class this week" },
];

const INIT_DM: DmMsg[] = [
  { text: "Hi! Great question in today's class about eigenvectors 🎉", isMe: false, time: "2:14 PM" },
  { text: "Thank you ma'am! I had a follow-up — can eigenvalues be negative?", isMe: true, time: "2:16 PM" },
  { text: "Absolutely yes! A negative eigenvalue means the transformation flips the direction. I'll cover this in Thursday's session 📚", isMe: false, time: "2:19 PM" },
];

const RATE_LABELS = ["", "1 — Poor", "2 — Fair", "3 — Good", "4 out of 5 — Great!", "5 — Excellent!"];

export default function HomePage() {
  const [categories,    setCategories]    = useState<CategoryData[]>([]);
  const [activeSubject, setActiveSubject] = useState("");
  const [activeTab,     setActiveTab]     = useState<ExpTab>("chat");
  const [chatMessages,  setChatMessages]  = useState<ChatMsg[]>(INIT_CHAT);
  const [chatInput,     setChatInput]     = useState("");
  const [ratingHover,   setRatingHover]   = useState(0);
  const [currentRating, setCurrentRating] = useState(4);
  const [isSubscribed,  setIsSubscribed]  = useState(false);
  const [dmMessages,    setDmMessages]    = useState<DmMsg[]>(INIT_DM);
  const [dmInput,       setDmInput]       = useState("");
  const chatRef = useRef<HTMLDivElement>(null);
  const dmRef   = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const style = document.createElement("style");
    style.textContent = `
      @keyframes pulse  { 0%,100%{opacity:1} 50%{opacity:0.3} }
      @keyframes fadeUp { to { opacity:1; transform:translateY(0); } }
      .fade-up { opacity:0; transform:translateY(24px); animation:fadeUp 0.7s ease forwards; }
      .d1{animation-delay:0.1s} .d2{animation-delay:0.2s} .d3{animation-delay:0.3s} .d4{animation-delay:0.4s} .d5{animation-delay:0.5s}
      .eyebrow-dot::before { content:'●'; font-size:0.5rem; animation:pulse 2s infinite; }
      .anim-item { opacity:0; transform:translateY(20px); transition:opacity 0.5s ease,transform 0.5s ease; }
      .anim-item.visible { opacity:1; transform:translateY(0); }
      .feature-card-hover:hover  { border-color:#4a9e68 !important; transform:translateY(-3px); }
      .btn-primary-hover:hover   { background:#145c30 !important; transform:translateY(-1px); }
      .btn-secondary-hover:hover { border-color:#1d6b3c !important; color:#1d6b3c !important; }
      .footer-link-hover:hover   { color:#7ed9a4 !important; }
      .exp-tab-hover:hover { border-color:#1d6b3c !important; color:#1d6b3c !important; }
      .sub-btn-hover:hover { background:#145c30 !important; }
      .mock-send-hover:hover { background:#145c30 !important; }
      .rate-submit-hover:hover { background:#145c30 !important; }
      .ps-join-hover:hover { background:#b3d9c2 !important; }

      @media (max-width: 768px) {
        .grid-2col { grid-template-columns: 1fr !important; gap: 1.5rem !important; }
        .grid-3col { grid-template-columns: 1fr !important; gap: 1.25rem !important; }
        .footer-grid { grid-template-columns: 1fr 1fr !important; gap: 1.5rem !important; }
        .footer-bottom { flex-direction: column !important; gap: 0.75rem !important; align-items: flex-start !important; }
        .price-divider { display: none !important; }
        .section-pad { padding: 4rem 1.25rem !important; }
        .hero-section { padding: 7rem 1.25rem 4rem !important; }
      }
      @media (max-width: 480px) {
        .footer-grid { grid-template-columns: 1fr !important; }
        .dual-cta-card { padding: 2rem 1.5rem !important; }
        .grid-3col { grid-template-columns: 1fr !important; }
      }
    `;
    document.head.appendChild(style);

    try {
      const cached = localStorage.getItem(CAT_CACHE_KEY);
      if (cached) {
        const cats: CategoryData[] = JSON.parse(cached);
        setCategories(cats);
        setActiveSubject(cats[0]?.name || "");
      } else {
        getCategories().then(cats => {
          try { localStorage.setItem(CAT_CACHE_KEY, JSON.stringify(cats)); } catch { /* storage full */ }
          setCategories(cats);
          setActiveSubject(cats[0]?.name || "");
        }).catch(() => { /* no categories available */ });
      }
    } catch { /* ignore parse errors */ }

    const observer = new IntersectionObserver(entries => {
      entries.forEach(e => { if (e.isIntersecting) e.target.classList.add("visible"); });
    }, { threshold: 0.1 });
    document.querySelectorAll(".anim-item").forEach(el => observer.observe(el));

    return () => { observer.disconnect(); document.head.removeChild(style); };
  }, []);

  function sendChat() {
    const val = chatInput.trim();
    if (!val) return;
    setChatMessages(prev => [...prev, { av: "You", bg: "#1d6b3c", name: "You", text: val }]);
    setChatInput("");
    setTimeout(() => { if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight; }, 50);
  }

  function sendDM() {
    const val = dmInput.trim();
    if (!val) return;
    const now = new Date();
    setDmMessages(prev => [...prev, { text: val, isMe: true, time: `${now.getHours()}:${String(now.getMinutes()).padStart(2, "0")}` }]);
    setDmInput("");
    setTimeout(() => { if (dmRef.current) dmRef.current.scrollTop = dmRef.current.scrollHeight; }, 50);
  }

  const displayRating = ratingHover || currentRating;

  /* ─── shared style helpers ───────────────────────────────────── */
  const sectionTag: React.CSSProperties = { fontSize: "0.8rem", fontWeight: 500, letterSpacing: "0.07em", textTransform: "uppercase", color: "#1d6b3c", marginBottom: "1rem" };
  const sectionTitle: React.CSSProperties = { fontFamily: "'Fraunces', Georgia, serif", fontSize: "clamp(1.75rem,3.5vw,2.8rem)", fontWeight: 700, letterSpacing: "-0.02em", lineHeight: 1.2, marginBottom: "1rem" };
  const sectionSub: React.CSSProperties = { color: "#3a4140", maxWidth: 520, fontSize: "1rem", marginBottom: "3rem" };

  return (
    <div style={{ fontFamily: "'DM Sans', sans-serif", background: "#faf7f2", color: "#0f1410", overflowX: "hidden" }}>
      <link href="https://fonts.googleapis.com/css2?family=Fraunces:ital,wght@0,300;0,400;0,700;1,300;1,400&family=DM+Sans:wght@300;400;500&display=swap" rel="stylesheet" />
      <Header />

      {/* ── HERO ─────────────────────────────────────────────────── */}
      <section className="hero-section" style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "9rem 2rem 5rem", position: "relative", overflow: "hidden", textAlign: "center" }}>
        <div style={{ position: "absolute", inset: 0, zIndex: 0, background: "radial-gradient(ellipse 60% 55% at 50% 40%, rgba(29,107,60,0.07) 0%, transparent 65%), radial-gradient(ellipse 40% 35% at 20% 80%, rgba(232,160,32,0.06) 0%, transparent 55%), radial-gradient(ellipse 35% 30% at 80% 15%, rgba(26,79,122,0.05) 0%, transparent 55%), #faf7f2" }} />
        <div style={{ position: "absolute", inset: 0, zIndex: 0, backgroundImage: "radial-gradient(circle, rgba(29,107,60,0.1) 1px, transparent 1px)", backgroundSize: "40px 40px", maskImage: "radial-gradient(ellipse 85% 80% at 50% 50%, black, transparent)" }} />

        <div style={{ position: "relative", zIndex: 1, maxWidth: 820, margin: "0 auto", width: "100%" }}>
          <div className="eyebrow-dot fade-up d1" style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem", background: "#d4ead9", color: "#1d6b3c", fontSize: "0.8rem", fontWeight: 500, letterSpacing: "0.05em", textTransform: "uppercase", padding: "0.35rem 0.85rem", borderRadius: 100, marginBottom: "1.75rem" }}>
            Free live classes · Open to all · No limits
          </div>

          <h1 className="fade-up d2" style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: "clamp(2.4rem,6vw,5rem)", fontWeight: 700, lineHeight: 1.05, letterSpacing: "-0.03em", color: "#0f1410", marginBottom: "1rem" }}>
            Education<br /><em style={{ fontStyle: "italic", color: "#1d6b3c" }}>for everyone,</em><br />limited for none.
          </h1>

          <p className="fade-up d3" style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: "clamp(1rem,2vw,1.35rem)", fontWeight: 300, fontStyle: "italic", color: "#3a4140", marginBottom: "1.75rem", letterSpacing: "0.01em" }}>
            Teaching freely. Learning freely. Always.
          </p>

          <p className="fade-up d3" style={{ fontSize: "1rem", color: "#6b7a72", maxWidth: 520, margin: "0 auto 2.5rem", lineHeight: 1.8 }}>
            OpenClass connects passionate teachers with eager learners — through live classes, webinars, and workshops. Open your browser, pick a class, and start learning right now.
          </p>

          {/* ₹0 Forever callout */}
          <div className="fade-up d4" style={{ display: "inline-flex", alignItems: "center", gap: "1.5rem", background: "#fff", border: "1.5px solid #e2ded6", borderRadius: 16, padding: "1.1rem 2rem", marginBottom: "2.5rem", flexWrap: "wrap", justifyContent: "center" }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: "0.25rem" }}>
              <span style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: "1.4rem", fontWeight: 700, color: "#1d6b3c" }}>₹</span>
              <span style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: "3.2rem", fontWeight: 700, lineHeight: 1, color: "#1d6b3c", letterSpacing: "-0.04em" }}>0</span>
            </div>
            <div className="price-divider" style={{ width: 1, height: 40, background: "#e2ded6", flexShrink: 0 }} />
            <div style={{ fontSize: "0.8rem", fontWeight: 500, color: "#6b7a72", textAlign: "left", lineHeight: 1.4 }}>
              <strong style={{ display: "block", fontSize: "0.95rem", color: "#0f1410" }}>Forever free.</strong>
              Not a trial. Not freemium.<br />Just free — today, tomorrow, always.
            </div>
            <div className="price-divider" style={{ width: 1, height: 40, background: "#e2ded6", flexShrink: 0 }} />
            <div style={{ display: "flex", flexDirection: "column", gap: "0.3rem", alignItems: "flex-start" }}>
              {["Free forever", "No credit card", "No hidden fees"].map(p => (
                <span key={p} style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "0.8rem", color: "#3a4140" }}>
                  <span style={{ color: "#1d6b3c", fontWeight: 700 }}>✓</span>{p}
                </span>
              ))}
            </div>
          </div>

          {/* CTAs */}
          <div className="fade-up d4" style={{ display: "flex", gap: "1rem", flexWrap: "wrap", alignItems: "center", justifyContent: "center" }}>
            <Link href="/live" className="btn-primary-hover" style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem", background: "#1d6b3c", color: "#fff", padding: "0.9rem 2rem", borderRadius: 100, fontWeight: 500, fontSize: "0.95rem", textDecoration: "none", transition: "background 0.2s, transform 0.15s" }}>
              <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><circle cx="12" cy="12" r="10"/><polygon points="10,8 16,12 10,16" fill="currentColor" stroke="none"/></svg>
              Join a live class
            </Link>
            <Link href="/login" className="btn-secondary-hover" style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem", background: "transparent", color: "#3a4140", padding: "0.9rem 2rem", borderRadius: 100, fontWeight: 500, fontSize: "0.95rem", textDecoration: "none", border: "1.5px solid #e2ded6", transition: "border-color 0.2s, color 0.2s" }}>
              <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M12 20h9M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
              Start teaching
            </Link>
          </div>

          {/* Stats */}
          <div className="fade-up d5" style={{ display: "flex", gap: "2rem", marginTop: "3rem", paddingTop: "3rem", borderTop: "1px solid #e2ded6", justifyContent: "center", flexWrap: "wrap" }}>
            {[["12K+","Teachers sharing"],["340K+","Students learning"],["80+","Subjects covered"],["₹0","Cost, forever"]].map(([num, label]) => (
              <div key={label} style={{ textAlign: "center" }}>
                <div style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: "clamp(1.4rem,3vw,2rem)", fontWeight: 700, color: "#0f1410", lineHeight: 1 }}>{num}</div>
                <div style={{ fontSize: "0.8rem", color: "#6b7a72", marginTop: "0.3rem" }}>{label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── MANIFESTO ─────────────────────────────────────────────── */}
      <section className="section-pad" style={{ padding: "6rem 2rem", background: "#0f1410", color: "#faf7f2", textAlign: "center", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", inset: 0, backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.04) 1px, transparent 1px)", backgroundSize: "40px 40px" }} />
        <div style={{ position: "relative", zIndex: 1, maxWidth: 820, margin: "0 auto" }}>
          <h2 className="anim-item" style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: "clamp(1.8rem,4.5vw,3.5rem)", fontWeight: 300, lineHeight: 1.25, letterSpacing: "-0.02em", marginBottom: "1.5rem", color: "#faf7f2" }}>
            Knowledge should never be locked<br />behind a <em style={{ fontStyle: "italic", color: "#7ed9a4" }}>paywall.</em>
          </h2>
          <p className="anim-item" style={{ fontSize: "1.05rem", color: "rgba(250,247,242,0.65)", maxWidth: 600, margin: "0 auto" }}>
            We believe that a child in a village and a student in a city deserve the same quality of teaching. OpenClass makes that real — one free class at a time.
          </p>
          <div className="anim-item" style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem", justifyContent: "center", marginTop: "2.5rem" }}>
            {["Open to all", "No fees ever", "No ads", "Any device, anywhere", "Any language", "Real teachers, real humans"].map(pill => (
              <span key={pill} style={{ background: "rgba(255,255,255,0.08)", color: "rgba(250,247,242,0.85)", fontSize: "0.85rem", padding: "0.4rem 1rem", borderRadius: 100, border: "1px solid rgba(255,255,255,0.12)" }}>{pill}</span>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ──────────────────────────────────────────── */}
      <section id="how" className="section-pad" style={{ padding: "6rem 2rem" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <div style={sectionTag}>How it works</div>
          <h2 style={sectionTitle}>Simple for teachers.<br />Simple for students.</h2>
          <p style={sectionSub}>Simple setup. Direct access. Just pure, meaningful education.</p>
          <div className="grid-2col" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "2rem" }}>
            {/* Teacher panel */}
            <div style={{ background: "#fff", border: "1px solid #e2ded6", borderRadius: 16, padding: "2rem" }}>
              <div style={{ fontSize: "0.75rem", fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", color: "#1d6b3c", marginBottom: "1.5rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <svg width="14" height="14" fill="currentColor" viewBox="0 0 24 24"><path d="M12 3L1 9l11 6 9-4.91V17h2V9L12 3z"/><path d="M5 13.18v4L12 21l7-3.82v-4L12 17l-7-3.82z"/></svg>
                For Teachers
              </div>
              {[
                ["Share your link",      "Request a free class slot from our team. We'll give you a unique streaming link in 24h."],
                ["Choose your format",   "Live class, webinar, Q&A session, or recorded talk — teach how you want."],
                ["Go live, change lives","Stream directly from any device. Students from around the world join instantly and learn together."],
                ["Build your community", "Return weekly. Regulars follow your upcoming schedule. Your impact compounds."],
              ].map(([title, desc], i) => (
                <div key={title} className="anim-item" style={{ display: "flex", gap: "1rem", marginBottom: i < 3 ? "1.5rem" : 0, alignItems: "flex-start" }}>
                  <div style={{ width: 32, height: 32, flexShrink: 0, borderRadius: "50%", background: "#d4ead9", color: "#1d6b3c", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.8rem", fontWeight: 600 }}>{i + 1}</div>
                  <div><strong style={{ display: "block", fontSize: "0.95rem", marginBottom: "0.2rem" }}>{title}</strong><span style={{ fontSize: "0.85rem", color: "#6b7a72" }}>{desc}</span></div>
                </div>
              ))}
            </div>
            {/* Student panel */}
            <div style={{ background: "#fff", border: "1px solid #e2ded6", borderRadius: 16, padding: "2rem" }}>
              <div style={{ fontSize: "0.75rem", fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", color: "#1a4f7a", marginBottom: "1.5rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <svg width="14" height="14" fill="currentColor" viewBox="0 0 24 24"><path d="M17 12h-5v5h5v-5zM16 1v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2h-1V1h-2zm3 18H5V8h14v11z"/></svg>
                For Students
              </div>
              {[
                ["Browse & discover",            "Explore live and upcoming classes. Visit teacher profiles to see their background, ratings, and upcoming schedule."],
                ["Subscribe to teachers you love","Hit Subscribe on any teacher profile. Get notified the moment they go live or schedule something new."],
                ["Engage during the session",     "Chat live, ask questions, react in real-time. Every voice matters in an OpenClass session."],
                ["Rate & message after class",    "Leave a star rating and comment after every session. Message teachers directly for doubts or deeper conversation."],
              ].map(([title, desc], i) => (
                <div key={title} className="anim-item" style={{ display: "flex", gap: "1rem", marginBottom: i < 3 ? "1.5rem" : 0, alignItems: "flex-start" }}>
                  <div style={{ width: 32, height: 32, flexShrink: 0, borderRadius: "50%", background: "#ddeaf8", color: "#1a4f7a", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.8rem", fontWeight: 600 }}>{i + 1}</div>
                  <div><strong style={{ display: "block", fontSize: "0.95rem", marginBottom: "0.2rem" }}>{title}</strong><span style={{ fontSize: "0.85rem", color: "#6b7a72" }}>{desc}</span></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── FEATURES (9) ──────────────────────────────────────────── */}
      <div className="section-pad" style={{ background: "#fff", padding: "6rem 2rem", borderTop: "1px solid #e2ded6", borderBottom: "1px solid #e2ded6" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <div style={sectionTag}>Features</div>
          <h2 style={sectionTitle}>Built for the purpose of teaching,<br />not profit.</h2>
          <p style={sectionSub}>Every feature exists to remove friction between a teacher's knowledge and a student's curiosity.</p>
          <div className="grid-3col" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "2rem" }}>
            {FEATURES.map(f => (
              <div key={f.title} className="anim-item feature-card-hover" style={{ padding: "1.75rem", borderRadius: 16, border: "1px solid #e2ded6", transition: "border-color 0.2s, transform 0.2s" }}>
                <div style={{ width: 44, height: 44, borderRadius: 8, background: f.bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.3rem", marginBottom: "1.25rem" }}>{f.icon}</div>
                <h3 style={{ fontSize: "1rem", fontWeight: 500, marginBottom: "0.5rem" }}>{f.title}</h3>
                <p style={{ fontSize: "0.875rem", color: "#6b7a72", lineHeight: 1.65 }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── STUDENT EXPERIENCE ────────────────────────────────────── */}
      <section className="section-pad" style={{ padding: "6rem 2rem", background: "#fff", borderTop: "1px solid #e2ded6" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <div style={sectionTag}>Student Experience</div>
          <h2 style={sectionTitle}>Every tool you need<br />to learn deeply.</h2>
          <p style={sectionSub}>OpenClass puts students in control — rate sessions, chat live, follow teachers, and build direct connections with the people teaching you.</p>

          {/* Tabs */}
          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginBottom: "2rem" }}>
            {([
              { id: "chat",    label: "💬 Live Chat" },
              { id: "rate",    label: "⭐ Rate Session" },
              { id: "profile", label: "🤝 Teacher Profile" },
              { id: "message", label: "✍️ Direct Message" },
            ] as { id: ExpTab; label: string }[]).map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className={activeTab !== tab.id ? "exp-tab-hover" : ""}
                style={{ padding: "0.55rem 1.1rem", borderRadius: 100, border: `1.5px solid ${activeTab === tab.id ? "#1d6b3c" : "#e2ded6"}`, background: activeTab === tab.id ? "#1d6b3c" : "#fff", color: activeTab === tab.id ? "#fff" : "#3a4140", fontSize: "0.85rem", fontWeight: 500, cursor: "pointer", fontFamily: "'DM Sans', sans-serif", transition: "all 0.2s" }}>
                {tab.label}
              </button>
            ))}
          </div>

          {/* ── Live Chat panel ── */}
          {activeTab === "chat" && (
            <div className="grid-2col" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "3rem", alignItems: "start" }}>
              <div>
                <h3 style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: "1.5rem", fontWeight: 700, letterSpacing: "-0.02em", marginBottom: "0.85rem" }}>Comment & ask questions live</h3>
                <p style={{ color: "#3a4140", lineHeight: 1.75, marginBottom: "1.25rem" }}>During every class or webinar, the live chat runs alongside the stream. Ask doubts, react to what the teacher says, and learn from other students' questions too. Teachers can pin important questions and respond in real time.</p>
                <ul style={{ listStyle: "none", padding: 0, display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                  {["Emoji reactions during the session", "Teacher can highlight and answer questions", "Chat history saved with the replay"].map(p => (
                    <li key={p} style={{ display: "flex", alignItems: "center", gap: "0.6rem", fontSize: "0.875rem", color: "#3a4140" }}>
                      <span style={{ color: "#1d6b3c", fontWeight: 700 }}>✓</span>{p}
                    </li>
                  ))}
                </ul>
              </div>
              <div style={{ background: "#fff", border: "1.5px solid #e2ded6", borderRadius: 16, overflow: "hidden", boxShadow: "0 8px 32px rgba(15,20,16,0.08)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.75rem 1rem", background: "#0f1410", color: "#fff", fontSize: "0.8rem", fontWeight: 500 }}>
                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#ef4444", flexShrink: 0 }} />
                  Live Chat — Linear Algebra
                  <span style={{ marginLeft: "auto", fontSize: "0.72rem", color: "rgba(255,255,255,0.5)" }}>1,204 watching</span>
                </div>
                <div ref={chatRef} style={{ padding: "0.75rem 1rem", display: "flex", flexDirection: "column", gap: "0.6rem", maxHeight: 220, overflowY: "auto" }}>
                  {chatMessages.map((m, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: "0.6rem", fontSize: "0.8rem", color: "#0f1410", ...(m.pinned ? { background: "rgba(139,92,246,0.07)", borderRadius: 8, padding: "0.4rem 0.5rem" } : {}) }}>
                      {m.pinned && <span style={{ fontSize: "0.68rem", background: "rgba(139,92,246,0.12)", color: "#7c3aed", padding: "0.1rem 0.4rem", borderRadius: 4, whiteSpace: "nowrap", flexShrink: 0 }}>📌 Pinned</span>}
                      <div style={{ width: 26, height: 26, borderRadius: "50%", background: m.bg, color: m.avColor || "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.62rem", fontWeight: 700, flexShrink: 0 }}>{m.av}</div>
                      <div><span style={{ fontWeight: 600, marginRight: "0.3rem" }}>{m.name}</span>{m.text}</div>
                    </div>
                  ))}
                </div>
                <div style={{ display: "flex", gap: "0.5rem", padding: "0.65rem 0.75rem", borderTop: "1px solid #e2ded6" }}>
                  <input value={chatInput} onChange={e => setChatInput(e.target.value)} onKeyDown={e => e.key === "Enter" && sendChat()} placeholder="Ask something…" style={{ flex: 1, border: "1.5px solid #e2ded6", borderRadius: 100, padding: "0.4rem 0.85rem", fontSize: "0.8rem", fontFamily: "'DM Sans', sans-serif", color: "#0f1410", outline: "none" }} />
                  <button onClick={sendChat} className="mock-send-hover" style={{ background: "#1d6b3c", color: "#fff", border: "none", borderRadius: 100, padding: "0.4rem 0.9rem", fontSize: "0.78rem", fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans', sans-serif", transition: "background 0.2s" }}>Send</button>
                </div>
              </div>
            </div>
          )}

          {/* ── Rate Session panel ── */}
          {activeTab === "rate" && (
            <div className="grid-2col" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "3rem", alignItems: "start" }}>
              <div>
                <h3 style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: "1.5rem", fontWeight: 700, letterSpacing: "-0.02em", marginBottom: "0.85rem" }}>Rate every session honestly</h3>
                <p style={{ color: "#3a4140", lineHeight: 1.75, marginBottom: "1.25rem" }}>After a class ends, students can leave a star rating (1–5) and a written comment. This builds a transparent reputation system — great teachers rise naturally through genuine feedback, not paid promotion.</p>
                <ul style={{ listStyle: "none", padding: 0, display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                  {["1–5 star rating per session", "Written review visible on teacher profile", "Average rating shown on all class cards"].map(p => (
                    <li key={p} style={{ display: "flex", alignItems: "center", gap: "0.6rem", fontSize: "0.875rem", color: "#3a4140" }}>
                      <span style={{ color: "#1d6b3c", fontWeight: 700 }}>✓</span>{p}
                    </li>
                  ))}
                </ul>
              </div>
              <div style={{ background: "#fff", border: "1.5px solid #e2ded6", borderRadius: 16, overflow: "hidden", boxShadow: "0 8px 32px rgba(15,20,16,0.08)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.75rem 1rem", background: "#0f1410", color: "#fff", fontSize: "0.8rem", fontWeight: 500 }}>Rate this session</div>
                <div style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: "1rem", fontWeight: 700, padding: "1rem 1rem 0.15rem", color: "#0f1410" }}>Linear Algebra: Eigenvalues & Eigenvectors</div>
                <div style={{ fontSize: "0.78rem", color: "#6b7a72", padding: "0 1rem 0.75rem" }}>Prof. Ananya Rao · Mathematics</div>
                <div style={{ display: "flex", gap: "0.35rem", padding: "0 1rem 0.5rem", cursor: "pointer" }}>
                  {[1,2,3,4,5].map(v => (
                    <span key={v} onMouseEnter={() => setRatingHover(v)} onMouseLeave={() => setRatingHover(0)} onClick={() => setCurrentRating(v)} style={{ fontSize: "1.6rem", color: v <= displayRating ? "#e8a020" : "#e2ded6", transition: "color 0.15s", cursor: "pointer" }}>★</span>
                  ))}
                </div>
                <div style={{ fontSize: "0.8rem", color: "#6b7a72", padding: "0 1rem 0.75rem" }}>{RATE_LABELS[displayRating]}</div>
                <textarea rows={3} placeholder="What did you learn? What could be better? (optional)" style={{ width: "calc(100% - 2rem)", margin: "0 1rem", border: "1.5px solid #e2ded6", borderRadius: 8, padding: "0.6rem 0.75rem", fontSize: "0.8rem", fontFamily: "'DM Sans', sans-serif", color: "#0f1410", resize: "none", outline: "none" }} />
                <button className="rate-submit-hover" style={{ display: "block", margin: "0.75rem 1rem", background: "#1d6b3c", color: "#fff", border: "none", borderRadius: 100, padding: "0.55rem 1.25rem", fontSize: "0.85rem", fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans', sans-serif", transition: "background 0.2s" }}>Submit Rating</button>
                <div style={{ padding: "0.75rem 1rem 1rem", borderTop: "1px solid #e2ded6" }}>
                  <div style={{ fontSize: "0.8rem", fontWeight: 500, letterSpacing: "0.07em", textTransform: "uppercase", color: "#1d6b3c", marginBottom: "0.75rem" }}>Recent ratings</div>
                  {[
                    { stars: "★★★★★", text: "Explained eigenvectors like no one else has. Highly recommend!", name: "Meena S." },
                    { stars: "★★★★☆", text: "Great depth, would love more examples next time.", name: "Ravi T." },
                  ].map(r => (
                    <div key={r.name} style={{ display: "flex", alignItems: "flex-start", gap: "0.5rem", marginBottom: "0.6rem", fontSize: "0.78rem" }}>
                      <span style={{ color: "#e8a020", flexShrink: 0 }}>{r.stars}</span>
                      <span style={{ color: "#3a4140", flex: 1, fontStyle: "italic" }}>"{r.text}"</span>
                      <span style={{ color: "#6b7a72", whiteSpace: "nowrap" }}>— {r.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── Teacher Profile panel ── */}
          {activeTab === "profile" && (
            <div className="grid-2col" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "3rem", alignItems: "start" }}>
              <div>
                <h3 style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: "1.5rem", fontWeight: 700, letterSpacing: "-0.02em", marginBottom: "0.85rem" }}>Know your teacher deeply</h3>
                <p style={{ color: "#3a4140", lineHeight: 1.75, marginBottom: "1.25rem" }}>Every teacher on OpenClass has a full public profile — their background, qualifications, subjects they teach, average rating, total students taught, and a complete history of past sessions with replays. Subscribe in one tap.</p>
                <ul style={{ listStyle: "none", padding: 0, display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                  {["Full bio and teaching background", "Upcoming schedule at a glance", "All past sessions with replays"].map(p => (
                    <li key={p} style={{ display: "flex", alignItems: "center", gap: "0.6rem", fontSize: "0.875rem", color: "#3a4140" }}>
                      <span style={{ color: "#1d6b3c", fontWeight: 700 }}>✓</span>{p}
                    </li>
                  ))}
                </ul>
              </div>
              <div style={{ background: "#fff", border: "1.5px solid #e2ded6", borderRadius: 16, overflow: "hidden", boxShadow: "0 8px 32px rgba(15,20,16,0.08)" }}>
                <div style={{ display: "flex", alignItems: "flex-start", gap: "0.85rem", padding: "1rem", borderBottom: "1px solid #e2ded6" }}>
                  <div style={{ width: 44, height: 44, borderRadius: "50%", background: "#1d6b3c", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.8rem", fontWeight: 700, flexShrink: 0 }}>AR</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: "0.9rem", color: "#0f1410" }}>Prof. Ananya Rao</div>
                    <div style={{ fontSize: "0.75rem", color: "#6b7a72", marginBottom: "0.4rem" }}>Mathematics · IIT Bombay (Retd.)</div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "0.3rem" }}>
                      {[["⭐ 4.9 Rating","#d4ead9","#1d6b3c"],["🥇 34K students","#ddeaf8","#1a4f7a"],["📚 148 sessions","#f8ede5","#c45b2a"]].map(([label,bg,tc]) => (
                        <span key={label} style={{ fontSize: "0.68rem", fontWeight: 500, padding: "0.15rem 0.5rem", borderRadius: 100, background: bg as string, color: tc as string }}>{label}</span>
                      ))}
                    </div>
                  </div>
                  <button onClick={() => setIsSubscribed(v => !v)} className="sub-btn-hover" style={{ flexShrink: 0, background: isSubscribed ? "#d4ead9" : "#1d6b3c", color: isSubscribed ? "#1d6b3c" : "#fff", border: "none", borderRadius: 100, padding: "0.4rem 0.85rem", fontSize: "0.78rem", fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans', sans-serif", transition: "background 0.2s" }}>
                    {isSubscribed ? "✓ Subscribed" : "+ Subscribe"}
                  </button>
                </div>
                <div style={{ fontSize: "0.78rem", color: "#3a4140", fontStyle: "italic", padding: "0.85rem 1rem", borderBottom: "1px solid #e2ded6", lineHeight: 1.6 }}>
                  "I've spent 30 years teaching at IIT Bombay. Now I want to reach every student in India — not just those who can afford premium coaching. Mathematics is for everyone."
                </div>
                <div style={{ fontSize: "0.68rem", fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: "#6b7a72", padding: "0.75rem 1rem 0.4rem" }}>Upcoming sessions</div>
                {[
                  { dot: "#1d6b3c", title: "Differential Equations: Introduction", time: "Today · 5:00 PM IST", btn: "Join Free" },
                  { dot: "#1a4f7a", title: "Linear Algebra: Matrix Operations",    time: "Tomorrow · 4:00 PM IST", btn: "Remind Me" },
                ].map(s => (
                  <div key={s.title} style={{ display: "flex", alignItems: "center", gap: "0.65rem", padding: "0.55rem 1rem", borderBottom: "1px solid #e2ded6" }}>
                    <div style={{ width: 8, height: 8, borderRadius: "50%", background: s.dot, flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: "0.8rem", fontWeight: 600, color: "#0f1410", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.title}</div>
                      <div style={{ fontSize: "0.72rem", color: "#6b7a72" }}>{s.time}</div>
                    </div>
                    <span className="ps-join-hover" style={{ fontSize: "0.72rem", fontWeight: 600, color: "#1d6b3c", background: "#d4ead9", padding: "0.2rem 0.6rem", borderRadius: 100, cursor: "pointer", transition: "background 0.2s", flexShrink: 0 }}>{s.btn}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Direct Message panel ── */}
          {activeTab === "message" && (
            <div className="grid-2col" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "3rem", alignItems: "start" }}>
              <div>
                <h3 style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: "1.5rem", fontWeight: 700, letterSpacing: "-0.02em", marginBottom: "0.85rem" }}>Talk to your teacher directly</h3>
                <p style={{ color: "#3a4140", lineHeight: 1.75, marginBottom: "1.25rem" }}>Have a doubt that wasn't answered in class? Want to discuss a topic in more depth? Students can send direct messages to any teacher on OpenClass. Teachers respond at their own pace — real human connection, not a chatbot.</p>
                <ul style={{ listStyle: "none", padding: 0, display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                  {["One-on-one message thread per teacher", "Teachers can manage their inbox easily", "Share notes, images, or links in chat"].map(p => (
                    <li key={p} style={{ display: "flex", alignItems: "center", gap: "0.6rem", fontSize: "0.875rem", color: "#3a4140" }}>
                      <span style={{ color: "#1d6b3c", fontWeight: 700 }}>✓</span>{p}
                    </li>
                  ))}
                </ul>
              </div>
              <div style={{ background: "#fff", border: "1.5px solid #e2ded6", borderRadius: 16, overflow: "hidden", boxShadow: "0 8px 32px rgba(15,20,16,0.08)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", padding: "0.75rem 1rem", borderBottom: "1px solid #e2ded6", background: "#faf7f2" }}>
                  <div style={{ width: 32, height: 32, borderRadius: "50%", background: "#1d6b3c", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.65rem", fontWeight: 700, flexShrink: 0 }}>AR</div>
                  <div>
                    <div style={{ fontSize: "0.85rem", fontWeight: 600, color: "#0f1410" }}>Prof. Ananya Rao</div>
                    <div style={{ fontSize: "0.72rem", color: "#1d6b3c" }}>● Online</div>
                  </div>
                </div>
                <div ref={dmRef} style={{ padding: "0.75rem 1rem", display: "flex", flexDirection: "column", gap: "0.75rem", maxHeight: 200, overflowY: "auto" }}>
                  {dmMessages.map((m, i) => (
                    <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: m.isMe ? "flex-end" : "flex-start" }}>
                      <div style={{ fontSize: "0.8rem", padding: "0.55rem 0.85rem", borderRadius: 14, maxWidth: "85%", lineHeight: 1.5, background: m.isMe ? "#1d6b3c" : "#faf7f2", color: m.isMe ? "#fff" : "#0f1410", borderBottomRightRadius: m.isMe ? 4 : 14, borderBottomLeftRadius: m.isMe ? 14 : 4 }}>{m.text}</div>
                      <div style={{ fontSize: "0.65rem", color: "#6b7a72", marginTop: "0.2rem" }}>{m.time}</div>
                    </div>
                  ))}
                </div>
                <div style={{ display: "flex", gap: "0.5rem", padding: "0.65rem 0.75rem", borderTop: "1px solid #e2ded6" }}>
                  <input value={dmInput} onChange={e => setDmInput(e.target.value)} onKeyDown={e => e.key === "Enter" && sendDM()} placeholder="Type a message…" style={{ flex: 1, border: "1.5px solid #e2ded6", borderRadius: 100, padding: "0.4rem 0.85rem", fontSize: "0.8rem", fontFamily: "'DM Sans', sans-serif", color: "#0f1410", outline: "none" }} />
                  <button onClick={sendDM} className="mock-send-hover" style={{ background: "#1d6b3c", color: "#fff", border: "none", borderRadius: 100, padding: "0.4rem 0.9rem", fontSize: "0.78rem", fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans', sans-serif", transition: "background 0.2s" }}>Send</button>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ── SUBJECTS (from API cache) ──────────────────────────────── */}
      {categories.length > 0 && (
        <section id="subjects" className="section-pad" style={{ padding: "6rem 2rem" }}>
          <div style={{ maxWidth: 1100, margin: "0 auto" }}>
            <div style={sectionTag}>Subjects</div>
            <h2 style={sectionTitle}>Every subject, taught with love.</h2>
            <p style={sectionSub}>From UPSC prep to yoga philosophy — if knowledge matters, it belongs here.</p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem" }}>
              {categories.map(cat => (
                <button key={cat.id} onClick={() => setActiveSubject(cat.name)}
                  className={activeSubject !== cat.name ? "exp-tab-hover" : ""}
                  style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.6rem 1.1rem", borderRadius: 100, border: `1.5px solid ${activeSubject === cat.name ? "#1d6b3c" : "#e2ded6"}`, fontSize: "0.875rem", fontWeight: 500, cursor: "pointer", transition: "all 0.2s", background: activeSubject === cat.name ? "#d4ead9" : "#fff", color: activeSubject === cat.name ? "#1d6b3c" : "#3a4140", fontFamily: "'DM Sans', sans-serif" }}>
                  {cat.name}
                </button>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── TESTIMONIALS ──────────────────────────────────────────── */}
      <section className="section-pad" style={{ padding: "6rem 2rem", background: "#faf7f2" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <div style={sectionTag}>Stories</div>
          <h2 style={{ ...sectionTitle, marginBottom: "3rem" }}>Education changes lives.<br />These are the proof.</h2>
          <div className="grid-3col" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "1.5rem" }}>
            {TESTIMONIALS.map(t => (
              <div key={t.name} className="anim-item" style={{ background: "#fff", border: "1px solid #e2ded6", borderRadius: 16, padding: "1.75rem" }}>
                <div style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: "1.05rem", fontWeight: 300, fontStyle: "italic", lineHeight: 1.6, color: "#0f1410", marginBottom: "1.25rem" }}>"{t.quote}"</div>
                <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                  <div style={{ width: 36, height: 36, borderRadius: "50%", background: t.bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.75rem", fontWeight: 600, color: "#fff", flexShrink: 0 }}>{t.initials}</div>
                  <div>
                    <div style={{ fontSize: "0.875rem", fontWeight: 500 }}>{t.name}</div>
                    <div style={{ fontSize: "0.78rem", color: "#6b7a72" }}>{t.role}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── DUAL CTA ──────────────────────────────────────────────── */}
      <section id="teach" className="section-pad" style={{ padding: "6rem 2rem" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <div className="grid-2col" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "2rem" }}>
            <div className="anim-item dual-cta-card" style={{ background: "#0f1410", color: "#faf7f2", borderRadius: 16, padding: "3rem 2.5rem", position: "relative", overflow: "hidden" }}>
              <h3 style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: "1.8rem", fontWeight: 700, marginBottom: "0.75rem", letterSpacing: "-0.02em" }}>Share what you know.</h3>
              <p style={{ fontSize: "0.95rem", color: "rgba(250,247,242,0.65)", marginBottom: "2rem", lineHeight: 1.7 }}>You don't need a studio or a degree in education. You need knowledge and the will to share it. We handle the rest.</p>
              <Link href="/login" style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem", background: "#fff", color: "#0f1410", padding: "0.75rem 1.5rem", borderRadius: 100, fontWeight: 500, fontSize: "0.9rem", textDecoration: "none" }}>Apply to teach →</Link>
              <div style={{ position: "absolute", right: "1.5rem", bottom: "-0.5rem", fontFamily: "'Fraunces', Georgia, serif", fontSize: "8rem", fontWeight: 700, opacity: 0.07, lineHeight: 1, pointerEvents: "none" }}>✏</div>
            </div>
            <div className="anim-item dual-cta-card" style={{ background: "#d4ead9", color: "#0f1410", borderRadius: 16, padding: "3rem 2.5rem", position: "relative", overflow: "hidden" }}>
              <h3 style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: "1.8rem", fontWeight: 700, marginBottom: "0.75rem", letterSpacing: "-0.02em" }}>Learn anything, right now.</h3>
              <p style={{ fontSize: "0.95rem", color: "#3a4140", marginBottom: "2rem", lineHeight: 1.7 }}>Browse hundreds of live and upcoming classes. Pick a subject, click join, and start learning in seconds. That's all it takes.</p>
              <Link href="/live" style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem", background: "#1d6b3c", color: "#fff", padding: "0.75rem 1.5rem", borderRadius: 100, fontWeight: 500, fontSize: "0.9rem", textDecoration: "none" }}>See live classes →</Link>
              <div style={{ position: "absolute", right: "1.5rem", bottom: "-0.5rem", fontFamily: "'Fraunces', Georgia, serif", fontSize: "8rem", fontWeight: 700, opacity: 0.07, lineHeight: 1, pointerEvents: "none" }}>📚</div>
            </div>
          </div>
        </div>
      </section>

      {/* ── FOOTER ────────────────────────────────────────────────── */}
      <footer style={{ background: "#0f1410", color: "#faf7f2", padding: "4rem 2rem 2rem" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <div className="footer-grid" style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", gap: "3rem", marginBottom: "3rem" }}>
            <div>
              <h3 style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: "1.4rem", fontWeight: 700, marginBottom: "0.75rem" }}>Open<span style={{ color: "#7ed9a4" }}>Class</span></h3>
              <p style={{ fontSize: "0.875rem", color: "rgba(250,247,242,0.55)", maxWidth: 280, lineHeight: 1.7 }}>A purpose-driven platform where teachers teach freely and students learn freely. Education is a right, not a privilege.</p>
              <div style={{ marginTop: "1.25rem" }}><span style={{ fontSize: "0.78rem", color: "rgba(250,247,242,0.4)" }}>Built with love in India 🇮🇳</span></div>
            </div>
            {[
              { title: "Learn",  links: [["Live Classes","/live"],["Upcoming Schedule","/live"],["Browse by Subject","/live"],["Teachers","/teachers"]] },
              { title: "Teach",  links: [["Apply to Teach","/login"],["Teacher Dashboard","/dashboard"],["Host a Webinar","/session"],["My Sessions","/my-sessions"]] },
              { title: "About",  links: [["Our Mission","/about"],["How We're Funded","/about#funding"],["Expertise Levels","/expertise"],["Contact Us","/contact"]] },
            ].map(col => (
              <div key={col.title}>
                <h4 style={{ fontSize: "0.8rem", fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", color: "rgba(250,247,242,0.45)", marginBottom: "1rem" }}>{col.title}</h4>
                <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                  {col.links.map(([label, href]) => (
                    <li key={label} style={{ marginBottom: "0.6rem" }}>
                      {href ? (
                        <Link href={href} className="footer-link-hover" style={{ textDecoration: "none", fontSize: "0.875rem", color: "rgba(250,247,242,0.65)", transition: "color 0.2s" }}>{label}</Link>
                      ) : (
                        <span style={{ fontSize: "0.875rem", color: "rgba(250,247,242,0.65)", cursor: "default" }}>{label}</span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div className="footer-bottom" style={{ borderTop: "1px solid rgba(255,255,255,0.08)", paddingTop: "1.5rem", display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: "0.8rem", color: "rgba(250,247,242,0.35)" }}>
            <span>© 2025 OpenClass · Free forever, for everyone.</span>
            <div style={{ display: "flex", gap: "1.5rem" }}>
              <Link href="/privacy" className="footer-link-hover" style={{ textDecoration: "none", color: "rgba(250,247,242,0.35)", transition: "color 0.2s" }}>Privacy</Link>
              <Link href="/terms" className="footer-link-hover" style={{ textDecoration: "none", color: "rgba(250,247,242,0.35)", transition: "color 0.2s" }}>Terms</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
