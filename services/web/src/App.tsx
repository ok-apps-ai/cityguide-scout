import { BrowserRouter, Routes, Route } from "react-router-dom";

import { Header } from "./components/Header";
import { RoutesPage } from "./pages/RoutesPage";
import { CitiesPage } from "./pages/CitiesPage";

const App = () => (
  <BrowserRouter>
    <div className="flex flex-col h-screen w-screen overflow-hidden">
      <Routes>
        <Route element={<Header />}>
          <Route path="/" element={<RoutesPage />} />
          <Route path="/cities" element={<CitiesPage />} />
        </Route>
      </Routes>
    </div>
  </BrowserRouter>
);

export default App;
