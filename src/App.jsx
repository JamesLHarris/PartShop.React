import "./App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import BasicCard from "./components/BasicCard";
import Layout from "./components/Layout";
import React from "react";
import HomeHeader from "./components/HomeHeader";

function App() {
  return (
    <BrowserRouter>
      <div className="home-page">
        <header className="App-header">
          <HomeHeader />
        </header>
        <Routes>
          <Route path="/" element={<Navigate to="/home/stock" />} />
          <Route path="/home" element={<Layout />} />
          <Route path="/home/stock" element={<Layout />} />
          <Route path="/home/make" element={<Layout />} />
          <Route path="/BasicCard" element={<BasicCard />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;
