import { BrowserRouter, Routes, Route } from "react-router-dom";

import Home from "./components/Home";
import VideoCall from "./components/VideoCall";

const App = () => {
    return (
        <BrowserRouter>
            <div className="App">
                <Routes>
                    <Route path="/" element={<Home />} />
                    <Route path="/room/:roomId" element={<VideoCall />} />
                </Routes>
            </div>
        </BrowserRouter>
    );
};

export default App;