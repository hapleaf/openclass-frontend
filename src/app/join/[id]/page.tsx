"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Room,
  RoomEvent,
  Track,
  type RemoteTrack,
  type RemoteParticipant,
  type TrackPublication,
  type LocalVideoTrack,
} from "livekit-client";
import Header from "@/components/common/HeadFoot/header";
import { getPublicSession, type PublicSessionData } from "@/lib/session";
import { apiFetch } from "@/lib/api";

// ── Design tokens ─────────────────────────────────────────────────────────────
const T = {
  ink: "#0f1410",
  inkSoft: "#3a4140",
  inkMuted: "#6b7a72",
  leaf: "#1d6b3c",
  leafLight: "#d4ead9",
  leafMid: "#4a9e68",
  sun: "#e8a020",
  sky: "#1a4f7a",
  clay: "#c45b2a",
  cream: "#faf7f2",
  white: "#ffffff",
  border: "#e2ded6",
  radius: 16,
  radiusSm: 10,
};

// ── Types ──────────────────────────────────────────────────────────────────────
type Phase = "loading" | "passcode" | "device-check" | "room" | "error";

interface TokenResponse {
  token: string;
  lkUrl: string;
  roomName: string;
  isOrganizer: boolean;
  isRecording: boolean;
  sessionInfo: {
    id: number;
    title: string;
    category: string | null;
    type: string;
    duration: number;
    scheduledAt: string;
    userId: number;
  };
  registeredCount: number;
  onlineCount: number;
}

interface ChatMessage {
  id: string;
  senderName: string;
  senderInitials: string;
  senderColor: string;
  text: string;
  time: string;
  isMine: boolean;
}

const AVATAR_COLORS = [T.leaf, T.sky, "#8b5cf6", T.clay, T.sun, "#4a9e68", T.inkMuted];
function colorFor(str: string) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) & 0xffff;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}
function getInitials(name: string) {
  return name
    .split(" ")
    .map((w) => w[0] || "")
    .join("")
    .toUpperCase()
    .slice(0, 2);
}
function timeLabel() {
  return new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}
function fmtDuration(totalSec: number): string {
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}
function makeParticipant(p: { identity: string; name?: string | null }) {
  const name = p.name || p.identity || "Guest";
  return { identity: p.identity, name, initials: getInitials(name), color: colorFor(name) };
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function JoinPage() {
  const params = useParams();
  const router = useRouter();
  const sessionId = Number(params.id);

  const [phase, setPhase] = useState<Phase>("loading");
  const [errorMsg, setErrorMsg] = useState("");
  const [session, setSession] = useState<PublicSessionData | null>(null);
  const [tokenData, setTokenData] = useState<TokenResponse | null>(null);

  // passcode phase
  const [passcodeInput, setPasscodeInput] = useState("");
  const [passcodeError, setPasscodeError] = useState("");

  // device check phase
  const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([]);
  const [audioDevices, setAudioDevices] = useState<MediaDeviceInfo[]>([]);
  const [audioOutputDevices, setAudioOutputDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedVideoId, setSelectedVideoId] = useState("");
  const [selectedAudioId, setSelectedAudioId] = useState("");
  const [selectedOutputId, setSelectedOutputId] = useState("");
  const [micLevel, setMicLevel] = useState(0);
  const devicePreviewRef = useRef<HTMLVideoElement>(null);
  const deviceStreamRef = useRef<MediaStream | null>(null);
  const micAnalyserRef = useRef<AnalyserNode | null>(null);
  const micAnimRef = useRef<number>(0);

  // room phase
  const [room] = useState(() => new Room({ adaptiveStream: true, dynacast: true }));
  const [connected, setConnected] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingLoading, setRecordingLoading] = useState(false);
  const [showRecordTip, setShowRecordTip] = useState(false);
  const [roomToast, setRoomToast] = useState<string | null>(null);
  const [linkCopied, setLinkCopied] = useState(false);
  const [micMuted, setMicMuted] = useState(false);
  const [camOff, setCamOff] = useState(false);
  const [screenSharing, setScreenSharing] = useState(false);
  const [onlineCount, setOnlineCount] = useState(0);
  const [registeredCount, setRegisteredCount] = useState(0);
  const [activeTab, setActiveTab] = useState<"about" | "teacher" | "rate">("about");
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [ratingValue, setRatingValue] = useState(0);
  const [ratingHover, setRatingHover] = useState(0);
  const [ratingComment, setRatingComment] = useState("");
  const [ratingSubmitted, setRatingSubmitted] = useState(false);
  const [hasRemoteVideo, setHasRemoteVideo] = useState(false);
  const [showEndConfirm, setShowEndConfirm] = useState(false);
  const [endingSession, setEndingSession] = useState(false);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const pendingVideoTrackRef = useRef<RemoteTrack | null>(null);
  const pendingLocalVideoTrackRef = useRef<LocalVideoTrack | null>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const chatFeedRef = useRef<HTMLDivElement>(null);

  // ── Screen share + PiP ───────────────────────────────────────────────────
  const [remoteScreenActive, setRemoteScreenActive] = useState(false);
  const [pipVisible, setPipVisible] = useState(true);
  const [pipPos, setPipPos] = useState({ x: 16, y: 16 });
  const remoteScreenRef = useRef<HTMLVideoElement>(null);
  const pipVideoRef = useRef<HTMLVideoElement>(null);
  const orgPipVideoRef = useRef<HTMLVideoElement>(null);
  const pendingScreenTrackRef = useRef<RemoteTrack | null>(null);
  const pendingPipTrackRef = useRef<RemoteTrack | null>(null);
  const videoStageRef = useRef<HTMLDivElement>(null);
  const pipDragging = useRef(false);
  const pipDragOrigin = useRef({ mx: 0, my: 0, px: 0, py: 0 });
  const hlsRef = useRef<{ destroy: () => void } | null>(null);
  const textEncoder = useRef(new TextEncoder());
  const textDecoder = useRef(new TextDecoder());

  // timer
  const [elapsedSec, setElapsedSec] = useState(0);
  const sessionStartRef = useRef<number>(0);

  // participants
  interface RoomParticipant { identity: string; name: string; initials: string; color: string; }
  const [participants, setParticipants] = useState<RoomParticipant[]>([]);

  // right-panel tabs
  const [sideTab, setSideTab] = useState<"chat" | "people" | "poll">("chat");

  // poll
  interface Poll { question: string; options: string[]; votes: number[]; }
  const [poll, setPoll] = useState<Poll | null>(null);
  const [myVote, setMyVote] = useState<number | null>(null);
  const [draftQuestion, setDraftQuestion] = useState("");
  const [draftOptions, setDraftOptions] = useState(["", ""]);
  const [showPollCreate, setShowPollCreate] = useState(false);
  const [pollBadge, setPollBadge] = useState(false);

  // ── Device-check diagnostics ──────────────────────────────────────────────
  const [speakerTestState, setSpeakerTestState] = useState<"idle" | "playing" | "ok">("idle");
  const [connTestState, setConnTestState] = useState<"idle" | "checking" | "ok" | "error">("idle");
  const joiningRef = useRef(false);
  const [isMobile, setIsMobile] = useState(false);

  // ── Who am I? ──────────────────────────────────────────────────────────────
  const myUserId = useRef<number | null>(null);
  const myName = useRef<string>("You");
  useEffect(() => {
    try {
      const p = JSON.parse(localStorage.getItem("oc_profile_cache") || "{}");
      myUserId.current = p.id ?? null;
      myName.current = [p.firstName, p.lastName].filter(Boolean).join(" ") || p.name || "You";
    } catch {}
  }, []);

  // ── Step 1: load session ────────────────────────────────────────────────────
  useEffect(() => {
    if (!sessionId) return;
    getPublicSession(sessionId)
      .then((s) => {
        setSession(s);
        const uid = myUserId.current;
        const isOrg = uid !== null && s.user.id === uid;
        if (!isOrg && s.passcode) {
          setPhase("passcode");
        } else {
          fetchToken(s.passcode ?? undefined, isOrg);
        }
      })
      .catch(() => {
        setErrorMsg("Session not found.");
        setPhase("error");
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  const fetchToken = useCallback(
    async (passcode?: string, _isOrg?: boolean) => {
      const token = localStorage.getItem("token");
      if (!token) {
        router.push(`/login?redirect=/join/${sessionId}`);
        return;
      }
      try {
        const url = `${process.env.NEXT_PUBLIC_API_URL}/live/${sessionId}/token${passcode ? `?passcode=${encodeURIComponent(passcode)}` : ""}`;
        const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
        if (res.status === 403) {
          setPasscodeError("Incorrect passcode. Please try again.");
          setPhase("passcode");
          return;
        }
        if (!res.ok) throw new Error("Failed to get token");
        const data: TokenResponse = await res.json();
        setTokenData(data);
        setOnlineCount(data.onlineCount);
        setRegisteredCount(data.registeredCount);
        if (data.isRecording) setIsRecording(true);
        setPhase("device-check");
      } catch {
        setErrorMsg("Could not connect to session. Please try again.");
        setPhase("error");
      }
    },
    [sessionId, router],
  );

  // ── Device check setup ─────────────────────────────────────────────────────
  useEffect(() => {
    if (phase !== "device-check") return;
    const isOrg = tokenData?.isOrganizer ?? false;

    // Always enumerate for speaker picker
    navigator.mediaDevices
      .enumerateDevices()
      .then((devices) => {
        setVideoDevices(devices.filter((d) => d.kind === "videoinput"));
        setAudioDevices(devices.filter((d) => d.kind === "audioinput"));
        setAudioOutputDevices(devices.filter((d) => d.kind === "audiooutput"));
      })
      .catch(() => {});

    // Only organiser needs camera + mic preview
    if (!isOrg) return;

    navigator.mediaDevices
      .getUserMedia({ video: true, audio: true })
      .then((stream) => {
        deviceStreamRef.current = stream;
        if (devicePreviewRef.current) {
          devicePreviewRef.current.srcObject = stream;
        }
        const ctx = new AudioContext();
        const src = ctx.createMediaStreamSource(stream);
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 256;
        src.connect(analyser);
        micAnalyserRef.current = analyser;
        const buf = new Uint8Array(analyser.frequencyBinCount);
        const tick = () => {
          analyser.getByteFrequencyData(buf);
          const avg = buf.reduce((a, b) => a + b, 0) / buf.length;
          setMicLevel(Math.min(100, Math.round((avg / 128) * 100)));
          micAnimRef.current = requestAnimationFrame(tick);
        };
        micAnimRef.current = requestAnimationFrame(tick);
      })
      .catch(() => {});

    return () => {
      cancelAnimationFrame(micAnimRef.current);
      deviceStreamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, [phase, tokenData?.isOrganizer]);

  // ── Join the LiveKit room ──────────────────────────────────────────────────
  const joinRoom = useCallback(async () => {
    if (!tokenData) return;
    if (joiningRef.current) { console.warn("[LK] joinRoom called twice — ignored"); return; }
    joiningRef.current = true;

    console.log("[LK] joinRoom START | lkUrl=", tokenData.lkUrl, "| roomName=", tokenData.roomName, "| isOrg=", tokenData.isOrganizer, "| room.state=", room.state);

    cancelAnimationFrame(micAnimRef.current);
    deviceStreamRef.current?.getTracks().forEach((t) => t.stop());

    const { token, lkUrl, isOrganizer } = tokenData;

    // Record join
    apiFetch(`/live/${sessionId}/join`, { method: "POST" }).catch(() => {});

    // Setup event listeners before connecting
    room.on(RoomEvent.Connected, () => {
      console.log("[LK] Connected event fired");
      setConnected(true);
      if (isOrganizer) {
        room.localParticipant
          .enableCameraAndMicrophone()
          .then(() => {
            const camPub = room.localParticipant.getTrackPublication(Track.Source.Camera);
            const camTrack = camPub?.videoTrack;
            if (!camTrack) {
              console.warn("[LK] enableCameraAndMicrophone resolved but no camera track found");
              return;
            }
            console.log("[LK] Camera track ready | localVideoRef=", localVideoRef.current);
            if (localVideoRef.current) {
              camTrack.attach(localVideoRef.current);
            } else {
              // Room phase DOM not committed yet — attach once it mounts
              pendingLocalVideoTrackRef.current = camTrack;
            }
          })
          .catch((err) => {
            console.error("[LK] enableCameraAndMicrophone FAILED:", err);
          });
      }
    });

    room.on(RoomEvent.Disconnected, () => {
      console.log("[LK] Disconnected event fired");
      setConnected(false);
    });

    room.on(RoomEvent.Reconnecting, () => console.log("[LK] Reconnecting…"));
    room.on(RoomEvent.Reconnected, () => console.log("[LK] Reconnected"));

    room.on(
      RoomEvent.TrackPublished,
      (_pub: TrackPublication, participant: RemoteParticipant) => {
        console.log("[LK] TrackPublished (before sub) | kind=", _pub.kind, "| from=", participant.identity);
      },
    );

    room.on(
      RoomEvent.TrackSubscribed,
      (track: RemoteTrack, _pub: TrackPublication, participant: RemoteParticipant) => {
        console.log("[LK] TrackSubscribed | kind=", track.kind, "| source=", track.source, "| from=", participant.identity);
        if (track.kind === Track.Kind.Video) {
          if (track.source === Track.Source.ScreenShare) {
            // Screen share → main video slot
            setRemoteScreenActive(true);
            setPipVisible(true);
            if (remoteScreenRef.current) {
              track.attach(remoteScreenRef.current);
            } else {
              pendingScreenTrackRef.current = track;
            }
          } else {
            // Camera → main video AND pip circle
            if (remoteVideoRef.current) {
              track.attach(remoteVideoRef.current);
              setHasRemoteVideo(true);
            } else {
              pendingVideoTrackRef.current = track;
            }
            if (pipVideoRef.current) {
              track.attach(pipVideoRef.current);
            } else {
              pendingPipTrackRef.current = track;
            }
          }
        } else if (track.kind === Track.Kind.Audio) {
          track.attach();
        }
      },
    );

    room.on(RoomEvent.TrackUnsubscribed, (track: RemoteTrack) => {
      if (track.source === Track.Source.ScreenShare) {
        setRemoteScreenActive(false);
      }
    });

    room.on(RoomEvent.DataReceived, (payload: Uint8Array, participant?: RemoteParticipant) => {
      console.log("[LK] DataReceived | from=", participant?.identity);
      try {
        const msg = JSON.parse(textDecoder.current.decode(payload));
        if (msg.type === "chat") {
          const senderName: string = msg.name || "Guest";
          setChatMessages((prev) => [
            ...prev,
            {
              id: `${Date.now()}-${Math.random()}`,
              senderName,
              senderInitials: getInitials(senderName),
              senderColor: colorFor(senderName),
              text: msg.text,
              time: timeLabel(),
              isMine: false,
            },
          ]);
        } else if (msg.type === "poll_start") {
          setPoll({ question: msg.question, options: msg.options, votes: new Array(msg.options.length).fill(0) });
          setMyVote(null);
          setSideTab("poll");
          setPollBadge(true);
        } else if (msg.type === "poll_vote") {
          setPoll((prev) => {
            if (!prev) return prev;
            const votes = [...prev.votes];
            votes[msg.optionIndex] = (votes[msg.optionIndex] || 0) + 1;
            return { ...prev, votes };
          });
        }
      } catch {}
    });

    room.on(RoomEvent.ParticipantConnected, (p) => {
      console.log("[LK] ParticipantConnected | identity=", p.identity);
      setOnlineCount((n) => n + 1);
      setParticipants((prev) => [...prev.filter((x) => x.identity !== p.identity), makeParticipant(p)]);
    });
    room.on(RoomEvent.ParticipantDisconnected, (p) => {
      console.log("[LK] ParticipantDisconnected | identity=", p.identity);
      setOnlineCount((n) => Math.max(0, n - 1));
      setParticipants((prev) => prev.filter((x) => x.identity !== p.identity));
    });

    try {
      console.log("[LK] Calling room.connect…");
      await room.connect(lkUrl, token, { autoSubscribe: true });
      console.log(
        "[LK] room.connect resolved | state=", room.state,
        "| remoteParticipants=", room.remoteParticipants.size,
        "| identities=", Array.from(room.remoteParticipants.values()).map((p) => p.identity),
      );
      // seed participant list from already-present remote participants
      const existing = Array.from(room.remoteParticipants.values()).map(makeParticipant);
      setParticipants(existing);
      setPhase("room");
    } catch (err) {
      console.error("[LK] room.connect FAILED:", err);
      joiningRef.current = false;
      setErrorMsg("Could not connect to the live room. Is the LiveKit server running?");
      setPhase("error");
    }
  }, [tokenData, room, sessionId]);

  // ── When phase → "room", attach any track that arrived before the video element mounted ──
  // useEffect fires after React commits the DOM, so refs are guaranteed non-null here.
  useEffect(() => {
    if (phase !== "room") return;

    if (tokenData?.isOrganizer) {
      // Organizer: attach local camera if enableCameraAndMicrophone() beat the DOM commit
      if (pendingLocalVideoTrackRef.current && localVideoRef.current) {
        console.log("[LK] Attaching pending local video track");
        pendingLocalVideoTrackRef.current.attach(localVideoRef.current);
        pendingLocalVideoTrackRef.current = null;
      }
      return;
    }

    // Attendee: attach remote video
    const el = remoteVideoRef.current;
    console.log("[LK] phase→room effect | el=", el, "| pendingTrack=", pendingVideoTrackRef.current, "| remoteParticipants=", room.remoteParticipants.size);

    if (!el) return;

    // Fast path: TrackSubscribed fired while DOM wasn't ready — track stored in ref
    if (pendingVideoTrackRef.current) {
      console.log("[LK] Attaching pending video track");
      pendingVideoTrackRef.current.attach(el);
      setHasRemoteVideo(true);
      if (pipVideoRef.current) {
        pendingVideoTrackRef.current.attach(pipVideoRef.current);
      }
      pendingVideoTrackRef.current = null;
    }
    if (pendingScreenTrackRef.current && remoteScreenRef.current) {
      pendingScreenTrackRef.current.attach(remoteScreenRef.current);
      setRemoteScreenActive(true);
      setPipVisible(true);
      pendingScreenTrackRef.current = null;
    }
    if (pendingPipTrackRef.current && pipVideoRef.current) {
      pendingPipTrackRef.current.attach(pipVideoRef.current);
      pendingPipTrackRef.current = null;
    }
    if (pendingVideoTrackRef.current === null && !pendingScreenTrackRef.current) return;

    // Fallback: scan all remote publications (covers race where sub happened before connect resolved)
    for (const [, participant] of room.remoteParticipants) {
      for (const [, pub] of participant.trackPublications) {
        const track = pub.track;
        console.log("[LK] scan pub | kind=", pub.kind, "| source=", pub.source, "| from=", participant.identity);
        if (track && track.kind === Track.Kind.Video) {
          if (pub.source === Track.Source.ScreenShare) {
            if (remoteScreenRef.current) { track.attach(remoteScreenRef.current); setRemoteScreenActive(true); setPipVisible(true); }
          } else {
            track.attach(el); setHasRemoteVideo(true);
            if (pipVideoRef.current) track.attach(pipVideoRef.current);
          }
        } else if (track && track.kind === Track.Kind.Audio) {
          track.attach();
        }
      }
    }
  }, [phase, room, tokenData?.isOrganizer]);

  // ── HLS for audience (if hlsUrl provided) ─────────────────────────────────
  useEffect(() => {
    return () => {
      hlsRef.current?.destroy();
    };
  }, []);

  // ── Organizer: attach camera to PiP video element while screen sharing ─────
  useEffect(() => {
    if (!screenSharing || !orgPipVideoRef.current) return;
    const camPub = room.localParticipant.getTrackPublication(Track.Source.Camera);
    const track = camPub?.videoTrack;
    if (track && orgPipVideoRef.current) track.attach(orgPipVideoRef.current);
    return () => {
      if (track && orgPipVideoRef.current) track.detach(orgPipVideoRef.current);
    };
  }, [screenSharing, room]);

  // ── PiP: set initial top-right position when entering room ───────────────
  useEffect(() => {
    if (phase !== "room" || !videoStageRef.current) return;
    const rect = videoStageRef.current.getBoundingClientRect();
    if (rect.width > 0) setPipPos({ x: rect.width - 108 - 16, y: 16 });
  }, [phase]);

  // ── PiP: flush pending camera track when screen share activates ───────────
  useEffect(() => {
    if (!remoteScreenActive || !pipVideoRef.current) return;
    if (pendingPipTrackRef.current) {
      pendingPipTrackRef.current.attach(pipVideoRef.current);
      pendingPipTrackRef.current = null;
    }
  }, [remoteScreenActive]);

  // ── PiP drag (global mouse handlers) ──────────────────────────────────────
  useEffect(() => {
    function onMove(e: MouseEvent) {
      if (!pipDragging.current || !videoStageRef.current) return;
      const rect = videoStageRef.current.getBoundingClientRect();
      const pipSize = 108;
      const x = Math.max(0, Math.min(rect.width  - pipSize, e.clientX - rect.left - pipDragOrigin.current.mx));
      const y = Math.max(0, Math.min(rect.height - pipSize, e.clientY - rect.top  - pipDragOrigin.current.my));
      setPipPos({ x, y });
    }
    function onUp() { pipDragging.current = false; }
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => { window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp); };
  }, []);

  // ── Poll online count every 15 s ───────────────────────────────────────────
  useEffect(() => {
    if (phase !== "room") return;
    const iv = setInterval(async () => {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/live/${sessionId}/status`);
        if (res.ok) {
          const d = await res.json();
          setOnlineCount(d.onlineCount);
          setRegisteredCount(d.registeredCount);
          if (typeof d.isRecording === "boolean") setIsRecording(d.isRecording);
        }
      } catch {}
    }, 15_000);
    return () => clearInterval(iv);
  }, [phase, sessionId]);

  // ── Record leave on tab close ─────────────────────────────────────────────
  useEffect(() => {
    if (phase !== "room") return;
    const leave = () => {
      apiFetch(`/live/${sessionId}/leave`, { method: "POST" }).catch(() => {});
      room.disconnect();
    };
    window.addEventListener("beforeunload", leave);
    // Only remove the listener on cleanup — do NOT call leave() here.
    // React 18 Strict Mode runs cleanup + re-mount in development, so calling
    // leave() in cleanup would disconnect the room immediately after joining.
    return () => window.removeEventListener("beforeunload", leave);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, sessionId]);

  // ── Session timer ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (phase !== "room") return;
    sessionStartRef.current = Date.now();
    setElapsedSec(0);
    const iv = setInterval(() => {
      setElapsedSec(Math.floor((Date.now() - sessionStartRef.current) / 1000));
    }, 1000);
    return () => clearInterval(iv);
  }, [phase]);

  // ── Auto-scroll chat ───────────────────────────────────────────────────────
  useEffect(() => {
    if (chatFeedRef.current) {
      chatFeedRef.current.scrollTop = chatFeedRef.current.scrollHeight;
    }
  }, [chatMessages]);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth <= 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // Show recording tip when organizer first connects — only if not already recording
  useEffect(() => {
    if (phase !== "room" || !connected || !tokenData?.isOrganizer) return;
    if (isRecording) return;
    setShowRecordTip(true);
  }, [connected, phase, tokenData?.isOrganizer, isRecording]);

  // ── Controls ───────────────────────────────────────────────────────────────
  const toggleMic = useCallback(() => {
    const enabled = !micMuted;
    room.localParticipant.setMicrophoneEnabled(!enabled);
    setMicMuted(enabled);
  }, [micMuted, room]);

  const toggleCam = useCallback(() => {
    const enabled = !camOff;
    room.localParticipant.setCameraEnabled(!enabled);
    setCamOff(enabled);
  }, [camOff, room]);

  const toggleScreen = useCallback(async () => {
    try {
      await room.localParticipant.setScreenShareEnabled(!screenSharing);
      setScreenSharing((s) => !s);
    } catch {}
  }, [screenSharing, room]);

  const leaveRoom = useCallback(() => {
    apiFetch(`/live/${sessionId}/leave`, { method: "POST" }).catch(() => {});
    room.disconnect();
    router.push(`/session/${sessionId}`);
  }, [room, sessionId, router]);

  const doEndSession = useCallback(async () => {
    setEndingSession(true);
    await apiFetch(`/live/${sessionId}/end`, { method: "POST" }).catch(() => {});
    room.disconnect();
    router.push(`/session/${sessionId}${isRecording ? "?rec=1" : ""}`);
  }, [room, sessionId, router, isRecording]);

  const startRecording = useCallback(async () => {
    setRecordingLoading(true);
    setShowRecordTip(false);
    try {
      await apiFetch(`/live/${sessionId}/start-recording`, { method: "POST" });
      setIsRecording(true);
      setRoomToast("🔴 Recording started");
      setTimeout(() => setRoomToast(null), 3500);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      alert(`Could not start recording: ${msg}`);
    } finally {
      setRecordingLoading(false);
    }
  }, [sessionId]);

  const sendChat = useCallback(() => {
    const text = chatInput.trim();
    if (!text) return;
    const name = myName.current;
    const payload = JSON.stringify({ type: "chat", name, text });
    room.localParticipant.publishData(textEncoder.current.encode(payload), { reliable: true });
    setChatMessages((prev) => [
      ...prev,
      {
        id: `${Date.now()}-mine`,
        senderName: `${name} (You)`,
        senderInitials: getInitials(name),
        senderColor: T.sky,
        text,
        time: timeLabel(),
        isMine: true,
      },
    ]);
    setChatInput("");
  }, [chatInput, room]);

  const sendReaction = useCallback(
    (emoji: string) => {
      const name = myName.current;
      const payload = JSON.stringify({ type: "chat", name, text: emoji });
      room.localParticipant.publishData(textEncoder.current.encode(payload), { reliable: true });
      setChatMessages((prev) => [
        ...prev,
        {
          id: `${Date.now()}-react`,
          senderName: `${name} (You)`,
          senderInitials: getInitials(name),
          senderColor: T.sky,
          text: emoji,
          time: timeLabel(),
          isMine: true,
        },
      ]);
    },
    [room],
  );

  // ── Poll controls ─────────────────────────────────────────────────────────
  const launchPoll = useCallback(() => {
    const question = draftQuestion.trim();
    const options = draftOptions.map((o) => o.trim()).filter(Boolean);
    if (!question || options.length < 2) return;
    const payload = JSON.stringify({ type: "poll_start", question, options });
    room.localParticipant.publishData(textEncoder.current.encode(payload), { reliable: true });
    setPoll({ question, options, votes: new Array(options.length).fill(0) });
    setMyVote(null);
    setShowPollCreate(false);
    setDraftQuestion("");
    setDraftOptions(["", ""]);
  }, [draftQuestion, draftOptions, room]);

  const castVote = useCallback((optionIndex: number) => {
    if (myVote !== null) return;
    const payload = JSON.stringify({ type: "poll_vote", optionIndex });
    room.localParticipant.publishData(textEncoder.current.encode(payload), { reliable: true });
    setMyVote(optionIndex);
    setPoll((prev) => {
      if (!prev) return prev;
      const votes = [...prev.votes];
      votes[optionIndex] = (votes[optionIndex] || 0) + 1;
      return { ...prev, votes };
    });
  }, [myVote, room]);

  // ── Device-check test callbacks ───────────────────────────────────────────
  const testSpeaker = useCallback(() => {
    setSpeakerTestState("playing");
    try {
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = "sine";
      osc.frequency.value = 880;
      gain.gain.setValueAtTime(0.4, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.2);
      osc.start();
      osc.stop(ctx.currentTime + 1.2);
      osc.onended = () => { ctx.close(); setSpeakerTestState("ok"); };
    } catch {
      setSpeakerTestState("ok");
    }
  }, []);

  const testConnection = useCallback(async () => {
    if (!tokenData?.lkUrl) return;
    setConnTestState("checking");
    try {
      // Convert ws(s):// → http(s):// and do a no-cors HEAD request.
      // fetch() only throws on a network failure (server not running / unreachable).
      // A CORS rejection, 404, or any HTTP-level response all mean the server IS up.
      const httpUrl = tokenData.lkUrl
        .replace(/^wss:\/\//, "https://")
        .replace(/^ws:\/\//, "http://");
      await fetch(httpUrl, {
        method: "HEAD",
        mode: "no-cors",
        signal: AbortSignal.timeout(4000),
      });
      setConnTestState("ok");
    } catch {
      setConnTestState("error");
    }
  }, [tokenData?.lkUrl]);

  // ── Helpers ────────────────────────────────────────────────────────────────
  const teacherName =
    session
      ? [session.user.firstName, session.user.lastName].filter(Boolean).join(" ") ||
        session.user.name ||
        "Instructor"
      : "Instructor";
  const teacherInitials = getInitials(teacherName);

  // ── RENDER ─────────────────────────────────────────────────────────────────

  if (phase === "loading") {
    return (
      <>
        <Header activeLink="live" />
        <div style={{ paddingTop: isMobile ? 73 : 80, display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", background: T.cream }}>
          <div style={{ textAlign: "center" }}>
            <div style={{ width: 48, height: 48, borderRadius: "50%", border: `4px solid ${T.leafLight}`, borderTopColor: T.leaf, animation: "spin 0.8s linear infinite", margin: "0 auto 1rem" }} />
            <p style={{ color: T.inkMuted, fontFamily: "var(--font-dm-sans), sans-serif" }}>Loading session…</p>
          </div>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      </>
    );
  }

  if (phase === "error") {
    return (
      <>
        <Header activeLink="live" />
        <div style={{ paddingTop: isMobile ? 73 : 80, display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", background: T.cream }}>
          <div style={{ textAlign: "center", maxWidth: 420, padding: "2rem" }}>
            <div style={{ fontSize: "2.5rem", marginBottom: "1rem" }}>⚠️</div>
            <h2 style={{ fontFamily: "var(--font-fraunces), Georgia, serif", fontSize: "1.4rem", marginBottom: "0.75rem", color: T.ink }}>
              {errorMsg || "Something went wrong"}
            </h2>
            <button
              onClick={() => router.back()}
              style={{ background: T.leaf, color: T.white, border: "none", borderRadius: 100, padding: "0.6rem 1.5rem", fontFamily: "var(--font-dm-sans), sans-serif", fontWeight: 600, cursor: "pointer" }}
            >
              ← Go back
            </button>
          </div>
        </div>
      </>
    );
  }

  if (phase === "passcode") {
    return (
      <>
        <Header activeLink="live" />
        <div style={{ paddingTop: isMobile ? 73 : 80, display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", background: T.cream, padding: isMobile ? `${73}px 1rem 2rem` : undefined }}>
          <div style={{ background: T.white, borderRadius: T.radius, border: `1px solid ${T.border}`, padding: "2.5rem", width: "100%", maxWidth: 420, boxShadow: "0 8px 32px rgba(15,20,16,0.08)" }}>
            <div style={{ textAlign: "center", marginBottom: "2rem" }}>
              <div style={{ width: 56, height: 56, borderRadius: "50%", background: T.leafLight, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 1rem", fontSize: "1.5rem" }}>
                🔒
              </div>
              <h2 style={{ fontFamily: "var(--font-fraunces), Georgia, serif", fontSize: "1.4rem", color: T.ink, marginBottom: "0.5rem" }}>
                Passcode Required
              </h2>
              <p style={{ color: T.inkMuted, fontSize: "0.875rem", fontFamily: "var(--font-dm-sans), sans-serif" }}>
                {session?.title || "This session"} is passcode-protected.
              </p>
            </div>
            <div style={{ marginBottom: "1rem" }}>
              <input
                type="password"
                value={passcodeInput}
                onChange={(e) => { setPasscodeInput(e.target.value); setPasscodeError(""); }}
                onKeyDown={(e) => { if (e.key === "Enter") fetchToken(passcodeInput); }}
                placeholder="Enter session passcode"
                style={{
                  width: "100%", padding: "0.75rem 1rem", border: `1.5px solid ${passcodeError ? "#c0392b" : T.border}`,
                  borderRadius: T.radiusSm, fontFamily: "var(--font-dm-sans), sans-serif", fontSize: "0.9rem",
                  outline: "none", color: T.ink, boxSizing: "border-box",
                }}
                autoFocus
              />
              {passcodeError && (
                <p style={{ color: "#c0392b", fontSize: "0.78rem", marginTop: "0.4rem", fontFamily: "var(--font-dm-sans), sans-serif" }}>{passcodeError}</p>
              )}
            </div>
            <button
              onClick={() => fetchToken(passcodeInput)}
              style={{ width: "100%", background: T.leaf, color: T.white, border: "none", borderRadius: T.radiusSm, padding: "0.75rem", fontFamily: "var(--font-dm-sans), sans-serif", fontWeight: 600, fontSize: "0.9rem", cursor: "pointer" }}
            >
              Continue →
            </button>
          </div>
        </div>
      </>
    );
  }

  if (phase === "device-check") {
    const isOrg = tokenData?.isOrganizer ?? false;
    const sessionType = session?.type ?? tokenData?.sessionInfo.type ?? "liveclass";
    return (
      <>
        <Header activeLink="live" />
        <div style={{ minHeight: "100vh", background: T.cream, display: "flex", alignItems: "center", justifyContent: "center", padding: isMobile ? "73px 1rem 2rem" : "80px 1rem 2rem" }}>
          <div style={{ background: T.white, borderRadius: T.radius, border: `1px solid ${T.border}`, padding: "2.5rem", width: "100%", maxWidth: 560, boxShadow: "0 8px 32px rgba(15,20,16,0.08)" }}>
            <h2 style={{ fontFamily: "var(--font-fraunces), Georgia, serif", fontSize: "1.5rem", color: T.ink, marginBottom: "0.4rem" }}>
              {isOrg ? "Ready to host?" : "Almost there!"}
            </h2>
            <p style={{ color: T.inkMuted, fontSize: "0.875rem", fontFamily: "var(--font-dm-sans), sans-serif", marginBottom: "1.75rem" }}>
              {session?.title || "Session"} · {isOrg ? "You're hosting" : sessionType === "webinar" ? "Joining as viewer" : "Joining as audience"}
            </p>

            {/* ── AUDIENCE: speaker-only check ── */}
            {!isOrg && (
              <>
                <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", padding: "0.9rem 1rem", borderRadius: T.radiusSm, background: T.leafLight, border: `1px solid rgba(29,107,60,0.2)`, marginBottom: "1.5rem" }}>
                  <span style={{ fontSize: "1.3rem" }}>{sessionType === "webinar" ? "📺" : "🎧"}</span>
                  <div style={{ fontSize: "0.82rem", color: "#1a4a2e", fontFamily: "var(--font-dm-sans), sans-serif" }}>
                    <strong>{sessionType === "webinar" ? "Webinar mode" : "Audience mode"}</strong> — you'll watch and listen. Make sure your <strong>speaker</strong> is working.
                  </div>
                </div>

                {/* Speaker selection */}
                <div style={{ marginBottom: "1.5rem" }}>
                  <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: T.inkSoft, marginBottom: "0.5rem", fontFamily: "var(--font-dm-sans), sans-serif" }}>
                    🔊 Speaker / Headphones
                  </label>
                  {audioOutputDevices.length > 0 ? (
                    <select
                      value={selectedOutputId}
                      onChange={(e) => setSelectedOutputId(e.target.value)}
                      style={{ width: "100%", padding: "0.6rem 0.75rem", border: `1.5px solid ${T.border}`, borderRadius: T.radiusSm, fontFamily: "var(--font-dm-sans), sans-serif", fontSize: "0.85rem", color: T.ink, outline: "none", background: T.white }}
                    >
                      {audioOutputDevices.map((d) => <option key={d.deviceId} value={d.deviceId}>{d.label || `Speaker ${d.deviceId.slice(0, 8)}`}</option>)}
                    </select>
                  ) : (
                    <div style={{ fontSize: "0.8rem", color: T.inkMuted, fontFamily: "var(--font-dm-sans), sans-serif", padding: "0.5rem 0" }}>
                      Default system speaker will be used.
                    </div>
                  )}
                </div>

                {/* ── Quick checks ── */}
                <div style={{ marginBottom: "1.5rem", display: "flex", flexDirection: "column" as const, gap: "0.6rem" }}>
                  <div style={{ fontSize: "0.8rem", fontWeight: 600, color: T.inkSoft, fontFamily: "var(--font-dm-sans), sans-serif", marginBottom: "0.15rem" }}>Quick checks</div>

                  {/* Speaker test */}
                  <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                    <button
                      onClick={testSpeaker}
                      disabled={speakerTestState === "playing"}
                      style={{ padding: "0.4rem 0.9rem", borderRadius: 100, border: `1.5px solid ${speakerTestState === "ok" ? T.leaf : T.border}`, background: speakerTestState === "ok" ? T.leafLight : T.white, color: speakerTestState === "ok" ? T.leaf : T.inkSoft, fontFamily: "var(--font-dm-sans), sans-serif", fontSize: "0.8rem", fontWeight: 600, cursor: speakerTestState === "playing" ? "default" : "pointer", transition: "all 0.2s" }}
                    >
                      {speakerTestState === "playing" ? "♪ Playing…" : speakerTestState === "ok" ? "✓ Speaker OK" : "🔊 Test Speaker"}
                    </button>
                    {speakerTestState === "ok" && <span style={{ fontSize: "0.75rem", color: T.leaf, fontFamily: "var(--font-dm-sans), sans-serif" }}>Did you hear a tone?</span>}
                  </div>

                  {/* Connection test */}
                  <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                    <button
                      onClick={testConnection}
                      disabled={connTestState === "checking"}
                      style={{ padding: "0.4rem 0.9rem", borderRadius: 100, border: `1.5px solid ${connTestState === "ok" ? T.leaf : connTestState === "error" ? "#c0392b" : T.border}`, background: connTestState === "ok" ? T.leafLight : connTestState === "error" ? "#fdecea" : T.white, color: connTestState === "ok" ? T.leaf : connTestState === "error" ? "#c0392b" : T.inkSoft, fontFamily: "var(--font-dm-sans), sans-serif", fontSize: "0.8rem", fontWeight: 600, cursor: connTestState === "checking" ? "default" : "pointer", transition: "all 0.2s" }}
                    >
                      {connTestState === "checking" ? "Checking…" : connTestState === "ok" ? "✓ Server reachable" : connTestState === "error" ? "✗ Can't reach server" : "🌐 Test Connection"}
                    </button>
                    {connTestState === "error" && (
                      <span style={{ fontSize: "0.72rem", color: "#c0392b", fontFamily: "var(--font-dm-sans), sans-serif" }}>LiveKit server may be offline</span>
                    )}
                  </div>
                </div>
              </>
            )}

            {/* ── ORGANISER: full camera + mic + speaker check ── */}
            {isOrg && (
              <>
                {/* Camera preview */}
                <div style={{ marginBottom: "1.5rem" }}>
                  <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: T.inkSoft, marginBottom: "0.5rem", fontFamily: "var(--font-dm-sans), sans-serif" }}>
                    📷 Camera Preview
                  </label>
                  <div style={{ position: "relative", borderRadius: T.radiusSm, overflow: "hidden", background: "#0d1210", aspectRatio: "16/9" }}>
                    <video ref={devicePreviewRef} autoPlay muted playsInline style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  </div>
                  {videoDevices.length > 0 && (
                    <select
                      value={selectedVideoId}
                      onChange={(e) => setSelectedVideoId(e.target.value)}
                      style={{ marginTop: "0.5rem", width: "100%", padding: "0.5rem 0.75rem", border: `1px solid ${T.border}`, borderRadius: T.radiusSm, fontFamily: "var(--font-dm-sans), sans-serif", fontSize: "0.82rem", color: T.ink, outline: "none" }}
                    >
                      {videoDevices.map((d) => <option key={d.deviceId} value={d.deviceId}>{d.label || `Camera ${d.deviceId.slice(0, 8)}`}</option>)}
                    </select>
                  )}
                </div>

                {/* Microphone */}
                <div style={{ marginBottom: "1.25rem" }}>
                  <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: T.inkSoft, marginBottom: "0.5rem", fontFamily: "var(--font-dm-sans), sans-serif" }}>
                    🎙️ Microphone
                  </label>
                  <div style={{ height: 8, background: T.border, borderRadius: 100, overflow: "hidden", marginBottom: "0.5rem" }}>
                    <div style={{ width: `${micLevel}%`, height: "100%", background: micLevel > 60 ? T.leaf : micLevel > 30 ? T.sun : T.leafMid, borderRadius: 100, transition: "width 0.1s" }} />
                  </div>
                  {audioDevices.length > 0 && (
                    <select
                      value={selectedAudioId}
                      onChange={(e) => setSelectedAudioId(e.target.value)}
                      style={{ width: "100%", padding: "0.5rem 0.75rem", border: `1px solid ${T.border}`, borderRadius: T.radiusSm, fontFamily: "var(--font-dm-sans), sans-serif", fontSize: "0.82rem", color: T.ink, outline: "none" }}
                    >
                      {audioDevices.map((d) => <option key={d.deviceId} value={d.deviceId}>{d.label || `Mic ${d.deviceId.slice(0, 8)}`}</option>)}
                    </select>
                  )}
                </div>

                {/* Speaker */}
                {audioOutputDevices.length > 0 && (
                  <div style={{ marginBottom: "1.5rem" }}>
                    <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: T.inkSoft, marginBottom: "0.5rem", fontFamily: "var(--font-dm-sans), sans-serif" }}>
                      🔊 Speaker
                    </label>
                    <select
                      value={selectedOutputId}
                      onChange={(e) => setSelectedOutputId(e.target.value)}
                      style={{ width: "100%", padding: "0.5rem 0.75rem", border: `1px solid ${T.border}`, borderRadius: T.radiusSm, fontFamily: "var(--font-dm-sans), sans-serif", fontSize: "0.82rem", color: T.ink, outline: "none" }}
                    >
                      {audioOutputDevices.map((d) => <option key={d.deviceId} value={d.deviceId}>{d.label || `Speaker ${d.deviceId.slice(0, 8)}`}</option>)}
                    </select>
                  </div>
                )}
              </>
            )}

            <div style={{ display: "flex", gap: "0.75rem" }}>
              <button
                onClick={() => router.back()}
                style={{ flex: 1, background: "transparent", color: T.inkSoft, border: `1.5px solid ${T.border}`, borderRadius: T.radiusSm, padding: "0.75rem", fontFamily: "var(--font-dm-sans), sans-serif", fontWeight: 600, fontSize: "0.9rem", cursor: "pointer" }}
              >
                Cancel
              </button>
              <button
                onClick={joinRoom}
                style={{ flex: 2, background: T.leaf, color: T.white, border: "none", borderRadius: T.radiusSm, padding: "0.75rem", fontFamily: "var(--font-dm-sans), sans-serif", fontWeight: 600, fontSize: "0.9rem", cursor: "pointer" }}
              >
                {isOrg ? "🎙️ Start Session" : sessionType === "webinar" ? "📺 Watch Now →" : "🎧 Join Session →"}
              </button>
            </div>
          </div>
        </div>
      </>
    );
  }

  // ── ROOM PHASE ─────────────────────────────────────────────────────────────
  const isOrg = tokenData?.isOrganizer ?? false;
  const sessionDurationSec = (tokenData?.sessionInfo.duration ?? session?.duration ?? 0) * 60;
  const scheduledAtMs = tokenData?.sessionInfo.scheduledAt ? new Date(tokenData.sessionInfo.scheduledAt).getTime() : 0;
  const sessionEndMs = scheduledAtMs > 0 ? scheduledAtMs + sessionDurationSec * 1000 : 0;
  // remainingSec counts down from scheduled end time; falls back to elapsed-based if no scheduledAt
  const remainingSec = sessionEndMs > 0
    ? Math.max(0, Math.floor((sessionEndMs - Date.now()) / 1000))
    : Math.max(0, sessionDurationSec - elapsedSec);
  const totalVotes = poll ? poll.votes.reduce((a, b) => a + b, 0) : 0;

  return (
    <>
      <Header activeLink="live" />
      <div style={{ paddingTop: isMobile ? 57 : 72, height: isMobile ? undefined : "100vh", minHeight: isMobile ? "100svh" : undefined, display: "flex", flexDirection: "column", background: "#f0f2f0", fontFamily: "var(--font-dm-sans), sans-serif", overflow: isMobile ? "auto" : "hidden" }}>

        {/* ── Header bar ── */}
        <div style={{ background: "#141a15", padding: isMobile ? "0.5rem 0.75rem" : "0 1.5rem", minHeight: 52, height: "auto", display: "flex", alignItems: "center", gap: isMobile ? "0.5rem" : "1rem", flexShrink: 0, borderBottom: "1px solid rgba(255,255,255,0.06)", flexWrap: isMobile ? "wrap" as const : undefined }}>
          {/* Title */}
          <div style={{ fontFamily: "var(--font-fraunces), Georgia, serif", fontSize: "0.95rem", fontWeight: 700, color: "#fff", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const, flex: 1 }}>
            {session?.title || tokenData?.sessionInfo.title}
          </div>
          {/* Timers */}
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexShrink: 0 }}>
            {sessionDurationSec > 0 && (
              <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", background: remainingSec < 300 ? "rgba(239,68,68,0.15)" : "rgba(29,107,60,0.15)", border: `1px solid ${remainingSec < 300 ? "rgba(239,68,68,0.3)" : "rgba(29,107,60,0.3)"}`, borderRadius: 8, padding: "0.25rem 0.75rem" }}>
                <span style={{ fontSize: "0.65rem", color: "rgba(255,255,255,0.4)", textTransform: "uppercase" as const, letterSpacing: "0.05em" }}>Left</span>
                <span style={{ fontSize: "0.85rem", fontWeight: 700, color: remainingSec < 300 ? "#fc8a8a" : "#7ed9a4", fontVariantNumeric: "tabular-nums" }}>{fmtDuration(remainingSec)}</span>
              </div>
            )}
          </div>
          {/* Actions */}
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexShrink: 0 }}>
            {isOrg && !isRecording && (
              <button onClick={startRecording} disabled={recordingLoading} style={{ background: recordingLoading ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.08)", color: recordingLoading ? "rgba(255,255,255,0.4)" : "rgba(255,255,255,0.75)", border: "1px solid rgba(255,255,255,0.18)", borderRadius: 100, padding: "0.35rem 0.9rem", fontFamily: "var(--font-dm-sans), sans-serif", fontSize: "0.78rem", fontWeight: 600, cursor: recordingLoading ? "default" : "pointer", display: "flex", alignItems: "center", gap: "0.4rem", transition: "all 0.2s" }}>
                <div style={{ width: 7, height: 7, borderRadius: "50%", background: recordingLoading ? "rgba(239,68,68,0.4)" : "#ef4444", flexShrink: 0, animation: recordingLoading ? "pulse-live 0.8s infinite" : undefined }} />
                {recordingLoading ? "Starting…" : isMobile ? "Rec" : "Start Recording"}
              </button>
            )}
            {isOrg && isRecording && (
              <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 100, padding: "0.35rem 0.9rem" }}>
                <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#ef4444", animation: "pulse-live 2s infinite", flexShrink: 0 }} />
                <span style={{ fontSize: "0.78rem", fontWeight: 600, color: "#fc8a8a", fontFamily: "var(--font-dm-sans), sans-serif" }}>Recording</span>
              </div>
            )}
            {isOrg && (
              <button onClick={() => setShowEndConfirm(true)} style={{ background: "rgba(255,255,255,0.07)", color: "rgba(255,255,255,0.65)", border: "1px solid rgba(255,255,255,0.14)", borderRadius: 100, padding: "0.35rem 0.9rem", fontFamily: "var(--font-dm-sans), sans-serif", fontSize: "0.78rem", fontWeight: 600, cursor: "pointer", transition: "all 0.15s" }}>
                {isMobile ? "End" : "End Session"}
              </button>
            )}
            {!isOrg && (
              <button onClick={leaveRoom} style={{ background: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.6)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 100, padding: "0.35rem 0.9rem", fontFamily: "var(--font-dm-sans), sans-serif", fontSize: "0.78rem", fontWeight: 600, cursor: "pointer" }}>
                Leave
              </button>
            )}
          </div>
        </div>

        {/* ── Record tip banner ── */}
        {isOrg && showRecordTip && !isRecording && (
          <div style={{ background: "linear-gradient(90deg, #1e2d45, #162038)", padding: "0.55rem 1.25rem", display: "flex", alignItems: "center", gap: "0.75rem", flexShrink: 0, animation: "slideDown 0.35s ease", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#ef4444", flexShrink: 0, animation: "pulse-live 1.2s infinite" }} />
            <span style={{ fontSize: "0.8rem", color: "rgba(255,255,255,0.85)", fontFamily: "var(--font-dm-sans), sans-serif", flex: 1 }}>
              🎙 Click <strong style={{ color: "#fff" }}>Start Recording</strong> to capture this session — you won't be able to recover it if you forget
            </span>
          </div>
        )}

        {/* ── Recording active — end session reminder ── */}
        {isOrg && isRecording && (
          <div style={{ background: "#141a15", padding: "0.45rem 1.25rem", display: "flex", alignItems: "center", gap: "0.75rem", flexShrink: 0, borderBottom: "1px solid rgba(255,255,255,0.06)", animation: "slideDown 0.35s ease" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", background: "rgba(239,68,68,0.14)", border: "1px solid rgba(239,68,68,0.28)", borderRadius: 100, padding: "0.18rem 0.6rem", flexShrink: 0 }}>
              <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#ef4444", animation: "pulse-live 1.5s infinite" }} />
              <span style={{ fontSize: "0.65rem", fontWeight: 700, color: "#fc8a8a", letterSpacing: "0.06em", fontFamily: "var(--font-dm-sans), sans-serif" }}>REC</span>
            </div>
            <span style={{ fontSize: "0.78rem", color: "rgba(255,255,255,0.5)", fontFamily: "var(--font-dm-sans), sans-serif", flex: 1 }}>
              Recording in progress — press <strong style={{ color: "rgba(255,255,255,0.82)", fontWeight: 600 }}>End Session</strong> when done to save
            </span>
          </div>
        )}

        {/* ── Room toast ── */}
        {roomToast && (
          <div style={{ position: "fixed", top: isMobile ? 73 : 80, right: 16, zIndex: 999, padding: "0.65rem 1.1rem", borderRadius: 10, background: "#1d6b3c", color: "#fff", fontWeight: 600, fontSize: "0.85rem", boxShadow: "0 4px 20px rgba(0,0,0,0.25)", fontFamily: "var(--font-dm-sans), sans-serif", animation: "slideDown 0.3s ease" }}>
            {roomToast}
          </div>
        )}

        {/* ── Main area ── */}
        <div style={{ flex: 1, display: isMobile ? "flex" : "grid", flexDirection: isMobile ? "column" as const : undefined, gridTemplateColumns: isMobile ? undefined : "1fr 370px", minHeight: 0, overflow: isMobile ? undefined : undefined }}>

          {/* ── LEFT: video + info ── */}
          <div style={{ display: "flex", flexDirection: "column", minHeight: 0, overflowY: isMobile ? "visible" : "auto", background: "#f0f2f0" }}>

            {/* Video stage */}
            <div ref={videoStageRef} style={{ position: "relative", background: "#111614", flexShrink: 0, aspectRatio: "16/9", overflow: "hidden" }}>
              <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse 70% 60% at 35% 50%, rgba(29,107,60,0.12) 0%, transparent 60%), radial-gradient(ellipse 50% 40% at 75% 65%, rgba(26,79,122,0.1) 0%, transparent 55%)" }} />

              {/* Organizer: camera (main) or screen-sharing indicator */}
              {isOrg && (
                <>
                  <video ref={localVideoRef} autoPlay muted playsInline style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", display: screenSharing ? "none" : "block" }} />
                  {screenSharing && (
                    <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "0.6rem" }}>
                      <div style={{ fontSize: "2rem" }}>🖥️</div>
                      <div style={{ fontSize: "0.85rem", fontWeight: 600, color: "rgba(255,255,255,0.8)" }}>Screen sharing is active</div>
                      <div style={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.4)" }}>Attendees can see your screen</div>
                    </div>
                  )}
                </>
              )}

              {/* Attendee: screen share (main) or camera (main) */}
              {!isOrg && (
                <>
                  <video ref={remoteScreenRef} autoPlay playsInline style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "contain", display: remoteScreenActive ? "block" : "none", background: "#000" }} />
                  <video ref={remoteVideoRef} autoPlay playsInline style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", display: remoteScreenActive ? "none" : "block" }} />
                </>
              )}

              {!isOrg && !hasRemoteVideo && !remoteScreenActive && (
                <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "0.9rem" }}>
                  <div style={{ width: 72, height: 72, borderRadius: "50%", background: "linear-gradient(135deg,#1d6b3c,#145c30)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--font-fraunces), Georgia, serif", fontSize: "1.35rem", fontWeight: 700, color: "#fff", boxShadow: "0 0 0 6px rgba(29,107,60,0.18)", overflow: "hidden" }}>
                    {session?.user.avatarUrl
                      ? <img src={`${process.env.NEXT_PUBLIC_API_URL ?? ""}${session.user.avatarUrl}`} alt={teacherName} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                      : teacherInitials}
                  </div>
                  <div style={{ fontSize: "0.85rem", fontWeight: 600, color: "rgba(255,255,255,0.75)" }}>{teacherName}</div>
                  <div style={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.35)" }}>{connected ? "Waiting for presenter's video…" : "Connecting…"}</div>
                </div>
              )}
              {/* PiP camera circle — shown when organizer is screen-sharing or attendee sees screen share */}
              {((isOrg && screenSharing) || (!isOrg && remoteScreenActive)) && (
                <>
                  {/* Wrapper: positions the pip + places close button outside overflow:hidden */}
                  <div style={{ position: "absolute", left: pipPos.x, top: pipPos.y, width: 108, height: 108, zIndex: 20, display: pipVisible ? "block" : "none" }}>
                    {/* Draggable circle */}
                    <div
                      onMouseDown={(e: React.MouseEvent) => {
                        e.preventDefault();
                        if (!videoStageRef.current) return;
                        const r = videoStageRef.current.getBoundingClientRect();
                        pipDragging.current = true;
                        pipDragOrigin.current = { mx: e.clientX - r.left - pipPos.x, my: e.clientY - r.top - pipPos.y, px: pipPos.x, py: pipPos.y };
                      }}
                      style={{ width: "100%", height: "100%", borderRadius: "50%", overflow: "hidden", border: "2.5px solid rgba(255,255,255,0.4)", cursor: "grab", boxShadow: "0 4px 20px rgba(0,0,0,0.5)" }}
                    >
                      <video
                        ref={isOrg ? orgPipVideoRef : pipVideoRef}
                        autoPlay
                        muted={isOrg}
                        playsInline
                        style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                      />
                    </div>
                    {/* Close button — outside overflow:hidden so it renders fully */}
                    <button
                      onClick={e => { e.stopPropagation(); setPipVisible(false); }}
                      style={{ position: "absolute", top: -4, right: -4, background: "rgba(20,20,20,0.85)", border: "1.5px solid rgba(255,255,255,0.35)", borderRadius: "50%", width: 22, height: 22, color: "#fff", cursor: "pointer", fontSize: "0.65rem", display: "flex", alignItems: "center", justifyContent: "center", lineHeight: 1, padding: 0 }}
                    >✕</button>
                  </div>
                  {!pipVisible && (
                    <button
                      onClick={() => setPipVisible(true)}
                      style={{ position: "absolute", top: "0.6rem", right: "0.6rem", background: "rgba(0,0,0,0.6)", border: "1px solid rgba(255,255,255,0.2)", borderRadius: 8, color: "#fff", fontSize: "0.7rem", fontWeight: 600, padding: "0.3rem 0.65rem", cursor: "pointer", zIndex: 20, fontFamily: "var(--font-dm-sans), sans-serif" }}
                    >
                      📷 Camera
                    </button>
                  )}
                </>
              )}

              {/* Top-left badges */}
              <div style={{ position: "absolute", top: "0.75rem", left: "0.75rem", display: "flex", gap: "0.4rem" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.3rem", background: "rgba(239,68,68,0.82)", backdropFilter: "blur(4px)", color: "#fff", fontSize: "0.67rem", fontWeight: 700, letterSpacing: "0.07em", textTransform: "uppercase" as const, padding: "0.2rem 0.6rem", borderRadius: 100 }}>
                  <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#fff", animation: "pulse-live 2s infinite" }} />Live
                </div>
                <div style={{ background: "rgba(0,0,0,0.48)", backdropFilter: "blur(4px)", color: "rgba(255,255,255,0.8)", fontSize: "0.7rem", fontWeight: 600, padding: "0.2rem 0.65rem", borderRadius: 100 }}>
                  {fmtDuration(elapsedSec)}
                </div>
              </div>
              {/* Top-right: watching count */}
              <div style={{ position: "absolute", top: "0.75rem", right: "0.75rem", display: "flex", alignItems: "center", gap: "0.35rem", background: "rgba(0,0,0,0.52)", backdropFilter: "blur(4px)", color: "rgba(255,255,255,0.85)", fontSize: "0.7rem", fontWeight: 600, padding: "0.2rem 0.65rem", borderRadius: 100 }}>
                <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#ef4444", animation: "pulse-live 2s infinite", flexShrink: 0 }} />
                {onlineCount} watching
              </div>
              {/* Organizer controls */}
              {isOrg && (
                <div style={{ position: "absolute", bottom: "0.75rem", right: "0.75rem", display: "flex", gap: "0.4rem" }}>
                  <CtrlBtn active={!micMuted} onClick={toggleMic} title={micMuted ? "Unmute" : "Mute"}>
                    {micMuted ? <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><line x1="1" y1="1" x2="23" y2="23"/><path d="M9 9v3a3 3 0 005.12 2.12M15 9.34V4a3 3 0 00-5.94-.6"/><path d="M17 16.95A7 7 0 015 12v-2m14 0v2a7 7 0 01-.11 1.23M12 19v3M8 23h8"/></svg>
                    : <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z"/><path d="M19 10v2a7 7 0 01-14 0v-2M12 19v3M8 23h8"/></svg>}
                  </CtrlBtn>
                  <CtrlBtn active={!camOff} onClick={toggleCam} title={camOff ? "Camera on" : "Camera off"}>
                    {camOff ? <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M16 16v1a2 2 0 01-2 2H3a2 2 0 01-2-2V7a2 2 0 012-2h2m5.66 0H14a2 2 0 012 2v3.34l1 1L23 7v10"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                    : <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg>}
                  </CtrlBtn>
                  <CtrlBtn active={screenSharing} onClick={toggleScreen} title={screenSharing ? "Stop sharing" : "Share screen"}>
                    <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>
                  </CtrlBtn>
                </div>
              )}
            </div>

            {/* Instructor strip */}
            <div style={{ background: "#fff", borderBottom: `1px solid ${T.border}`, padding: "0.65rem 1.1rem", display: "flex", alignItems: "center", gap: "0.75rem", flexShrink: 0 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: T.sky, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.7rem", fontWeight: 700, flexShrink: 0, overflow: "hidden" }}>
                {session?.user.avatarUrl
                  ? <img src={`${process.env.NEXT_PUBLIC_API_URL ?? ""}${session.user.avatarUrl}`} alt={teacherName} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                  : teacherInitials}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: "0.85rem", fontWeight: 700, color: T.ink }}>{teacherName}</div>
                <div style={{ fontSize: "0.72rem", color: T.inkMuted }}>{session?.category || "Instructor"} · {isOrg ? "You're hosting" : "Instructor"}</div>
              </div>
              {!isMobile && (
                <div style={{ display: "flex", gap: "0.4rem" }}>
                  <span style={{ fontSize: "0.67rem", fontWeight: 600, padding: "0.15rem 0.55rem", borderRadius: 100, background: T.leafLight, color: T.leaf }}>{session?.type === "webinar" ? "Webinar" : "Live Class"}</span>
                  <span style={{ fontSize: "0.67rem", fontWeight: 600, padding: "0.15rem 0.55rem", borderRadius: 100, background: "#ddeaf8", color: T.sky }}>{session?.skillLevel || "All Levels"}</span>
                </div>
              )}
              <button
                onClick={() => {
                  const url = `${window.location.origin}/session/${sessionId}`;
                  navigator.clipboard.writeText(url).then(() => {
                    setLinkCopied(true);
                    setTimeout(() => setLinkCopied(false), 2000);
                  });
                }}
                style={{ display: "flex", alignItems: "center", gap: "0.35rem", background: linkCopied ? T.leafLight : T.cream, color: linkCopied ? T.leaf : T.inkMuted, border: `1px solid ${linkCopied ? "rgba(29,107,60,0.25)" : T.border}`, borderRadius: 100, padding: "0.25rem 0.7rem", fontFamily: "var(--font-dm-sans), sans-serif", fontSize: "0.72rem", fontWeight: 600, cursor: "pointer", flexShrink: 0, transition: "all 0.2s" }}
              >
                {linkCopied ? (
                  <>✓ Copied!</>
                ) : (
                  <><svg width="11" height="11" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/></svg> Share</>
                )}
              </button>
              {!isMobile && (
                <a href={`/profile/${session?.user.id}`} target="_blank" style={{ fontSize: "0.75rem", color: T.leaf, fontWeight: 600, textDecoration: "none", flexShrink: 0 }}>View profile →</a>
              )}
            </div>

            {/* About + Rate tabs */}
            <div style={{ minHeight: 220, background: "#fff" }}>
              <div style={{ display: "flex", borderBottom: `1px solid ${T.border}`, padding: "0 1.1rem" }}>
                {(["about", "rate"] as const).map((t) => (
                  <button key={t} onClick={() => setActiveTab(t as "about" | "teacher" | "rate")}
                    style={{ padding: "0.6rem 1rem", fontSize: "0.8rem", fontWeight: activeTab === t ? 600 : 500, color: activeTab === t ? T.leaf : T.inkMuted, border: "none", borderBottom: `2px solid ${activeTab === t ? T.leaf : "transparent"}`, marginBottom: -1, background: "none", cursor: "pointer", fontFamily: "var(--font-dm-sans), sans-serif" }}>
                    {t === "about" ? "About" : "Rate"}
                  </button>
                ))}
              </div>
              <div style={{ padding: "1.1rem" }}>
                {activeTab === "about" && (
                  <>
                    <p style={{ fontSize: "0.85rem", color: T.inkSoft, lineHeight: 1.75, margin: "0 0 1rem" }}>{session?.description || "No description provided."}</p>
                    {session?.tags && (() => { let tags: string[] = []; try { tags = JSON.parse(session.tags); } catch { tags = session.tags.split(",").map(t => t.trim()); } return (
                      <div style={{ display: "flex", flexWrap: "wrap" as const, gap: "0.4rem" }}>
                        {tags.map((tag) => <span key={tag} style={{ fontSize: "0.72rem", fontWeight: 500, padding: "0.2rem 0.6rem", borderRadius: 100, background: "#ddeaf8", color: T.sky }}>{tag}</span>)}
                        {session.skillLevel && <span style={{ fontSize: "0.72rem", fontWeight: 500, padding: "0.2rem 0.6rem", borderRadius: 100, background: T.leafLight, color: T.leaf }}>{session.skillLevel}</span>}
                        <span style={{ fontSize: "0.72rem", fontWeight: 500, padding: "0.2rem 0.6rem", borderRadius: 100, background: "#fdf3e0", color: T.sun }}>🕐 ~{session?.duration || tokenData?.sessionInfo.duration} mins</span>
                      </div>
                    ); })()}
                  </>
                )}
                {activeTab === "rate" && (
                  isOrg ? <div style={{ textAlign: "center" as const, padding: "1.5rem 0", color: T.inkMuted, fontSize: "0.85rem" }}>Ratings are submitted by attendees.</div>
                  : ratingSubmitted ? <div style={{ textAlign: "center" as const, padding: "1.5rem 0", color: T.leaf, fontWeight: 600 }}>✓ Thanks for rating {ratingValue}★</div>
                  : <>
                    <div style={{ fontSize: "0.8rem", fontWeight: 600, color: T.ink, marginBottom: "0.5rem" }}>Rate this session</div>
                    <div style={{ display: "flex", gap: "0.3rem", marginBottom: "0.5rem" }}>
                      {[1,2,3,4,5].map((v) => <span key={v} onMouseEnter={() => setRatingHover(v)} onMouseLeave={() => setRatingHover(0)} onClick={() => setRatingValue(v)} style={{ fontSize: "1.5rem", color: v <= (ratingHover || ratingValue) ? T.sun : T.border, cursor: "pointer" }}>★</span>)}
                    </div>
                    <textarea value={ratingComment} onChange={(e) => setRatingComment(e.target.value)} rows={3} placeholder="What could be improved? (optional)" style={{ width: "100%", border: `1.5px solid ${T.border}`, borderRadius: T.radiusSm, padding: "0.55rem 0.75rem", fontFamily: "var(--font-dm-sans), sans-serif", fontSize: "0.82rem", color: T.ink, resize: "none" as const, outline: "none", boxSizing: "border-box" as const }} />
                    <button onClick={async () => { if (!ratingValue) return; try { await apiFetch(`/live/${sessionId}/rate`, { method: "POST", body: JSON.stringify({ rating: ratingValue, comment: ratingComment }) }); } catch {} setRatingSubmitted(true); }} style={{ marginTop: "0.5rem", background: T.leaf, color: "#fff", border: "none", borderRadius: T.radiusSm, padding: "0.5rem 1.1rem", fontFamily: "var(--font-dm-sans), sans-serif", fontSize: "0.82rem", fontWeight: 600, cursor: "pointer" }}>Submit Rating</button>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* ── RIGHT: Chat / People / Poll ── */}
          <div style={{ borderLeft: isMobile ? "none" : `1px solid ${T.border}`, borderTop: isMobile ? `1px solid ${T.border}` : "none", background: "#fff", display: "flex", flexDirection: "column", minHeight: 0, height: isMobile ? 480 : undefined, flexShrink: isMobile ? 0 : undefined }}>

            {/* Tab bar */}
            <div style={{ display: "flex", borderBottom: `1px solid ${T.border}`, flexShrink: 0 }}>
              {([
                { key: "chat",   label: "Chat",    badge: chatMessages.length > 0 ? chatMessages.length : null },
                { key: "people", label: "People",  badge: onlineCount > 0 ? onlineCount : null },
                { key: "poll",   label: "Poll",    badge: pollBadge && sideTab !== "poll" ? "!" : null },
              ] as { key: "chat"|"people"|"poll"; label: string; badge: string|number|null }[]).map(({ key, label, badge }) => (
                <button key={key} onClick={() => { setSideTab(key); if (key === "poll") setPollBadge(false); }}
                  style={{ flex: 1, padding: "0.7rem 0.5rem", fontSize: "0.8rem", fontWeight: sideTab === key ? 700 : 500, color: sideTab === key ? T.leaf : T.inkMuted, border: "none", borderBottom: `2px solid ${sideTab === key ? T.leaf : "transparent"}`, marginBottom: -1, background: "none", cursor: "pointer", fontFamily: "var(--font-dm-sans), sans-serif", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.35rem" }}>
                  {label}
                  {badge !== null && <span style={{ fontSize: "0.65rem", fontWeight: 700, background: key === "poll" ? "#ef4444" : T.leafLight, color: key === "poll" ? "#fff" : T.leaf, padding: "0.1rem 0.45rem", borderRadius: 100, lineHeight: 1.4 }}>{badge}</span>}
                </button>
              ))}
            </div>

            {/* ── CHAT tab ── */}
            {sideTab === "chat" && (
              <>
                <div ref={chatFeedRef} style={{ flex: 1, overflowY: "auto" as const, padding: "0.75rem 1rem", display: "flex", flexDirection: "column" as const, gap: "0.8rem" }}>
                  {chatMessages.length === 0 && <div style={{ textAlign: "center" as const, color: T.inkMuted, fontSize: "0.82rem", padding: "2rem 0" }}>Chat is live — say hello! 👋</div>}
                  {chatMessages.map((msg) => (
                    <div key={msg.id} style={{ display: "flex", gap: "0.6rem" }}>
                      <div style={{ width: 28, height: 28, borderRadius: 8, background: msg.senderColor, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.58rem", fontWeight: 700, flexShrink: 0 }}>{msg.senderInitials}</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: "flex", alignItems: "baseline", gap: "0.4rem", marginBottom: "0.15rem" }}>
                          <span style={{ fontSize: "0.76rem", fontWeight: 700, color: T.ink }}>{msg.senderName}</span>
                          <span style={{ fontSize: "0.62rem", color: T.inkMuted }}>{msg.time}</span>
                        </div>
                        <div style={{ fontSize: "0.82rem", color: T.inkSoft, lineHeight: 1.5, background: msg.isMine ? T.leafLight : "transparent", padding: msg.isMine ? "0.3rem 0.6rem" : 0, borderRadius: msg.isMine ? 8 : 0 }}>{msg.text}</div>
                      </div>
                    </div>
                  ))}
                </div>
                <div style={{ borderTop: `1px solid ${T.border}`, padding: "0.65rem 0.9rem", flexShrink: 0 }}>
                  <div style={{ display: "flex", gap: "0.3rem", marginBottom: "0.5rem" }}>
                    {["👏","🙌","🔥","💡","🙏"].map((e) => <button key={e} onClick={() => sendReaction(e)} style={{ background: T.cream, border: `1px solid ${T.border}`, borderRadius: 100, padding: "0.18rem 0.5rem", fontSize: "0.8rem", cursor: "pointer" }}>{e}</button>)}
                  </div>
                  <div style={{ display: "flex", gap: "0.4rem", alignItems: "flex-end" }}>
                    <textarea value={chatInput} onChange={(e) => setChatInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendChat(); } }} placeholder="Ask a question…" rows={1} style={{ flex: 1, border: `1.5px solid ${T.border}`, borderRadius: T.radiusSm, padding: "0.5rem 0.75rem", fontFamily: "var(--font-dm-sans), sans-serif", fontSize: "0.82rem", color: T.ink, resize: "none" as const, outline: "none", lineHeight: 1.4, maxHeight: 80, minHeight: 36 }} />
                    <button onClick={sendChat} style={{ background: T.leaf, color: "#fff", border: "none", borderRadius: T.radiusSm, width: 36, height: 36, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
                      <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
                    </button>
                  </div>
                </div>
              </>
            )}

            {/* ── PEOPLE tab ── */}
            {sideTab === "people" && (
              <div style={{ flex: 1, overflowY: "auto" as const, padding: "0.75rem" }}>
                {/* Stats row */}
                <div style={{ display: "flex", gap: "0.5rem", marginBottom: "0.9rem" }}>
                  <div style={{ flex: 1, background: T.leafLight, borderRadius: 10, padding: "0.5rem 0.75rem", textAlign: "center" as const }}>
                    <div style={{ fontSize: "1.1rem", fontWeight: 700, color: T.leaf }}>{onlineCount}</div>
                    <div style={{ fontSize: "0.67rem", color: T.leaf, fontWeight: 500 }}>Watching</div>
                  </div>
                  <div style={{ flex: 1, background: "#ddeaf8", borderRadius: 10, padding: "0.5rem 0.75rem", textAlign: "center" as const }}>
                    <div style={{ fontSize: "1.1rem", fontWeight: 700, color: T.sky }}>{registeredCount}</div>
                    <div style={{ fontSize: "0.67rem", color: T.sky, fontWeight: 500 }}>Registered</div>
                  </div>
                </div>
                {/* Self */}
                <div style={{ fontSize: "0.68rem", fontWeight: 700, color: T.inkMuted, textTransform: "uppercase" as const, letterSpacing: "0.06em", marginBottom: "0.5rem", padding: "0 0.25rem" }}>You</div>
                <div style={{ display: "flex", alignItems: "center", gap: "0.65rem", padding: "0.55rem 0.75rem", borderRadius: 10, background: T.leafLight, marginBottom: "0.75rem" }}>
                  <div style={{ width: 32, height: 32, borderRadius: 9, background: T.leaf, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.65rem", fontWeight: 700 }}>{getInitials(myName.current)}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: "0.82rem", fontWeight: 700, color: T.ink }}>{myName.current}</div>
                    <div style={{ fontSize: "0.7rem", color: T.leaf }}>{isOrg ? "Host" : "Viewer"}</div>
                  </div>
                  <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#22c55e" }} />
                </div>
                {participants.length > 0 && (
                  <>
                    <div style={{ fontSize: "0.68rem", fontWeight: 700, color: T.inkMuted, textTransform: "uppercase" as const, letterSpacing: "0.06em", marginBottom: "0.5rem", padding: "0 0.25rem" }}>Others ({participants.length})</div>
                    <div style={{ display: "flex", flexDirection: "column" as const, gap: "0.3rem" }}>
                      {participants.map((p) => (
                        <div key={p.identity} style={{ display: "flex", alignItems: "center", gap: "0.65rem", padding: "0.5rem 0.75rem", borderRadius: 10, background: T.cream }}>
                          <div style={{ width: 32, height: 32, borderRadius: 9, background: p.color, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.65rem", fontWeight: 700 }}>{p.initials}</div>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: "0.82rem", fontWeight: 600, color: T.ink }}>{p.name}</div>
                          </div>
                          <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#22c55e" }} />
                        </div>
                      ))}
                    </div>
                  </>
                )}
                {participants.length === 0 && (
                  <div style={{ textAlign: "center" as const, color: T.inkMuted, fontSize: "0.82rem", padding: "2rem 0" }}>No one else has joined yet.</div>
                )}
              </div>
            )}

            {/* ── POLL tab ── */}
            {sideTab === "poll" && (
              <div style={{ flex: 1, overflowY: "auto" as const, padding: "0.9rem" }}>
                {/* Organizer: create poll */}
                {isOrg && !showPollCreate && !poll && (
                  <div style={{ textAlign: "center" as const, padding: "2rem 0" }}>
                    <div style={{ fontSize: "1.75rem", marginBottom: "0.75rem" }}>📊</div>
                    <div style={{ fontSize: "0.85rem", fontWeight: 600, color: T.ink, marginBottom: "0.4rem" }}>Engage your audience</div>
                    <div style={{ fontSize: "0.78rem", color: T.inkMuted, marginBottom: "1.25rem", lineHeight: 1.6 }}>Launch a live poll — results update in real time for everyone.</div>
                    <button onClick={() => setShowPollCreate(true)} style={{ background: T.leaf, color: "#fff", border: "none", borderRadius: 100, padding: "0.55rem 1.4rem", fontFamily: "var(--font-dm-sans), sans-serif", fontSize: "0.85rem", fontWeight: 600, cursor: "pointer" }}>Create Poll</button>
                  </div>
                )}
                {isOrg && showPollCreate && (
                  <div>
                    <div style={{ fontSize: "0.78rem", fontWeight: 700, color: T.inkMuted, textTransform: "uppercase" as const, letterSpacing: "0.05em", marginBottom: "0.75rem" }}>New Poll</div>
                    <input value={draftQuestion} onChange={(e) => setDraftQuestion(e.target.value)} placeholder="Your question…" style={{ width: "100%", padding: "0.65rem 0.75rem", borderRadius: 10, border: `1.5px solid ${T.border}`, fontFamily: "var(--font-dm-sans), sans-serif", fontSize: "0.85rem", color: T.ink, outline: "none", boxSizing: "border-box" as const, marginBottom: "0.75rem" }} />
                    <div style={{ display: "flex", flexDirection: "column" as const, gap: "0.4rem", marginBottom: "0.75rem" }}>
                      {draftOptions.map((opt, i) => (
                        <div key={i} style={{ display: "flex", gap: "0.4rem" }}>
                          <input value={opt} onChange={(e) => setDraftOptions((prev) => prev.map((o, j) => j === i ? e.target.value : o))} placeholder={`Option ${i + 1}`} style={{ flex: 1, padding: "0.5rem 0.7rem", borderRadius: 8, border: `1.5px solid ${T.border}`, fontFamily: "var(--font-dm-sans), sans-serif", fontSize: "0.82rem", color: T.ink, outline: "none" }} />
                          {draftOptions.length > 2 && <button onClick={() => setDraftOptions((p) => p.filter((_, j) => j !== i))} style={{ background: "none", border: "none", color: T.inkMuted, cursor: "pointer", fontSize: "1rem", padding: "0 0.2rem" }}>✕</button>}
                        </div>
                      ))}
                    </div>
                    {draftOptions.length < 5 && <button onClick={() => setDraftOptions((p) => [...p, ""])} style={{ background: "none", border: `1.5px dashed ${T.border}`, borderRadius: 8, padding: "0.4rem 0.9rem", fontFamily: "var(--font-dm-sans), sans-serif", fontSize: "0.78rem", color: T.inkMuted, cursor: "pointer", width: "100%", marginBottom: "0.9rem" }}>+ Add option</button>}
                    <div style={{ display: "flex", gap: "0.5rem" }}>
                      <button onClick={() => setShowPollCreate(false)} style={{ flex: 1, background: "none", border: `1.5px solid ${T.border}`, borderRadius: 100, padding: "0.5rem", fontFamily: "var(--font-dm-sans), sans-serif", fontSize: "0.8rem", color: T.inkSoft, cursor: "pointer" }}>Cancel</button>
                      <button onClick={launchPoll} disabled={!draftQuestion.trim() || draftOptions.filter(o => o.trim()).length < 2} style={{ flex: 2, background: T.leaf, border: "none", borderRadius: 100, padding: "0.5rem", fontFamily: "var(--font-dm-sans), sans-serif", fontSize: "0.8rem", fontWeight: 700, color: "#fff", cursor: "pointer", opacity: (!draftQuestion.trim() || draftOptions.filter(o => o.trim()).length < 2) ? 0.5 : 1 }}>Launch Poll →</button>
                    </div>
                  </div>
                )}
                {/* Active poll */}
                {poll && (
                  <div>
                    <div style={{ fontSize: "0.68rem", fontWeight: 700, color: T.inkMuted, textTransform: "uppercase" as const, letterSpacing: "0.06em", marginBottom: "0.6rem" }}>Live Poll · {totalVotes} vote{totalVotes !== 1 ? "s" : ""}</div>
                    <div style={{ fontFamily: "var(--font-fraunces), Georgia, serif", fontSize: "1rem", fontWeight: 700, color: T.ink, marginBottom: "1rem", lineHeight: 1.4 }}>{poll.question}</div>
                    <div style={{ display: "flex", flexDirection: "column" as const, gap: "0.55rem" }}>
                      {poll.options.map((opt, i) => {
                        const pct = totalVotes > 0 ? Math.round((poll.votes[i] / totalVotes) * 100) : 0;
                        const voted = myVote === i;
                        const canVote = !isOrg && myVote === null;
                        return (
                          <button key={i} onClick={() => canVote && castVote(i)} disabled={isOrg || myVote !== null}
                            style={{ position: "relative", width: "100%", padding: "0.65rem 0.85rem", borderRadius: 10, border: `1.5px solid ${voted ? T.leaf : myVote !== null || isOrg ? T.border : T.border}`, background: myVote !== null || isOrg ? "transparent" : T.cream, cursor: canVote ? "pointer" : "default", textAlign: "left" as const, overflow: "hidden", transition: "border-color 0.15s" }}>
                            {(myVote !== null || isOrg) && (
                              <div style={{ position: "absolute", inset: 0, background: voted ? "rgba(29,107,60,0.12)" : "rgba(226,222,214,0.4)", width: `${pct}%`, borderRadius: 9, transition: "width 0.4s" }} />
                            )}
                            <div style={{ position: "relative", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                              <span style={{ fontSize: "0.83rem", fontWeight: voted ? 700 : 500, color: voted ? T.leaf : T.ink }}>{opt}</span>
                              {(myVote !== null || isOrg) && <span style={{ fontSize: "0.75rem", fontWeight: 700, color: voted ? T.leaf : T.inkMuted }}>{pct}%</span>}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                    {myVote !== null && <div style={{ marginTop: "0.85rem", fontSize: "0.78rem", color: T.leaf, fontWeight: 600, textAlign: "center" as const }}>✓ Vote recorded</div>}
                    {isOrg && (
                      <button onClick={() => { setPoll(null); setMyVote(null); }} style={{ marginTop: "1rem", width: "100%", background: "none", border: `1.5px solid ${T.border}`, borderRadius: 100, padding: "0.45rem", fontFamily: "var(--font-dm-sans), sans-serif", fontSize: "0.78rem", color: T.inkMuted, cursor: "pointer" }}>End poll</button>
                    )}
                  </div>
                )}
                {!isOrg && !poll && (
                  <div style={{ textAlign: "center" as const, color: T.inkMuted, fontSize: "0.82rem", padding: "2rem 0" }}>
                    <div style={{ fontSize: "1.5rem", marginBottom: "0.5rem" }}>📊</div>
                    No poll active yet. The instructor will launch one during the session.
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── End Session confirmation modal ── */}
      {showEndConfirm && (
        <div style={{ position: "fixed", inset: 0, zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }}>
          {/* Backdrop */}
          <div onClick={() => !endingSession && setShowEndConfirm(false)} style={{ position: "absolute", inset: 0, background: "rgba(8,14,10,0.78)", backdropFilter: "blur(6px)" }} />

          {/* Card */}
          <div style={{ position: "relative", width: "100%", maxWidth: 420, background: "#13201a", border: "1px solid rgba(255,255,255,0.09)", borderRadius: 20, overflow: "hidden", boxShadow: "0 32px 80px rgba(0,0,0,0.6)", animation: "modalIn 0.22s ease" }}>

            {/* Subtle top accent line */}
            <div style={{ height: 3, background: "linear-gradient(90deg, #1d6b3c, #145c30, #0f4524)" }} />

            <div style={{ padding: "2rem 2rem 1.75rem" }}>
              {/* Icon */}
              <div style={{ width: 52, height: 52, borderRadius: 16, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "1.25rem" }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="18" height="18" rx="3"/>
                </svg>
              </div>

              {/* Heading */}
              <div style={{ fontFamily: "var(--font-fraunces), Georgia, serif", fontSize: "1.35rem", fontWeight: 700, color: "#fff", letterSpacing: "-0.02em", marginBottom: "0.5rem" }}>
                Wrap up this session?
              </div>
              <div style={{ fontSize: "0.83rem", color: "rgba(255,255,255,0.45)", lineHeight: 1.6, marginBottom: "1.5rem" }}>
                This will end the session for everyone and mark it as completed.
              </div>

              {/* Stats row */}
              <div style={{ display: "flex", gap: "0.75rem", marginBottom: "1.75rem" }}>
                <div style={{ flex: 1, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12, padding: "0.75rem 1rem" }}>
                  <div style={{ fontSize: "1.1rem", fontWeight: 700, color: "#fff", fontFamily: "var(--font-fraunces), Georgia, serif", lineHeight: 1 }}>{fmtDuration(elapsedSec)}</div>
                  <div style={{ fontSize: "0.68rem", color: "rgba(255,255,255,0.35)", marginTop: "0.3rem", letterSpacing: "0.04em", textTransform: "uppercase" as const }}>Duration</div>
                </div>
                <div style={{ flex: 1, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12, padding: "0.75rem 1rem" }}>
                  <div style={{ fontSize: "1.1rem", fontWeight: 700, color: "#fff", fontFamily: "var(--font-fraunces), Georgia, serif", lineHeight: 1 }}>{onlineCount}</div>
                  <div style={{ fontSize: "0.68rem", color: "rgba(255,255,255,0.35)", marginTop: "0.3rem", letterSpacing: "0.04em", textTransform: "uppercase" as const }}>Watching</div>
                </div>
                {isRecording && (
                  <div style={{ flex: 1, background: "rgba(29,107,60,0.12)", border: "1px solid rgba(29,107,60,0.25)", borderRadius: 12, padding: "0.75rem 1rem" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                      <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#4ade80", flexShrink: 0 }} />
                      <div style={{ fontSize: "0.78rem", fontWeight: 700, color: "#4ade80", lineHeight: 1 }}>Saved</div>
                    </div>
                    <div style={{ fontSize: "0.68rem", color: "rgba(74,222,128,0.55)", marginTop: "0.3rem", letterSpacing: "0.04em", textTransform: "uppercase" as const }}>Recording</div>
                  </div>
                )}
              </div>

              {/* Buttons */}
              <div style={{ display: "flex", gap: "0.75rem" }}>
                <button
                  onClick={() => setShowEndConfirm(false)}
                  disabled={endingSession}
                  style={{ flex: 1, padding: "0.75rem", borderRadius: 12, border: "1px solid rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.75)", fontFamily: "var(--font-dm-sans), sans-serif", fontSize: "0.88rem", fontWeight: 600, cursor: "pointer", transition: "all 0.15s" }}
                >
                  Keep Going
                </button>
                <button
                  onClick={doEndSession}
                  disabled={endingSession}
                  style={{ flex: 1, padding: "0.75rem", borderRadius: 12, border: "none", background: endingSession ? "rgba(255,255,255,0.08)" : "linear-gradient(135deg, #1a1f1c, #0f1410)", color: endingSession ? "rgba(255,255,255,0.3)" : "rgba(255,255,255,0.9)", fontFamily: "var(--font-dm-sans), sans-serif", fontSize: "0.88rem", fontWeight: 700, cursor: endingSession ? "default" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem", boxShadow: endingSession ? "none" : "0 2px 12px rgba(0,0,0,0.4)", transition: "all 0.15s" }}
                >
                  {endingSession
                    ? <><span style={{ width: 14, height: 14, border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "rgba(255,255,255,0.7)", borderRadius: "50%", display: "inline-block", animation: "spin 0.7s linear infinite" }} /> Ending…</>
                    : "End Session"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes pulse-live { 0%,100%{opacity:1} 50%{opacity:0.4} }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes slideDown { from { opacity:0; transform:translateY(-8px); } to { opacity:1; transform:translateY(0); } }
        @keyframes modalIn { from { opacity:0; transform:scale(0.95) translateY(8px); } to { opacity:1; transform:scale(1) translateY(0); } }
      `}</style>
    </>
  );
}

// ── Small helper component ────────────────────────────────────────────────────
function CtrlBtn({ children, onClick, title, active }: { children: React.ReactNode; onClick: () => void; title?: string; active?: boolean }) {
  const [hovered, setHovered] = React.useState(false);
  return (
    <div
      style={{ position: "relative", flexShrink: 0 }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Custom tooltip */}
      {title && hovered && (
        <div style={{
          position: "absolute",
          bottom: "calc(100% + 8px)",
          left: "50%",
          transform: "translateX(-50%)",
          background: "rgba(10,14,11,0.92)",
          color: "#fff",
          fontSize: "0.68rem",
          fontWeight: 600,
          padding: "0.28rem 0.65rem",
          borderRadius: 6,
          whiteSpace: "nowrap",
          pointerEvents: "none",
          fontFamily: "var(--font-dm-sans), sans-serif",
          zIndex: 20,
          boxShadow: "0 2px 8px rgba(0,0,0,0.4)",
          letterSpacing: "0.01em",
        }}>
          {title}
          <div style={{
            position: "absolute",
            top: "100%",
            left: "50%",
            transform: "translateX(-50%)",
            width: 0,
            height: 0,
            borderLeft: "5px solid transparent",
            borderRight: "5px solid transparent",
            borderTop: "5px solid rgba(10,14,11,0.92)",
          }} />
        </div>
      )}
      <div
        onClick={onClick}
        style={{
          width: 36, height: 36, borderRadius: "50%",
          background: active === false ? "rgba(239,68,68,0.35)" : "rgba(0,0,0,0.55)",
          backdropFilter: "blur(4px)",
          border: `1px solid ${active === false ? "rgba(239,68,68,0.4)" : "rgba(255,255,255,0.1)"}`,
          color: "rgba(255,255,255,0.75)", display: "flex", alignItems: "center", justifyContent: "center",
          cursor: "pointer",
          transition: "background 0.15s, border-color 0.15s",
        }}
      >
        {children}
      </div>
    </div>
  );
}
