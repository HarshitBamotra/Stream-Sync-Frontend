const API_BASE_URL = 'http://localhost:3000/api';

const apiService = {
    createRoom: async (hostName) => {
        const response = await fetch(`${API_BASE_URL}/rooms/create`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ hostName })
        });
        return response.json();
    },

    joinRoom: async (roomId, userName) => {
        const response = await fetch(`${API_BASE_URL}/rooms/${roomId}/join`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userName })
        });
        return response.json();
    },

    getRoomInfo: async (roomId) => {
        const response = await fetch(`${API_BASE_URL}/rooms/${roomId}`);
        return response.json();
    },

    deleteRoom: async (roomId, userId) => {
        const response = await fetch(`${API_BASE_URL}/rooms/${roomId}`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId })
        });
        return response.json();
    }
};

export default apiService;