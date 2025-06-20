import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Video } from 'lucide-react';

import apiService from "../api";

const Home = () => {
    const [hostName, setHostName] = useState('');
    const [roomId, setRoomId] = useState('');
    const [userName, setUserName] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const createRoom = async (e) => {
        e.preventDefault();
        if (!hostName.trim()) return;

        setLoading(true);
        try {
            const result = await apiService.createRoom(hostName.trim());
            if (result.success) {
                navigate(`/room/${result.roomId}?userId=${result.hostId}&name=${encodeURIComponent(hostName)}`);
            } else {
                alert('Failed to create room: ' + result.error);
            }
        } catch (error) {
            alert('Failed to create room: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    const joinRoom = async (e) => {
        e.preventDefault();
        if (!roomId.trim() || !userName.trim()) return;

        setLoading(true);
        try {
            const result = await apiService.joinRoom(roomId.trim(), userName.trim());
            if (result.success) {
                navigate(`/room/${roomId}?userId=${result.userId}&name=${encodeURIComponent(userName)}`);
            } else {
                alert('Failed to join room: ' + result.error);
            }
        } catch (error) {
            alert('Failed to join room: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
            <div className="max-w-md w-full space-y-8">
                <div className="text-center">
                    <Video className="mx-auto h-12 w-12 text-blue-600" />
                    <h2 className="mt-6 text-3xl font-bold text-gray-900">Video Call App</h2>
                    <p className="mt-2 text-sm text-gray-600">Start or join a video call</p>
                </div>

                <div className="bg-white rounded-lg shadow-md p-6 space-y-6">
                    <form onSubmit={createRoom} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Create a new room
                            </label>
                            <input
                                type="text"
                                value={hostName}
                                onChange={(e) => setHostName(e.target.value)}
                                placeholder="Enter your name"
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                required
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors"
                        >
                            {loading ? 'Creating...' : 'Create Room'}
                        </button>
                    </form>

                    <div className="relative">
                        <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-gray-300" />
                        </div>
                        <div className="relative flex justify-center text-sm">
                            <span className="px-2 bg-white text-gray-500">Or</span>
                        </div>
                    </div>

                    <form onSubmit={joinRoom} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Join existing room
                            </label>
                            <input
                                type="text"
                                value={roomId}
                                onChange={(e) => setRoomId(e.target.value)}
                                placeholder="Enter room ID"
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 mb-2"
                                required
                            />
                            <input
                                type="text"
                                value={userName}
                                onChange={(e) => setUserName(e.target.value)}
                                placeholder="Enter your name"
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                required
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 disabled:opacity-50 transition-colors"
                        >
                            {loading ? 'Joining...' : 'Join Room'}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default Home;