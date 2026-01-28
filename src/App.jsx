// App.jsx
import "./App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import React from "react";
import Layout from "./components/Layout";
import Home from "./components/Home";
import PartsBrowse from "./components/PartsBrowse";
import About from "./components/About";
import Contact from "./components/Contact";
import AdminActions from "./components/AdminActions";
import AddItem from "./components/AddItem";
import Login from "./components/Login";
import SearchItem from "./components/SearchItem";
import AdminOrders from "./components/AdminOrders";
import AdminPartDetails from "./components/AdminPartDetails";
import CustomerPartDetails from "./components/CustomerPartDetails";
import { CartProvider } from "./components/CartContext";

function App() {
  return (
    <CartProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Navigate to="/home" replace />} />

          {/* Everything inside this Layout gets the header */}
          <Route element={<Layout />}>
            <Route path="/home" element={<PartsBrowse />} />
            <Route path="/browse" element={<PartsBrowse />} />
            <Route path="/about" element={<About />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/admin" element={<AdminActions />} />
            <Route path="/admin/add" element={<AddItem />} />
            <Route path="/Admin/Search" element={<SearchItem />} />
            <Route path="/Admin/Orders" element={<AdminOrders />} />
            <Route path="/admin/part/:id" element={<AdminPartDetails />} />
            <Route path="/browse/part/:id" element={<CustomerPartDetails />} />
          </Route>

          {/* Only routes that shouldn't show header (e.g., Login) go outside */}
          <Route path="/login" element={<Login />} />
        </Routes>
      </BrowserRouter>
    </CartProvider>
  );
}

export default App;
