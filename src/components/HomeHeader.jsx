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

  const navigate = useNavigate();

  const navToOption = (option) => {
    navigate(option);
  };

  const handleOptionSelect = (event) => {
    const selectedValue = event.target.value;
    // Call your function here with the selected value
    console.log("FIRST OPTIONS", selectedValue);
    //navToOption(selectedValue);
  };

  const mapModelOptions = (option) => {
    console.log("DropDownModelOptions", option);
    return <ModelDropDown data={option} />;
  };

  const mapMakeOptions = (option) => {
    console.log("DropDownMakeOptions", option);
    return <MakeDropDown data={option} />;
  };

  const mapCatagoryOptions = (option) => {
    console.log("DropDownCatagoryOptions", option);
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

          <div className="top-selection">
            {modelsData.optionsComponents}
            {makeData.optionsComponents}
            {catagoryData.optionsComponents}
          </div>

          <nav className="nav-links end-links">
            <a href="/contact">Contact Us</a>
            <a href="/about">About Us</a>
          </nav>
        </div>
      </header>
    </div>
  );
}

export default HomeHeader;
