import React, { useState, useEffect } from "react";
import quantumForgeLogo from "../quantumForgeLogo.jpeg";
import { useNavigate } from "react-router-dom";
import toastr from "toastr";
import modelService from "../service/modelService";
import makeService from "../service/makeService";
import catagoryService from "../service/catagoryService";
import ModelDropDown from "./ModelDropDown";
import MakeDropDown from "./MakeDropDown";
import CatagoryDropDown from "./CatagoryDropDown";
import "./HomeHeader.css";
import { FaUser, FaSignOutAlt } from "react-icons/fa";

function HomeHeader() {
  const [modelsData, setModelsData] = useState({
    optionsUnmapped: [],
    optionsComponents: [],
  });

  const [makeData, setMakeData] = useState({
    optionsUnmapped: [],
    optionsComponents: [],
  });

  const [catagoryData, setCatagoryData] = useState({
    optionsUnmapped: [],
    optionsComponents: [],
  });

  const [userId, setUserId] = useState(null);

  const navigate = useNavigate();

  useEffect(() => {
    const id = localStorage.getItem("userId");
    if (id) {
      setUserId(id);
    }
  }, []);

  const handleLoginClick = () => navigate("/login");

  const mapModelOptions = (option) => {
    return <ModelDropDown data={option} />;
  };

  const mapMakeOptions = (option) => {
    return <MakeDropDown data={option} />;
  };

  const mapCatagoryOptions = (option) => {
    return <CatagoryDropDown data={option} />;
  };

  useEffect(() => {
    modelService.getAllModels().then(onGetModelSuccess).catch(onGetError);
  }, []);

  const onGetModelSuccess = (response) => {
    let getData = response.item;
    setModelsData((prevState) => {
      const pd = { ...prevState };
      pd.optionsComponents = mapModelOptions(getData);
      pd.optionsUnmapped = getData;
      return pd;
    });
  };

  useEffect(() => {
    makeService.getAllCompanies().then(onGetMakeSuccess).catch(onGetError);
  }, []);

  const onGetMakeSuccess = (response) => {
    let getData = response.item;
    setMakeData((prevState) => {
      const pd = { ...prevState };
      pd.optionsComponents = mapMakeOptions(getData);
      pd.optionsUnmapped = getData;
      return pd;
    });
  };

  useEffect(() => {
    catagoryService
      .getAllCatagories()
      .then(onGetCatagorySuccess)
      .catch(onGetError);
  }, []);

  const onGetCatagorySuccess = (response) => {
    let getData = response.item;
    setCatagoryData((prevState) => {
      const pd = { ...prevState };
      pd.optionsComponents = mapCatagoryOptions(getData);
      pd.optionsUnmapped = getData;
      return pd;
    });
  };

  const handleLogout = () => {
    localStorage.removeItem("userId");
    localStorage.removeItem("isLoggedIn");
    setUserId(null);
    navigate("/");
  };

  const onGetError = () => {
    toastr.error("Failed to load surveys on AnswersPage.", "Error");
  };

  return (
    <div className="home-header">
      <header className="App-header">
        <img src={quantumForgeLogo} className="App-logo" alt="Quantum Forge" />

        <div className="header-row">
          <nav className="nav-links">
            <a href="/">Home</a>
            <a href="/recent">Recently Listed</a>
          </nav>
          {!userId ? (
            <button className="login-button" onClick={handleLoginClick}>
              Login
            </button>
          ) : (
            <div className="user-controls">
              <div className="user-indicator">
                <FaUser style={{ marginRight: "6px" }} />
                <span>User #{userId}</span>
              </div>
              <button className="logout-button" onClick={handleLogout}>
                <FaSignOutAlt />
              </button>
            </div>
          )}
          <div className="top-selection">
            {modelsData.optionsComponents}
            {makeData.optionsComponents}
            {catagoryData.optionsComponents}
          </div>

          <nav className="nav-links end-links">
            <a href="/contact">Contact Us</a>
            <a href="/about">About Us</a>
          </nav>
          <nav className="nav-links admin-link">
            <a href="/admin">Admin</a>
          </nav>
        </div>
      </header>
    </div>
  );
}

export default HomeHeader;
