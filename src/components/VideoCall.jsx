import { useState, useEffect, useRef} from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import io from 'socket.io-client';
import { 
  Video, 
  VideoOff, 
  Mic, 
  MicOff,  
  PhoneOff, 
  Monitor, 
  MonitorOff,
  MessageCircle,
  Send,
  Users,
  Copy,
  UserX,
  Crown
} from 'lucide-react';

import apiService from '../api';

const rtcConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' }
  ]
};

const VideoCall = () => {
    const { roomId } = useParams();
    const navigate = useNavigate();
    const [urlParams] = useState(new URLSearchParams(window.location.search));
    const userId = urlParams.get('userId');
    const userName = urlParams.get('name');

    const [socket, setSocket] = useState(null);
    const [localStream, setLocalStream] = useState(null);
    const [remoteStreams, setRemoteStreams] = useState(new Map());
    const [participants, setParticipants] = useState([]);
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [isAudioMuted, setIsAudioMuted] = useState(false);
    const [isVideoEnabled, setIsVideoEnabled] = useState(true);
    const [isScreenSharing, setIsScreenSharing] = useState(false);
    const [showChat, setShowChat] = useState(false);
    const [showParticipants, setShowParticipants] = useState(false);
    const [roomInfo, setRoomInfo] = useState(null);

    const localVideoRef = useRef(null);
    const peerConnections = useRef(new Map());
    const chatEndRef = useRef(null);

    const currentUser = participants.find(p => p.id === userId);
    const isHost = currentUser?.isHost || false;

    useEffect(() => {
        if (!roomId || !userId || !userName) {
            navigate('/');
            return;
        }

        const newSocket = io('http://localhost:3000', {
            transports: ['websocket', 'polling']
        });

        setSocket(newSocket);

        // Socket event listeners
        newSocket.on('connect', () => {
            console.log('Connected to server');
            newSocket.emit('join-room', { roomId, userId });
        });

        newSocket.on('room-participants', (data) => {
            setParticipants(data.participants);
        });

        newSocket.on('user-joined', (data) => {
            setParticipants(prev => [...prev, data.participant]);
            initializePeerConnection(data.participant.id, newSocket);
        });

        newSocket.on('user-left', (data) => {
            setParticipants(prev => prev.filter(p => p.id !== data.userId));
            setRemoteStreams(prev => {
                const newMap = new Map(prev);
                newMap.delete(data.userId);
                return newMap;
            });
            peerConnections.current.delete(data.userId);
        });

        newSocket.on('offer', handleOffer);
        newSocket.on('answer', handleAnswer);
        newSocket.on('ice-candidate', handleIceCandidate);

        newSocket.on('participant-audio-toggle', (data) => {
            setParticipants(prev => prev.map(p =>
                p.id === data.userId ? { ...p, isAudioMuted: data.isAudioMuted } : p
            ));
        });

        newSocket.on('participant-video-toggle', (data) => {
            setParticipants(prev => prev.map(p =>
                p.id === data.userId ? { ...p, isVideoEnabled: data.isVideoEnabled } : p
            ));
        });

        newSocket.on('participant-kicked', (data) => {
            setParticipants(prev => prev.filter(p => p.id !== data.userId));
        });

        newSocket.on('kicked', (data) => {
            alert(data.reason);
            navigate('/');
        });

        newSocket.on('room-closed', (data) => {
            alert(data.reason);
            navigate('/');
        });

        newSocket.on('host-changed', (data) => {
            setParticipants(prev => prev.map(p => ({
                ...p,
                isHost: p.id === data.newHostId
            })));
        });

        newSocket.on('chat-message', (message) => {
            setMessages(prev => [...prev, message]);
        });

        newSocket.on('error', (error) => {
            console.error('Socket error:', error);
            alert(error.message);
        });

        // Get user media
        initializeMedia();

        return () => {
            if (localStream) {
                localStream.getTracks().forEach(track => track.stop());
            }
            peerConnections.current.forEach(pc => pc.close());
            newSocket.disconnect();
        };
    }, [roomId, userId, userName, navigate]);

    // Get room info
    useEffect(() => {
        const fetchRoomInfo = async () => {
            try {
                const info = await apiService.getRoomInfo(roomId);
                setRoomInfo(info);
            } catch (error) {
                console.error('Failed to fetch room info:', error);
            }
        };

        if (roomId) {
            fetchRoomInfo();
        }
    }, [roomId]);

    // Auto-scroll chat
    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const initializeMedia = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: true,
                audio: true
            });
            setLocalStream(stream);
            if (localVideoRef.current) {
                localVideoRef.current.srcObject = stream;
            }
        } catch (error) {
            console.error('Failed to get user media:', error);
            alert('Failed to access camera/microphone. Please check permissions.');
        }
    };

    const initializePeerConnection = (participantId, socketInstance) => {
        if (participantId === userId) return;

        const peerConnection = new RTCPeerConnection(rtcConfiguration);

        // Add local stream tracks
        if (localStream) {
            localStream.getTracks().forEach(track => {
                peerConnection.addTrack(track, localStream);
            });
        }

        // Handle remote stream
        peerConnection.ontrack = (event) => {
            const [remoteStream] = event.streams;
            setRemoteStreams(prev => new Map(prev.set(participantId, remoteStream)));
        };

        // Handle ICE candidates
        peerConnection.onicecandidate = (event) => {
            if (event.candidate) {
                socketInstance.emit('ice-candidate', {
                    target: participantId,
                    candidate: event.candidate
                });
            }
        };

        peerConnections.current.set(participantId, peerConnection);
        return peerConnection;
    };

    const handleOffer = async (data) => {
        const peerConnection = initializePeerConnection(data.sender, socket);

        try {
            await peerConnection.setRemoteDescription(data.offer);
            const answer = await peerConnection.createAnswer();
            await peerConnection.setLocalDescription(answer);

            socket.emit('answer', {
                target: data.sender,
                answer: answer
            });
        } catch (error) {
            console.error('Error handling offer:', error);
        }
    };

    const handleAnswer = async (data) => {
        const peerConnection = peerConnections.current.get(data.sender);
        if (peerConnection) {
            try {
                await peerConnection.setRemoteDescription(data.answer);
            } catch (error) {
                console.error('Error handling answer:', error);
            }
        }
    };

    const handleIceCandidate = async (data) => {
        const peerConnection = peerConnections.current.get(data.sender);
        if (peerConnection) {
            try {
                await peerConnection.addIceCandidate(data.candidate);
            } catch (error) {
                console.error('Error handling ICE candidate:', error);
            }
        }
    };

    const toggleAudio = () => {
        if (localStream) {
            const audioTrack = localStream.getAudioTracks()[0];
            if (audioTrack) {
                audioTrack.enabled = !audioTrack.enabled;
                setIsAudioMuted(!audioTrack.enabled);
                socket?.emit('toggle-audio', { isAudioMuted: !audioTrack.enabled });
            }
        }
    };

    const toggleVideo = () => {
        if (localStream) {
            const videoTrack = localStream.getVideoTracks()[0];
            if (videoTrack) {
                videoTrack.enabled = !videoTrack.enabled;
                setIsVideoEnabled(videoTrack.enabled);
                socket?.emit('toggle-video', { isVideoEnabled: videoTrack.enabled });
            }
        }
    };

    const toggleScreenShare = async () => {
        try {
            if (!isScreenSharing) {
                const screenStream = await navigator.mediaDevices.getDisplayMedia({
                    video: true,
                    audio: true
                });

                // Replace video track in peer connections
                const videoTrack = screenStream.getVideoTracks()[0];
                peerConnections.current.forEach(pc => {
                    const sender = pc.getSenders().find(s =>
                        s.track && s.track.kind === 'video'
                    );
                    if (sender) {
                        sender.replaceTrack(videoTrack);
                    }
                });

                // Update local video
                if (localVideoRef.current) {
                    localVideoRef.current.srcObject = screenStream;
                }

                screenStream.getVideoTracks()[0].onended = () => {
                    toggleScreenShare();
                };

                setIsScreenSharing(true);
                socket?.emit('toggle-screen-share', { isScreenSharing: true });
            } else {
                // Switch back to camera
                const cameraStream = await navigator.mediaDevices.getUserMedia({
                    video: true,
                    audio: true
                });

                const videoTrack = cameraStream.getVideoTracks()[0];
                peerConnections.current.forEach(pc => {
                    const sender = pc.getSenders().find(s =>
                        s.track && s.track.kind === 'video'
                    );
                    if (sender) {
                        sender.replaceTrack(videoTrack);
                    }
                });

                if (localVideoRef.current) {
                    localVideoRef.current.srcObject = cameraStream;
                }

                setLocalStream(cameraStream);
                setIsScreenSharing(false);
                socket?.emit('toggle-screen-share', { isScreenSharing: false });
            }
        } catch (error) {
            console.error('Error toggling screen share:', error);
        }
    };

    const leaveCall = async () => {
        if (isHost) {
            const confirmEnd = window.confirm('As the host, ending the call will close the room for everyone. Continue?');
            if (confirmEnd) {
                try {
                    await apiService.deleteRoom(roomId, userId);
                } catch (error) {
                    console.error('Error ending room:', error);
                }
            } else {
                return;
            }
        }
        navigate('/');
    };

    const copyRoomId = () => {
        navigator.clipboard.writeText(roomId);
        alert('Room ID copied to clipboard!');
    };

    const kickParticipant = (participantId) => {
        const participant = participants.find(p => p.id === participantId);
        if (participant && window.confirm(`Kick ${participant.name} from the room?`)) {
            socket?.emit('kick-participant', {
                userId: participantId,
                reason: 'Removed by host'
            });
        }
    };

    const sendMessage = (e) => {
        e.preventDefault();
        if (newMessage.trim() && socket) {
            socket.emit('chat-message', { message: newMessage.trim() });
            setNewMessage('');
        }
    };

    const ParticipantVideo = ({ participant, stream }) => {
        const videoRef = useRef(null);

        useEffect(() => {
            if (videoRef.current && stream) {
                videoRef.current.srcObject = stream;
            }
        }, [stream]);

        return (
            <div className="relative bg-gray-900 rounded-lg overflow-hidden aspect-video">
                <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted={participant.id === userId}
                    className="w-full h-full object-cover"
                />
                <div className="absolute bottom-2 left-2 bg-black bg-opacity-50 text-white px-2 py-1 rounded text-sm flex items-center gap-1">
                    {participant.isHost && <Crown className="w-3 h-3 text-yellow-400" />}
                    {participant.name}
                    {!participant.isAudioMuted ? (
                        <Mic className="w-3 h-3" />
                    ) : (
                        <MicOff className="w-3 h-3 text-red-400" />
                    )}
                </div>
                {!participant.isVideoEnabled && (
                    <div className="absolute inset-0 bg-gray-800 flex items-center justify-center">
                        <VideoOff className="w-8 h-8 text-gray-400" />
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="h-screen bg-gray-900 flex flex-col">
            {/* Header */}
            <div className="bg-gray-800 text-white p-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <h1 className="text-xl font-semibold">Video Call</h1>
                    <div className="flex items-center gap-2 text-sm text-gray-300">
                        <span>Room: {roomId}</span>
                        <button
                            onClick={copyRoomId}
                            className="p-1 hover:bg-gray-700 rounded"
                        >
                            <Copy className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setShowParticipants(!showParticipants)}
                        className="p-2 hover:bg-gray-700 rounded flex items-center gap-1"
                    >
                        <Users className="w-5 h-5" />
                        <span className="text-sm">{participants.length}</span>
                    </button>

                    <button
                        onClick={() => setShowChat(!showChat)}
                        className="p-2 hover:bg-gray-700 rounded relative"
                    >
                        <MessageCircle className="w-5 h-5" />
                        {messages.length > 0 && (
                            <span className="absolute -top-1 -right-1 bg-red-500 text-xs rounded-full w-4 h-4 flex items-center justify-center">
                                {messages.length > 9 ? '9+' : messages.length}
                            </span>
                        )}
                    </button>
                </div>
            </div>

            <div className="flex-1 flex">
                {/* Main video area */}
                <div className="flex-1 p-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 h-full">
                        {/* Local video */}
                        <div className="relative bg-gray-800 rounded-lg overflow-hidden aspect-video">
                            <video
                                ref={localVideoRef}
                                autoPlay
                                playsInline
                                muted
                                className="w-full h-full object-cover"
                            />
                            <div className="absolute bottom-2 left-2 bg-black bg-opacity-50 text-white px-2 py-1 rounded text-sm flex items-center gap-1">
                                {isHost && <Crown className="w-3 h-3 text-yellow-400" />}
                                You
                                {!isAudioMuted ? (
                                    <Mic className="w-3 h-3" />
                                ) : (
                                    <MicOff className="w-3 h-3 text-red-400" />
                                )}
                            </div>
                            {!isVideoEnabled && (
                                <div className="absolute inset-0 bg-gray-800 flex items-center justify-center">
                                    <VideoOff className="w-8 h-8 text-gray-400" />
                                </div>
                            )}
                        </div>

                        {/* Remote videos */}
                        {participants
                            .filter(p => p.id !== userId)
                            .map(participant => (
                                <ParticipantVideo
                                    key={participant.id}
                                    participant={participant}
                                    stream={remoteStreams.get(participant.id)}
                                />
                            ))}
                    </div>
                </div>

                {/* Participants panel */}
                {showParticipants && (
                    <div className="w-80 bg-gray-800 text-white p-4 border-l border-gray-700">
                        <h3 className="text-lg font-semibold mb-4">Participants ({participants.length})</h3>
                        <div className="space-y-2">
                            {participants.map(participant => (
                                <div key={participant.id} className="flex items-center justify-between p-2 bg-gray-700 rounded">
                                    <div className="flex items-center gap-2">
                                        {participant.isHost && <Crown className="w-4 h-4 text-yellow-400" />}
                                        <span className={participant.id === userId ? 'font-semibold' : ''}>
                                            {participant.name}
                                            {participant.id === userId && ' (You)'}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        {!participant.isAudioMuted ? (
                                            <Mic className="w-4 h-4" />
                                        ) : (
                                            <MicOff className="w-4 h-4 text-red-400" />
                                        )}
                                        {participant.isVideoEnabled ? (
                                            <Video className="w-4 h-4" />
                                        ) : (
                                            <VideoOff className="w-4 h-4 text-red-400" />
                                        )}
                                        {isHost && participant.id !== userId && !participant.isHost && (
                                            <button
                                                onClick={() => kickParticipant(participant.id)}
                                                className="ml-2 p-1 hover:bg-gray-600 rounded"
                                                title="Kick participant"
                                            >
                                                <UserX className="w-4 h-4 text-red-400" />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Chat panel */}
                {showChat && (
                    <div className="w-80 bg-gray-800 text-white flex flex-col border-l border-gray-700">
                        <div className="p-4 border-b border-gray-700">
                            <h3 className="text-lg font-semibold">Chat</h3>
                        </div>

                        <div className="flex-1 overflow-y-auto p-4 space-y-3">
                            {messages.map(message => (
                                <div key={message.id} className="bg-gray-700 rounded p-3">
                                    <div className="flex items-center gap-2 text-sm text-gray-300 mb-1">
                                        <span className="font-medium">{message.userName}</span>
                                        <span>{new Date(message.timestamp).toLocaleTimeString()}</span>
                                    </div>
                                    <p className="text-white">{message.message}</p>
                                </div>
                            ))}
                            <div ref={chatEndRef} />
                        </div>

                        <form onSubmit={sendMessage} className="p-4 border-t border-gray-700">
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={newMessage}
                                    onChange={(e) => setNewMessage(e.target.value)}
                                    placeholder="Type a message..."
                                    className="flex-1 bg-gray-700 text-white px-3 py-2 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                                <button
                                    type="submit"
                                    disabled={!newMessage.trim()}
                                    className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 p-2 rounded"
                                >
                                    <Send className="w-5 h-5" />
                                </button>
                            </div>
                        </form>
                    </div>
                )}
            </div>

            {/* Controls */}
            <div className="bg-gray-800 p-4 flex justify-center gap-4">
                <button
                    onClick={toggleAudio}
                    className={`p-3 rounded-full transition-colors ${isAudioMuted ? 'bg-red-600 hover:bg-red-700' : 'bg-gray-600 hover:bg-gray-700'
                        }`}
                >
                    {isAudioMuted ? (
                        <MicOff className="w-6 h-6 text-white" />
                    ) : (
                        <Mic className="w-6 h-6 text-white" />
                    )}
                </button>

                <button
                    onClick={toggleVideo}
                    className={`p-3 rounded-full transition-colors ${!isVideoEnabled ? 'bg-red-600 hover:bg-red-700' : 'bg-gray-600 hover:bg-gray-700'
                        }`}
                >
                    {isVideoEnabled ? (
                        <Video className="w-6 h-6 text-white" />
                    ) : (
                        <VideoOff className="w-6 h-6 text-white" />
                    )}
                </button>

                <button
                    onClick={toggleScreenShare}
                    className={`p-3 rounded-full transition-colors ${isScreenSharing ? 'bg-blue-600 hover:bg-blue-700' : 'bg-gray-600 hover:bg-gray-700'
                        }`}
                >
                    {isScreenSharing ? (
                        <MonitorOff className="w-6 h-6 text-white" />
                    ) : (
                        <Monitor className="w-6 h-6 text-white" />
                    )}
                </button>

                <button
                    onClick={leaveCall}
                    className="p-3 rounded-full bg-red-600 hover:bg-red-700 transition-colors"
                >
                    <PhoneOff className="w-6 h-6 text-white" />
                </button>
            </div>
        </div>
    );
};

export default VideoCall;