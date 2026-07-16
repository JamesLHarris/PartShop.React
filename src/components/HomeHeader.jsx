import React, { useEffect, useState } from "react";
import currentLogo from "../itemPhotos/Tig_Teddy.png";
import { NavLink, useNavigate } from "react-router-dom";
import toastr from "toastr";
import makeService from "../service/makeService";
import catagoryService from "../service/catagoryService";
import CatagoryDropDown from "./CatagoryDropDown";
import "./HomeHeader.css";
import { FaBars, FaSignOutAlt, FaTimes, FaUser } from "react-icons/fa";
import MakeWithModelsFlyout from "./MakeWithModelsFlyout";
import CartIcon from "./CartIcon";
import CartDrawer from "./CartDrawer";
import { useCart } from "./CartContext";
import shopifyCheckoutService from "../service/shopifyCheckoutService";

function HomeHeader({ value, onChange }) {
  const idOf = (item) => item?.id ?? item?.Id;
  const { items } = useCart();
  const navigate = useNavigate();

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [checkingOut, setCheckingOut] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [makes, setMakes] = useState([]);
  const [categories, setCategories] = useState([]);
  const [searchText, setSearchText] = useState(value?.q ?? "");
  const [userId, setUserId] = useState(null);

  useEffect(() => {
    setSearchText(value?.q ?? "");
  }, [value?.q]);

  useEffect(() => {
    let isMounted = true;

    makeService
      .getAllCompanies()
      .then((response) => {
        if (isMounted) {
          setMakes(Array.isArray(response?.item) ? response.item : []);
        }
      })
      .catch((error) => {
        console.error("Failed to load makes for the header.", error);
        if (isMounted) {
          setMakes([]);
          toastr.error("Failed to load make filters.", "Error");
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    catagoryService
      .getAllCatagories()
      .then((response) => {
        if (isMounted) {
          setCategories(Array.isArray(response?.item) ? response.item : []);
        }
      })
      .catch((error) => {
        console.error("Failed to load categories for the header.", error);
        if (isMounted) {
          setCategories([]);
          toastr.error("Failed to load category filters.", "Error");
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    const id = localStorage.getItem("userId");
    if (id) {
      setUserId(id);
    }
  }, []);

  useEffect(() => {
    const closeOnDesktop = () => {
      if (window.innerWidth > 900) {
        setMobileMenuOpen(false);
      }
    };

    window.addEventListener("resize", closeOnDesktop);
    return () => window.removeEventListener("resize", closeOnDesktop);
  }, []);

  const closeMobileMenu = () => setMobileMenuOpen(false);

  const clearFiltersAndBrowse = () => {
    setSearchText("");
    onChange?.({
      makeId: null,
      modelId: null,
      categoryId: null,
      q: "",
    });
    closeMobileMenu();
    navigate("/browse");
  };

  const submitSearch = (event) => {
    event.preventDefault();

    onChange?.({ q: (searchText ?? "").trim() });
    closeMobileMenu();
    navigate("/browse");
  };

  const handleBrowseClick = (event) => {
    event.preventDefault();
    clearFiltersAndBrowse();
  };

  const handleMakeSelect = (make) => {
    if (!onChange) return;

    setSearchText("");
    onChange({
      makeId: idOf(make) ?? null,
      modelId: null,
      categoryId: null,
      q: "",
    });

    closeMobileMenu();
    navigate("/browse");
  };

  const handleModelSelect = (make, model) => {
    if (!onChange) return;

    setSearchText("");
    onChange({
      makeId: model?.makeId ?? model?.MakeId ?? idOf(make) ?? null,
      modelId: idOf(model) ?? null,
      categoryId: null,
      q: "",
    });

    closeMobileMenu();
    navigate("/browse");
  };

  const handleCategorySelect = (category) => {
    if (!onChange) return;

    setSearchText("");
    onChange({
      categoryId: idOf(category) ?? null,
      makeId: null,
      modelId: null,
      q: "",
    });

    closeMobileMenu();
    navigate("/browse");
  };

  const handleLoginClick = () => {
    closeMobileMenu();
    navigate("/login");
  };

  const handleLogout = () => {
    localStorage.removeItem("userId");
    localStorage.removeItem("isLoggedIn");
    setUserId(null);
    closeMobileMenu();
    navigate("/");
  };

  const handleCheckout = async () => {
    if (!items || items.length === 0) {
      toastr.info("Your cart is empty.");
      return;
    }

    setCheckingOut(true);

    try {
      const response = await shopifyCheckoutService.createCartCheckout(items);
      const checkoutUrl = response?.item?.checkoutUrl;

      if (!checkoutUrl) {
        throw new Error("Shopify checkout URL was not returned.");
      }

      window.location.assign(checkoutUrl);
    } catch (error) {
      const apiMessage = error?.response?.data?.errors?.[0];
      toastr.error(
        apiMessage || error.message || "Unable to start Shopify checkout.",
      );
      setCheckingOut(false);
    }
  };

  return (
    <div className="home-header">
      <header className="site-header">
        <div className="site-header__top">
          <NavLink
            to="/browse"
            className="site-brand"
            onClick={clearFiltersAndBrowse}
            aria-label="Go to Browse"
          >
            <img
              src={currentLogo}
              className="App-logo"
              alt="G Rand Sons Parts"
            />
          </NavLink>

          <button
            type="button"
            className="mobile-menu-toggle"
            aria-label={mobileMenuOpen ? "Close navigation" : "Open navigation"}
            aria-controls="primary-navigation"
            aria-expanded={mobileMenuOpen}
            onClick={() => setMobileMenuOpen((current) => !current)}
          >
            {mobileMenuOpen ? <FaTimes /> : <FaBars />}
          </button>

          <div className="account-controls">
            {!userId ? (
              <button className="login-button" onClick={handleLoginClick}>
                Login
              </button>
            ) : (
              <>
                <div className="user-indicator">
                  <FaUser aria-hidden="true" />
                  <span>User #{userId}</span>
                </div>

                <NavLink
                  to="/admin"
                  className={({ isActive }) =>
                    `admin-link ${isActive ? "is-active" : ""}`
                  }
                  onClick={closeMobileMenu}
                >
                  Admin
                </NavLink>

                <button
                  type="button"
                  className="logout-button"
                  onClick={handleLogout}
                  aria-label="Log out"
                  title="Log out"
                >
                  <FaSignOutAlt aria-hidden="true" />
                </button>
              </>
            )}
          </div>
        </div>

        <div
          id="primary-navigation"
          className={`header-row ${mobileMenuOpen ? "is-open" : ""}`}
        >
          <nav className="nav-links" aria-label="Primary navigation">
            <NavLink
              to="/browse"
              className={({ isActive }) =>
                `header-nav-link ${isActive ? "is-active" : ""}`
              }
              onClick={handleBrowseClick}
            >
              Browse
            </NavLink>

            <div className="top-selection" aria-label="Part filters">
              <MakeWithModelsFlyout
                makes={makes}
                onSelectMake={handleMakeSelect}
                onSelectModel={handleModelSelect}
              />

              <CatagoryDropDown
                data={categories}
                onSelect={handleCategorySelect}
              />
            </div>

            <NavLink
              to="/contact"
              className={({ isActive }) =>
                `header-nav-link ${isActive ? "is-active" : ""}`
              }
              onClick={closeMobileMenu}
            >
              Contact Us
            </NavLink>

            <NavLink
              to="/about"
              className={({ isActive }) =>
                `header-nav-link ${isActive ? "is-active" : ""}`
              }
              onClick={closeMobileMenu}
            >
              About Us
            </NavLink>
          </nav>

          <form onSubmit={submitSearch} className="header-search" role="search">
            <label className="sr-only" htmlFor="site-header-search">
              Search parts
            </label>
            <input
              id="site-header-search"
              type="search"
              name="q"
              value={searchText}
              onChange={(event) => setSearchText(event.target.value)}
              placeholder="Search parts..."
            />
            <button type="submit">Search</button>
          </form>

          <div className="header-cart-control">
            <CartIcon onClick={() => setDrawerOpen(true)} />
          </div>
        </div>

        <CartDrawer
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          onCheckout={handleCheckout}
          isCheckingOut={checkingOut}
        />
      </header>
    </div>
  );
}

export default HomeHeader;
