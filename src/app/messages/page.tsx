"use client";
import { useState, useEffect, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Header from "@/components/common/HeadFoot/header";
import Footer from "@/components/common/HeadFoot/footer";

const T = {
  ink: "#0f1410", inkSoft: "#3a4140", inkMuted: "#6b7a72",
  leaf: "#1d6b3c", leafLight: "#d4ead9",
  cream: "#faf7f2", white: "#fff", border: "#e2ded6",
  ff: "var(--font-dm-sans), sans-serif",
  ffd: "var(--font-fraunces), Georgia, serif",
};

const API = process.env.NEXT_PUBLIC_API_URL ?? "";

function getToken() { return typeof window !== "undefined" ? (localStorage.getItem("token") ?? "") : ""; }

function updateUnreadCache(count: number) {
  localStorage.setItem("oc_msg_unread", String(count));
  setTimeout(() => window.dispatchEvent(new Event("oc_msg_update")), 0);
}

interface ConvOther {
  id: number;
  firstName: string | null;
  lastName: string | null;
  avatarUrl: string | null;
  title: string | null;
}

interface ConvListItem {
  id: number;
  other: ConvOther;
  lastMessage: { content: string; createdAt: string; senderId: number; readAt: string | null } | null;
  unreadCount: number;
  updatedAt: string;
}

interface MsgItem {
  id: number;
  senderId: number;
  content: string;
  readAt: string | null;
  createdAt: string;
}

interface ConvDetail {
  id: number;
  other: ConvOther;
  messages: MsgItem[];
}

function otherName(o: ConvOther) {
  return [o.firstName, o.lastName].filter(Boolean).join(" ") || "Unknown";
}

function otherInitials(o: ConvOther) {
  const n = [o.firstName, o.lastName].filter(Boolean);
  if (n.length >= 2) return (n[0]![0] + n[1]![0]).toUpperCase();
  if (n.length === 1) return n[0]!.slice(0, 2).toUpperCase();
  return "?";
}

function Avatar({ other, size = 40 }: { other: ConvOther; size?: number }) {
  if (other.avatarUrl) {
    return <img src={`${API}${other.avatarUrl}`} alt={otherName(other)} style={{ width: size, height: size, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />;
  }
  return (
    <div style={{ width: size, height: size, borderRadius: "50%", background: "linear-gradient(135deg,#1a4f7a,#0e3359)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: size * 0.35, fontWeight: 700, color: "#fff", flexShrink: 0, fontFamily: T.ffd }}>
      {otherInitials(other)}
    </div>
  );
}

function MessagesContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [myId, setMyId] = useState<number | null>(null);
  const [conversations, setConversations] = useState<ConvListItem[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [activeConv, setActiveConv] = useState<ConvDetail | null>(null);
  const [loadingThread, setLoadingThread] = useState(false);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [showThread, setShowThread] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const autoOpenedRef = useRef(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  useEffect(() => {
    const token = getToken();
    if (!token) { router.push("/login"); return; }
    try {
      const payload = JSON.parse(atob(token.split(".")[1]));
      setMyId(payload.sub ?? null);
    } catch { /* ignore */ }
    loadList(token);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-open conversation from ?conv= query param — only once, guarded by ref
  useEffect(() => {
    if (autoOpenedRef.current) return;
    const convId = searchParams.get("conv");
    if (convId && conversations.length > 0) {
      const found = conversations.find(c => c.id === parseInt(convId));
      if (found) {
        autoOpenedRef.current = true;
        openConversation(found.id);
      }
    }
  }, [conversations, searchParams]); // eslint-disable-line react-hooks/exhaustive-deps

  function loadList(token = getToken()) {
    setLoadingList(true);
    fetch(`${API}/messages`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then((d: ConvListItem[]) => {
        setConversations(d);
        const totalUnread = d.reduce((acc, c) => acc + c.unreadCount, 0);
        updateUnreadCache(totalUnread);
      })
      .catch(() => {})
      .finally(() => setLoadingList(false));
  }

  function openConversation(id: number) {
    setLoadingThread(true);
    setShowThread(true);
    fetch(`${API}/messages/${id}`, { headers: { Authorization: `Bearer ${getToken()}` } })
      .then(r => r.json())
      .then((d: ConvDetail) => {
        setActiveConv(d);
        markRead(id);
      })
      .catch(() => {})
      .finally(() => setLoadingThread(false));
  }

  function markRead(id: number) {
    fetch(`${API}/messages/${id}/read`, { method: "POST", headers: { Authorization: `Bearer ${getToken()}` } })
      .then(() => {
        setConversations(prev => {
          const updated = prev.map(c => c.id === id ? { ...c, unreadCount: 0 } : c);
          const totalUnread = updated.reduce((acc, c) => acc + c.unreadCount, 0);
          updateUnreadCache(totalUnread);
          return updated;
        });
      })
      .catch(() => {});
  }

  async function sendReply() {
    if (!activeConv || !reply.trim()) return;
    setSending(true);
    try {
      const res = await fetch(`${API}/messages/${activeConv.id}/reply`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ content: reply.trim() }),
      });
      if (!res.ok) throw new Error();
      setReply("");
      // Reload thread
      const d = await fetch(`${API}/messages/${activeConv.id}`, { headers: { Authorization: `Bearer ${getToken()}` } }).then(r => r.json()) as ConvDetail;
      setActiveConv(d);
      loadList();
    } catch { /* ignore */ }
    finally { setSending(false); }
  }

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeConv?.messages]);

  function fmtTime(iso: string) {
    const d = new Date(iso);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - d.getTime()) / 86400000);
    if (diffDays === 0) return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return d.toLocaleDateString([], { weekday: "short" });
    return d.toLocaleDateString([], { day: "numeric", month: "short" });
  }

  const showList = !isMobile || !showThread;
  const showPane = !isMobile || showThread;

  return (
    <>
      <Header />
      <main style={{ minHeight: "100vh", background: T.cream, paddingTop: 64, fontFamily: T.ff }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", padding: isMobile ? "1rem 0 0" : "1.5rem 2rem 3rem" }}>
          {!isMobile && (
            <h1 style={{ margin: "0 0 1.25rem", fontFamily: T.ffd, fontSize: "1.5rem", fontWeight: 700, color: T.ink, letterSpacing: "-0.02em" }}>Messages</h1>
          )}

          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "340px 1fr", gap: "1rem", alignItems: "start", height: isMobile ? undefined : "calc(100vh - 140px)" }}>

            {/* Conversation list */}
            {showList && (
              <div style={{ background: T.white, border: `1px solid ${T.border}`, borderRadius: isMobile ? 0 : 16, overflow: "hidden", height: isMobile ? undefined : "100%", display: "flex", flexDirection: "column" }}>
                <div style={{ padding: "1rem 1.25rem", borderBottom: `1px solid ${T.border}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span style={{ fontFamily: T.ffd, fontWeight: 700, fontSize: "1rem", color: T.ink }}>{isMobile ? "Messages" : "Conversations"}</span>
                  <button onClick={() => loadList()} disabled={loadingList} title="Refresh"
                    style={{ background: "none", border: "none", cursor: loadingList ? "default" : "pointer", padding: "0.25rem", color: T.inkMuted, opacity: loadingList ? 0.4 : 1, display: "flex", alignItems: "center" }}>
                    <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round"
                      style={{ animation: loadingList ? "spin 0.8s linear infinite" : "none" }}>
                      <path d="M23 4v6h-6M1 20v-6h6"/><path d="M3.51 9a9 9 0 0114.36-3.36L23 10M1 14l5.13 4.36A9 9 0 0020.49 15"/>
                    </svg>
                  </button>
                </div>
                <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                <div style={{ overflowY: "auto", flex: 1 }}>
                  {loadingList ? (
                    <div style={{ padding: "2rem", textAlign: "center", color: T.inkMuted, fontSize: "0.85rem" }}>Loading…</div>
                  ) : conversations.length === 0 ? (
                    <div style={{ padding: "3rem 1.5rem", textAlign: "center" }}>
                      <div style={{ fontSize: "2rem", marginBottom: "0.75rem" }}>💬</div>
                      <div style={{ fontWeight: 600, color: T.ink, marginBottom: "0.3rem" }}>No messages yet</div>
                      <div style={{ fontSize: "0.82rem", color: T.inkMuted }}>Visit a speaker&apos;s profile to send a message</div>
                    </div>
                  ) : conversations.map(c => (
                    <div key={c.id} onClick={() => openConversation(c.id)}
                      style={{ display: "flex", alignItems: "center", gap: "0.85rem", padding: "0.9rem 1.25rem", cursor: "pointer", borderBottom: `1px solid ${T.border}`, background: activeConv?.id === c.id ? T.leafLight : T.white, transition: "background 0.15s" }}>
                      <div style={{ position: "relative", flexShrink: 0 }}>
                        <Avatar other={c.other} size={44} />
                        {c.unreadCount > 0 && (
                          <div style={{ position: "absolute", top: -2, right: -2, width: 16, height: 16, borderRadius: "50%", background: T.leaf, border: `2px solid ${T.white}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.55rem", fontWeight: 700, color: T.white }}>
                            {c.unreadCount > 9 ? "9+" : c.unreadCount}
                          </div>
                        )}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.2rem" }}>
                          <span style={{ fontSize: "0.88rem", fontWeight: c.unreadCount > 0 ? 700 : 600, color: T.ink, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{otherName(c.other)}</span>
                          <span style={{ fontSize: "0.68rem", color: T.inkMuted, flexShrink: 0, marginLeft: "0.5rem" }}>{c.lastMessage ? fmtTime(c.lastMessage.createdAt) : ""}</span>
                        </div>
                        {c.other.title && <div style={{ fontSize: "0.72rem", color: T.inkMuted, marginBottom: "0.15rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.other.title}</div>}
                        {c.lastMessage && (
                          <div style={{ fontSize: "0.78rem", color: c.unreadCount > 0 ? T.ink : T.inkMuted, fontWeight: c.unreadCount > 0 ? 600 : 400, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {c.lastMessage.senderId === myId ? "You: " : ""}{c.lastMessage.content}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Thread pane */}
            {showPane && (
              <div style={{ background: T.white, border: `1px solid ${T.border}`, borderRadius: isMobile ? 0 : 16, height: isMobile ? undefined : "100%", display: "flex", flexDirection: "column", overflow: "hidden" }}>
                {!activeConv && !loadingThread ? (
                  <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: T.inkMuted, padding: "3rem" }}>
                    <svg width="40" height="40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} style={{ opacity: 0.3, marginBottom: "1rem" }}><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" /></svg>
                    <div style={{ fontSize: "0.9rem" }}>Select a conversation</div>
                  </div>
                ) : loadingThread ? (
                  <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: T.inkMuted, fontSize: "0.85rem" }}>Loading…</div>
                ) : activeConv && (
                  <>
                    {/* Thread header */}
                    <div style={{ padding: "0.9rem 1.25rem", borderBottom: `1px solid ${T.border}`, display: "flex", alignItems: "center", gap: "0.85rem" }}>
                      {isMobile && (
                        <button onClick={() => setShowThread(false)} style={{ background: "none", border: "none", cursor: "pointer", padding: "0.2rem", color: T.inkMuted, display: "flex", alignItems: "center" }}>
                          <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path d="M15 18l-6-6 6-6" /></svg>
                        </button>
                      )}
                      <Avatar other={activeConv.other} size={38} />
                      <div>
                        <div style={{ fontWeight: 600, fontSize: "0.92rem", color: T.ink }}>{otherName(activeConv.other)}</div>
                        {activeConv.other.title && <div style={{ fontSize: "0.72rem", color: T.inkMuted }}>{activeConv.other.title}</div>}
                      </div>
                    </div>

                    {/* Messages */}
                    <div style={{ flex: 1, overflowY: "auto", padding: "1.25rem", display: "flex", flexDirection: "column", gap: "0.65rem" }}>
                      {activeConv.messages.map(m => {
                        const isMe = m.senderId === myId;
                        return (
                          <div key={m.id} style={{ display: "flex", justifyContent: isMe ? "flex-end" : "flex-start" }}>
                            {!isMe && <Avatar other={activeConv.other} size={28} />}
                            <div style={{ maxWidth: "72%", marginLeft: isMe ? 0 : "0.5rem", marginRight: isMe ? 0 : 0 }}>
                              <div style={{ background: isMe ? T.leaf : T.cream, color: isMe ? T.white : T.ink, borderRadius: isMe ? "16px 4px 16px 16px" : "4px 16px 16px 16px", padding: "0.65rem 0.9rem", fontSize: "0.875rem", lineHeight: 1.6, wordBreak: "break-word" as const }}>
                                {m.content}
                              </div>
                              <div style={{ fontSize: "0.65rem", color: T.inkMuted, marginTop: "0.25rem", textAlign: isMe ? "right" : "left" }}>
                                {fmtTime(m.createdAt)}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                      <div ref={bottomRef} />
                    </div>

                    {/* Reply box */}
                    <div style={{ padding: "0.85rem 1.25rem", borderTop: `1px solid ${T.border}`, display: "flex", gap: "0.65rem", alignItems: "flex-end" }}>
                      <textarea
                        value={reply}
                        onChange={e => setReply(e.target.value)}
                        onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendReply(); } }}
                        placeholder="Write a message… (Enter to send)"
                        rows={2}
                        style={{ flex: 1, padding: "0.6rem 0.85rem", border: `1.5px solid ${T.border}`, borderRadius: 12, fontSize: "0.875rem", fontFamily: T.ff, outline: "none", resize: "none", lineHeight: 1.5 }}
                      />
                      <button onClick={sendReply} disabled={sending || !reply.trim()}
                        style={{ padding: "0.6rem 1.1rem", background: T.leaf, border: "none", borderRadius: 12, cursor: (sending || !reply.trim()) ? "not-allowed" : "pointer", opacity: (sending || !reply.trim()) ? 0.5 : 1, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="#fff" strokeWidth={2.5} style={{ transform: "rotate(45deg)" }}><path d="M12 19l9-7-9-7v5l-8 2 8 2v5z" /></svg>
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}

export default function MessagesPage() {
  return (
    <Suspense>
      <MessagesContent />
    </Suspense>
  );
}
