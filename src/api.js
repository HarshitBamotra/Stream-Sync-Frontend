const API_BASE_URL = import.meta.env.VITE_API_URL;

const apiService = {
    createRoom: async (hostName) => {
        const response = await fetch(`${API_BASE_URL}/api/rooms/create`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ hostName })
        });
        return response.json();
    },

    joinRoom: async (roomId, userName) => {
        const response = await fetch(`${API_BASE_URL}/api/rooms/${roomId}/join`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userName })
        });
        return response.json();
    },

    getRoomInfo: async (roomId) => {
        const response = await fetch(`${API_BASE_URL}/api/rooms/${roomId}`);
        return response.json();
    },

    deleteRoom: async (roomId, userId) => {
        const response = await fetch(`${API_BASE_URL}/api/rooms/${roomId}`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId })
        });
        return response.json();
    }
};

export default apiService;