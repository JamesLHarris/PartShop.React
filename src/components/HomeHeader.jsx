import React, { useState, useEffect } from "react";
import quantumForgeLogo from "../itemPhotos/Tig_Teddy.png";
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
import MakeWithModelsFlyout from "./MakeWithModelsFlyout";
import CartIcon from "./CartIcon";
import CartDrawer from "./CartDrawer";

function HomeHeader({ value, onChange }) {
  const idOf = (x) => x?.id ?? x?.Id;
  const [drawerOpen, setDrawerOpen] = useState(false);

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

  // Local-only input state (Option B: no API calls while typing)
  const [searchText, setSearchText] = useState(value?.q ?? "");

  // Keep local searchText in sync when external actions clear q (filters reset)
  useEffect(() => {
    setSearchText(value?.q ?? "");
  }, [value?.q]);

  const handleSearchInputChange = (e) => {
    setSearchText(e.target.value);
  };

  const submitSearch = (e) => {
    e.preventDefault();

    const q = (searchText ?? "").trim();

    // Push committed query to Layout (this triggers PartsBrowse fetch)
    onChange?.({ q });

    // Ensure user lands on browse after searching
    navigate("/browse");
  };

  const [userId, setUserId] = useState(null);

  useEffect(() => {
    const id = localStorage.getItem("userId");
    if (id) {
      setUserId(id);
    }
  }, []);

  const handleLoginClick = () => navigate("/login");

  const mapModelOptions = (option) => {
    return <ModelDropDown data={option} onSelect={handleModelSelect} />;
  };

  const mapMakeOptions = (option) => {
    return <MakeDropDown data={option} onSelect={handleMakeSelect} />;
  };

  const mapCatagoryOptions = (option) => {
    return <CatagoryDropDown data={option} onSelect={handleCategorySelect} />;
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
    makeService.getAllMakes().then(onGetMakeSuccess).catch(onGetError);
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

  const handleRecentlyListedClick = (e) => {
    e.preventDefault();

    // clear committed query + clear local input
    setSearchText("");

    onChange?.({
      makeId: null,
      modelId: null,
      categoryId: null,
      q: "",
    });

    navigate("/browse");
  };

  const handleMakeSelected = (mk) => {
    setSearchText("");
    onChange?.({
      makeId: idOf(mk),
      modelId: null,
      q: "",
    });
    navigate("/browse");
  };

  const handleModelSelected = (mk, m) => {
    setSearchText("");
    onChange?.({
      makeId: idOf(mk),
      modelId: idOf(m),
      q: "",
    });
    navigate("/browse");
  };

  const handleMakeSelect = (make) => {
    if (!onChange) return;

    setSearchText("");

    const id = make.id ?? make.Id;
    onChange({
      makeId: id,
      modelId: null,
      categoryId: null,
      q: "",
    });

    navigate("/browse");
  };

  const handleModelSelect = (model) => {
    if (!onChange) return;

    setSearchText("");

    const modelId = model.id ?? model.Id;
    const makeId = model.makeId ?? model.MakeId ?? value?.makeId ?? null;

    onChange({
      makeId,
      modelId,
      categoryId: null,
      q: "",
    });

    navigate("/browse");
  };

  const handleCategorySelect = (category) => {
    if (!onChange) return;

    setSearchText("");

    const categoryId = category.id ?? category.Id;

    onChange({
      categoryId,
      makeId: null,
      modelId: null,
      q: "",
    });

    navigate("/browse");
  };

  const handleLogout = () => {
    localStorage.removeItem("userId");
    localStorage.removeItem("isLoggedIn");
    setUserId(null);
    navigate("/");
  };

  const handleCheckout = () => {
    window.location.href = "/checkout";
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
            <a href="/browse" onClick={handleRecentlyListedClick}>
              Recently Listed
            </a>
          </nav>

          <div className="top-selection">
            <MakeWithModelsFlyout
              makes={makeData.optionsUnmapped}
              modelsAll={modelsData.optionsUnmapped}
              onSelectMake={handleMakeSelected}
              onSelectModel={handleModelSelected}
            />
            {modelsData.optionsComponents}
            {catagoryData.optionsComponents}
          </div>

          <nav className="nav-links end-links">
            <a href="/contact">Contact Us</a>
            <a href="/about">About Us</a>
          </nav>

          {/* Option B: no API calls while typing */}
          <form onSubmit={submitSearch} className="header-search">
            <input
              type="text"
              name="q"
              value={searchText}
              onChange={handleSearchInputChange}
              placeholder="Search parts..."
            />
            <button type="submit">Search</button>
          </form>

          <CartIcon onClick={() => setDrawerOpen(true)} />
        </div>

        <div>
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

              <a href="/admin" className="admin-link">
                Admin
              </a>

              <button className="logout-button" onClick={handleLogout}>
                <FaSignOutAlt />
              </button>
            </div>
          )}
        </div>

        <CartDrawer
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          onCheckout={handleCheckout}
        />
      </header>
    </div>
  );
}

export default HomeHeader;
