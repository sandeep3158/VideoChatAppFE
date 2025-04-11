import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Peer from "simple-peer";
import { io } from "socket.io-client";
import { ChatComp } from "./ChatComp";
import { LoadingSpinner } from "./LoadingSpinner";
import { Lobby } from "./Lobby";
import { NoUserFound } from "./NoUserFound";
import { Streams } from "./Streams";

const SOCKET_SERVER_URL = import.meta.env.VITE_BEURL;

const socket = io(SOCKET_SERVER_URL, { autoConnect: true });

const Chat = () => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [username, setUsername] = useState("");
  const [showChat, setShowChat] = useState(false);
  const [roomId, setRoomId] = useState(null);
  const [users, setUsers] = useState([]);
  const [socketId, setSocketId] = useState(null);
  const [localStream, setLocalStream] = useState();
  const [remoteStream, setRemoteStream] = useState();
  const [loading, setLoading] = useState(false);
  const [isLaoding, setIsLoading] = useState(false);
  const [isUserNotFound, setIsUserNotFound] = useState(false);
  const connectionRef = useRef();

  const activeUsers = useMemo(() => {
    if (socketId && users?.length > 0) {
      return (users || []).filter((user) => {
        return user.socketId !== socketId;
      });
    }
    return [];
  }, [socketId, users]);

  console.log('isActive', !!activeUsers.length);
  const stopMediaTracks = useCallback((stream) => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
    }
  }, []);

  const getMediaStream = useCallback(async () => {
    try {
      setLoading(true);

      if (localStream) {
        stopMediaTracks(localStream);
      }

      if (navigator.permissions) {
        try {
          const camPerm = await navigator.permissions.query({ name: "camera" });
          const micPerm = await navigator.permissions.query({
            name: "microphone",
          });

          if (camPerm.state === "denied" || micPerm.state === "denied") {
            alert(
              "Camera or microphone permission is blocked. Please enable it from your browser settings."
            );

            return;
          }
        } catch (permError) {
          console.warn("Permissions API failed:", permError);
        }
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user" },
        audio: true,
      });

      setLoading(false);
      return stream;
    } catch (error) {
      console.error(
        `Error accessing media devices: ${error.name} - ${error.message}`
      );

      if (error.name === "NotAllowedError") {
        alert("Permission denied. Please allow camera and microphone access.");
      } else if (error.name === "NotFoundError") {
        alert("No camera/microphone found. Check if your device is connected.");
      } else if (error.name === "AbortError") {
        alert("Camera is busy or unavailable. Try restarting your device.");
      } else if (error.name === "NotReadableError") {
        alert("Camera is already in use by another application.");
      } else {
        alert("Something went wrong while accessing your camera/mic.");
      }

      setLoading(false);
      throw error;
    }
  }, [localStream, stopMediaTracks]);

  const handleEnterChat = useCallback(
    async (e) => {
      e.preventDefault();
      const formData = new FormData(e.target);
      const name = formData.get("username");
      setIsLoading(true);
      if (name.trim()) {
        socket.emit("user entered", { username: name });
        const stream = await getMediaStream();
        setLocalStream(stream);
        setShowChat(true);
        setUsername(name);
        e.target.reset();
      }
    },
    [getMediaStream]
  );

  const sendMessage = useCallback(() => {
    if (input.trim()) {
      socket.emit("send chat message", { msg: input, roomId });
      setInput("");
    }
  }, [input, roomId]);

  const handleEndChat = useCallback(() => {
    if (roomId) {
      socket.emit("end chat", roomId);
      connectionRef.current.destroy();
    }
  }, [roomId]);

  useEffect(() => {
    let timeOutId;
    if (isLaoding && !roomId) {
      timeOutId = setTimeout(() => {
        setIsUserNotFound(true);
      }, 30000);
    }
    return () => clearTimeout(timeOutId);
  }, [isLaoding, roomId]);

  useEffect(() => {
    if (activeUsers.length === 0 || !socketId) return;
    const availableUsers = activeUsers.filter(
      (user) => !user.isBusy && user.socketId !== socketId
    );

    if (availableUsers.length === 0) {
      return;
    }

    const randomUser =
      availableUsers[Math.floor(Math.random() * availableUsers.length)];

    if (!randomUser) return;

    if (!loading && socketId < randomUser.socketId) {
      socket.emit("invite private chat", randomUser.socketId);
    }
  }, [activeUsers, loading, socketId]);

  useEffect(() => {
    socket.on("get user list", (userList) => {
      setUsers(userList);
    });

    socket.on("get socket id", (socketId) => {
      setSocketId(socketId);
    });

    socket.on("invite requested", (inviterId) => {
      socket.emit("invite accepted", inviterId);
    });

    socket.on("enter chat room", (room) => {
      setRoomId(room?.roomId);
      const peerSocketId = room?.users.find((item) => item !== socketId);
      const isInitiator = socketId < peerSocketId;

      if (isInitiator) {
        try {
          const peer = new Peer({
            initiator: true,
            trickle: false,
            stream: localStream,
          });

          peer.on("signal", (sdp) => {
            socket.emit("callUser", {
              userToCall: peerSocketId,
              signalData: sdp,
              from: socketId,
              name: username,
            });
          });

          peer.on("stream", (remoteStream) => {
            setRemoteStream(remoteStream);
            setIsLoading(false);
          });

          socket.on("callAccepted", (signal) => {
            if (peer && !peer.destroyed && typeof peer.signal === "function") {
              peer.signal(signal);
              setLoading(false);
            } else {
              console.warn(
                "Signal skipped: Peer is destroyed or not initialized."
              );
            }
          });

          connectionRef.current = peer;
        } catch (error) {
          console.error("Call initiation failed:", error);
        }
      }
    });

    socket.on("receive chat message", (messageData) => {
      setMessages((prev) => [...prev, messageData]);
    });

    socket.on("close chat room", () => {
      setShowChat(false);
      setRoomId(null);
      setMessages([]);
      connectionRef.current.destroy();
    });

    socket.on("getUserCall", async (data) => {
      try {
        const stream = await getMediaStream();
        setLocalStream(stream);

        const peer = new Peer({
          initiator: false,
          trickle: false,
          stream: stream,
        });

        peer.on("signal", (signal) => {
          socket.emit("answerCall", { signal, to: data.from });
        });

        peer.on("stream", (remoteStream) => {
          setRemoteStream(remoteStream);
          setIsLoading(false);
        });

        peer.signal(data.signal);
        connectionRef.current = peer;
      } catch (error) {
        console.error("Error answering call:", error);
      }
    });

    socket.on("close chat room", () => {
      stopMediaTracks(localStream);
      setShowChat(false);
      setRoomId(null);
      setRoomId(null);
      setRemoteStream(null);
      setLocalStream(null);
      setUsername("");
      setInput("");
      setSocketId(null);
      setUsers([]);
      setLoading(false);
      setMessages([]);
    });

    return () => {
      socket.off("get user list");
      socket.off("get socket id");
      socket.off("callAccepted");
      socket.off("invite requested");
      socket.off("enter chat room");
      socket.off("receive chat message");
      socket.off("close chat room");
      socket.off("getUserCall");
      socket.off("close chat room");
    };
  }, [getMediaStream, localStream, socketId, stopMediaTracks, username]);

  return isUserNotFound ? (
    <NoUserFound />
  ) : loading || isLaoding ? (
    <div className="flex items-center justify-center h-screen bg-gray-100">
      <LoadingSpinner />
    </div>
  ) : (
    <div className="p-4 bg-gradient-to-br from-blue-50 to-white overflow-auto">
      {!showChat ? (
        <Lobby onEnterChat={handleEnterChat} />
      ) : (
        <div className="p-3 bg-gradient-to-br from-blue-50 to-white h-[calc(100vh-120px)]">
          {/* Header */}
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
