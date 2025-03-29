import "./App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Layout from "./components/Layout";
import React from "react";
import HomeHeader from "./components/HomeHeader";
import Home from "./components/Home";
import AdminActions from "./components/AdminActions";
import AddItem from "./components/AddItem";

function App() {
  return (
    <BrowserRouter>
      <div className="home-page">
        <header className="App-header">
          <HomeHeader />
        </header>
        <Routes>
          <Route path="/" element={<Navigate to="/home" />} />
          <Route path="/home" element={<Home />} />
          <Route path="/recent" element={<Layout />} />
          <Route path="/home/stock" element={<Layout />} />
          <Route path="/home/make" element={<Layout />} />
          <Route path="/admin" element={<AdminActions />} />
          <Route path="/admin/add" element={<AddItem />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;
