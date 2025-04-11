import Chat from "./components/Chat";
import { Header } from "./components/Header";

function App() {
  return (
    <div className="h-screen overflow-hidden bg-gray-100">
      <Header />
      <Chat />
    </div>
  );
}

export default App;
