import { useCallback, useEffect, useRef, useState } from "react";
import Peer from "simple-peer";
import { io } from "socket.io-client";
import { ChatComp } from "./ChatComp";
import { LoadingSpinner } from "./LoadingSpinner";
import { Lobby } from "./Lobby";
import { NoUserFound } from "./NoUserFound";
import { Streams } from "./Streams";

const SOCKET_SERVER_URL = import.meta.env.VITE_BEURL;
const NO_PEER_TIMEOUT   = 30_000;   // 30s  — no peer found at all
const SIGNALING_TIMEOUT = 120_000;  // 2min — peer found, waiting for WebRTC

const socket = io(SOCKET_SERVER_URL, { autoConnect: true });

const Chat = () => {
  const [messages,       setMessages]       = useState([]);
  const [input,          setInput]          = useState("");
  const [username,       setUsername]       = useState("");
  const [showChat,       setShowChat]       = useState(false);
  const [roomId,         setRoomId]         = useState(null);
  const [socketId,       setSocketId]       = useState(null);
  const [localStream,    setLocalStream]    = useState(null);
  const [remoteStream,   setRemoteStream]   = useState(null);
  const [loading,        setLoading]        = useState(false);
  const [isLaoding,      setIsLoading]      = useState(false);
  const [isUserNotFound, setIsUserNotFound] = useState(false);
  const [mediaError,     setMediaError]     = useState(null);
  const [isRetrying,     setIsRetrying]     = useState(false);

  const connectionRef    = useRef(null);
  const timeoutRef       = useRef(null);
  const localStreamRef   = useRef(null);
  const socketIdRef      = useRef(null);
  const isUserNotFoundRef = useRef(false);
  const usernameRef      = useRef("");

  useEffect(() => { localStreamRef.current    = localStream;    }, [localStream]);
  useEffect(() => { socketIdRef.current       = socketId;       }, [socketId]);
  useEffect(() => { isUserNotFoundRef.current = isUserNotFound; }, [isUserNotFound]);
  useEffect(() => { usernameRef.current       = username;       }, [username]);

  const stopMediaTracks = useCallback((stream) => {
    stream?.getTracks().forEach((track) => track.stop());
  }, []);

  const getMediaStream = useCallback(async () => {
    try {
      setLoading(true);
      setMediaError(null);

      if (localStreamRef.current) stopMediaTracks(localStreamRef.current);

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user" },
        audio: true,
      });

      setLoading(false);
      return stream;
    } catch (error) {
      setLoading(false);
      let message = "";
      switch (error.name) {
        case "NotAllowedError":
        case "PermissionDeniedError":
          message = "Camera & microphone access was denied. Click the 🔒 icon in your browser's address bar, allow access, then try again.";
          break;
        case "NotFoundError":
        case "DevicesNotFoundError":
          message = "No camera or microphone found. Please connect a device and try again.";
          break;
        case "NotReadableError":
        case "TrackStartError":
          message = "Your camera or mic is already in use by another app. Close it and try again.";
          break;
        case "AbortError":
          message = "Media access was interrupted. Please try again.";
          break;
        default:
          message = "Unable to access camera/mic. Please check your device and try again.";
      }
      setMediaError(message);
      return null;
    }
  }, [stopMediaTracks]);

  // ── Timeout ────────────────────────────────────────────────────────────────

  const clearMatchTimeout = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const startMatchTimeout = useCallback((signalingHasStarted) => {
    clearMatchTimeout();
    const duration = signalingHasStarted ? SIGNALING_TIMEOUT : NO_PEER_TIMEOUT;
    timeoutRef.current = setTimeout(() => {
      setIsUserNotFound(true);
      setIsRetrying(false);
    }, duration);
  }, [clearMatchTimeout]);

  // ── Peer ───────────────────────────────────────────────────────────────────

  const destroyPeer = useCallback(() => {
    if (connectionRef.current) {
      connectionRef.current.destroy();
      connectionRef.current = null;
    }
  }, []);

  // ── Matching ───────────────────────────────────────────────────────────────

  const startMatching = useCallback((name) => {
    destroyPeer();
    setIsUserNotFound(false);
    setIsRetrying(true);
    setRoomId(null);
    setRemoteStream(null);
    socket.emit("user entered", { username: name });
    startMatchTimeout(false);
  }, [destroyPeer, startMatchTimeout]);

  // ── Handlers ───────────────────────────────────────────────────────────────

  const handleEnterChat = useCallback(async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const name = formData.get("username");
    if (!name.trim()) return;

    const stream = await getMediaStream();
    if (!stream) return; // gate — no stream = no entry

    setIsLoading(true);
    setLocalStream(stream);
    setShowChat(true);
    setUsername(name);
    e.target.reset();
    startMatching(name);
  }, [getMediaStream, startMatching]);

  // Retry from NoUserFound — user is deleted from DB on end chat,
  // so retry re-registers them fresh via startMatching → "user entered"
  const handleRetry = useCallback(() => {
    const name = usernameRef.current;
    if (!name) return;
    startMatching(name);
  }, [startMatching]);

  const sendMessage = useCallback(() => {
    if (input.trim()) {
      socket.emit("send chat message", { msg: input, roomId });
      setInput("");
    }
  }, [input, roomId]);

  const handleEndChat = useCallback(() => {
    if (roomId) socket.emit("end chat", roomId);
  }, [roomId]);

  // ── Lifecycle ──────────────────────────────────────────────────────────────

  useEffect(() => () => clearMatchTimeout(), [clearMatchTimeout]);

  useEffect(() => {
    const handleUnload = () => handleEndChat();
    window.addEventListener("beforeunload", handleUnload);
    window.addEventListener("unload",       handleUnload);
    return () => {
      window.removeEventListener("beforeunload", handleUnload);
      window.removeEventListener("unload",       handleUnload);
    };
  }, [handleEndChat]);

  // ── Socket listeners — registered ONCE on mount via empty deps ────────────

  useEffect(() => {
    socket.on("get socket id", (id) => {
      setSocketId(id);
      socketIdRef.current = id;
    });

    socket.on("getMatchedPeer", (peerSocketId) => {
      const currentSocketId = socketIdRef.current;
      if (!peerSocketId || !currentSocketId) return;

      // Peer appeared while on NoUserFound — auto-retry
      if (isUserNotFoundRef.current) {
        startMatching(usernameRef.current);
        return;
      }

      if (currentSocketId < peerSocketId) {
        socket.emit("invite private chat", peerSocketId);
      }
    });

    socket.on("invite requested", (inviterId) => {
      socket.emit("invite accepted", inviterId);
    });

    // callAccepted registered here (top level) — never duplicated
    socket.on("callAccepted", (signal) => {
      const peer = connectionRef.current;
      if (peer && !peer.destroyed && typeof peer.signal === "function") {
        peer.signal(signal);
      } else {
        console.warn("callAccepted: peer not ready, ignoring signal");
      }
    });

    socket.on("enter chat room", (room) => {
      setIsRetrying(false);
      // Signaling started — upgrade to 2min timeout unconditionally
      startMatchTimeout(true);

      setRoomId(room?.roomId);
      const currentSocketId = socketIdRef.current;
      const peerSocketId    = room?.users.find((id) => id !== currentSocketId);
      const isInitiator     = currentSocketId < peerSocketId;

      if (!isInitiator) return; // non-initiator waits for getUserCall

      try {
        const stream = localStreamRef.current;

        const peer = new Peer({
          initiator: true,
          trickle:   false,
          stream,
        });

        peer.on("signal", (sdp) => {
          socket.emit("callUser", {
            userToCall: peerSocketId,
            signalData: sdp,
            from:       currentSocketId,
          });
        });

        peer.on("stream", (remote) => {
          setRemoteStream(remote);
          setIsLoading(false);
          clearMatchTimeout(); // fully connected — no timeout needed
        });

        peer.on("error", (err) => {
          console.error("Peer error (initiator):", err);
        });

        connectionRef.current = peer;
      } catch (error) {
        console.error("Call initiation failed:", error);
      }
    });

    socket.on("receive chat message", (messageData) => {
      setMessages((prev) => [...prev, messageData]);
    });

    socket.on("getUserCall", async (data) => {
      try {
        // Use existing stream — never request camera again on receiver side
        let stream = localStreamRef.current;

        if (!stream) {
          // Fallback: should not happen if handleEnterChat ran correctly
          try {
            stream = await navigator.mediaDevices.getUserMedia({
              video: { facingMode: "user" },
              audio: true,
            });
            setLocalStream(stream);
          } catch {
            return; // no stream — can't answer
          }
        }

        // Signaling starting on receiver side too — upgrade timeout
        startMatchTimeout(true);

        const peer = new Peer({
          initiator: false,
          trickle:   false,
          stream,
        });

        peer.on("signal", (signal) => {
          socket.emit("answerCall", { signal, to: data.from });
        });

        peer.on("stream", (remote) => {
          setRemoteStream(remote);
          setIsLoading(false);
          clearMatchTimeout(); // fully connected
        });

        peer.on("error", (err) => {
          console.error("Peer error (receiver):", err);
        });

        peer.signal(data.signal);
        connectionRef.current = peer;
      } catch (error) {
        console.error("Error answering call:", error);
      }
    });

    socket.on("close chat room", () => {
      // Stop tracks and clean up peer
      stopMediaTracks(localStreamRef.current);
      clearMatchTimeout();
      destroyPeer();

      // Reset all state — user goes back to Lobby to re-enter
      // (BE has deleted their DB entry so they must re-register)
      setShowChat(false);
      setRoomId(null);
      setRemoteStream(null);
      setLocalStream(null);
      setUsername("");
      setInput("");
      setSocketId(null);
      setLoading(false);
      setIsLoading(false);
      setMessages([]);
      setMediaError(null);
      setIsRetrying(false);
      // Note: do NOT reset isUserNotFound here —
      // close chat room fires during normal end chat, not a "not found" scenario
    });

    return () => {
      socket.off("get socket id");
      socket.off("getMatchedPeer");
      socket.off("invite requested");
      socket.off("callAccepted");
      socket.off("enter chat room");
      socket.off("receive chat message");
      socket.off("close chat room");
      socket.off("getUserCall");
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Render ─────────────────────────────────────────────────────────────────

  return isUserNotFound ? (
    <NoUserFound onRetry={handleRetry} isRetrying={isRetrying} />
  ) : loading || isLaoding ? (
    <div className="flex items-center justify-center h-screen bg-gray-100">
      <LoadingSpinner />
    </div>
  ) : (
    <div className="p-4 bg-gradient-to-br from-blue-50 to-white overflow-auto">
      {!showChat ? (
        <>
          {mediaError && (
            <div className="max-w-md mx-auto mb-4 p-4 bg-red-50 border border-red-300 rounded-lg flex flex-col gap-3">
              <div className="flex items-start gap-3">
                <span className="text-xl">🎥</span>
                <p className="text-sm text-red-800">{mediaError}</p>
              </div>
              <button
                onClick={() => setMediaError(null)}
                className="self-start text-xs text-red-600 underline"
              >
                Dismiss
              </button>
            </div>
          )}
          <Lobby onEnterChat={handleEnterChat} />
        </>
      ) : (
        <div className="p-3 bg-gradient-to-br from-blue-50 to-white h-[calc(100vh-120px)]">
          <header className="flex justify-between items-center mb-2">
            <h2 className="text-2xl font-bold text-gray-800">
              Welcome, {username}
            </h2>
            <button
              onClick={handleEndChat}
              className="px-4 py-2 text-red-600 border border-red-600 rounded hover:bg-red-600 hover:text-white transition-colors duration-200"
            >
              End Chat
            </button>
          </header>
          <div className="flex gap-4 h-full">
            <Streams localStream={localStream} remoteStream={remoteStream} />
            <ChatComp
              socketId={socketId}
              messages={messages}
              input={input}
              setInput={setInput}
              sendMessage={sendMessage}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default Chat;