import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
import {
  FaBolt,
  FaBook,
  FaCar,
  FaCircle,
  FaCogs,
  FaEllipsisH,
  FaGasPump,
  FaLightbulb,
  FaSnowflake,
  FaTag,
} from "react-icons/fa";
import toastr from "toastr";
import catagoryService from "../service/catagoryService";
import "./CategoryLanding.css";

const REMOVED_CATEGORY_NAMES = new Set(
  [
    "Body",
    "Badges and Crests",
    "Emblems",
    "Fabcar",
    "Floor Mats",
    "Hardware",
    "Mirrors",
    "Pedal System and Levers",
    "Books and Media",
    "Chemical Products",
    "Engine and Transmission",
    "Fuel and Exhaust / Heating and A/C",
  ].map((name) => name.toLowerCase()),
);

const iconByCategory = {
  "ac and heating": FaSnowflake,
  "accessories and equipment": FaCogs,
  "air and fuel": FaGasPump,
  "brakes and wheels": FaCircle,
  "decals and emblems": FaTag,
  electrical: FaBolt,
  engine: FaCogs,
  exhaust: FaCogs,
  exterior: FaCar,
  "gaskets and seals": FaCircle,
  interior: FaCar,
  "lights and lenses": FaLightbulb,
  manuals: FaBook,
  other: FaEllipsisH,
  posters: FaTag,
  "suspension and steering": FaCogs,
  transmission: FaCogs,
};

const idOf = (category) =>
  category?.id ??
  category?.Id ??
  category?.categoryId ??
  category?.CategoryId ??
  category?.catagoryId ??
  category?.CatagoryId;

const nameOf = (category) =>
  category?.name ??
  category?.Name ??
  category?.categoryName ??
  category?.CategoryName ??
  category?.catagoryName ??
  category?.CatagoryName ??
  "Unnamed category";

function CategoryLanding() {
  const navigate = useNavigate();
  const { handleHeaderChange, setPageIndex } = useOutletContext();
  const [categories, setCategories] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    catagoryService
      .getAllCatagories()
      .then((response) => {
        if (!isMounted) return;

        const loaded = Array.isArray(response?.item) ? response.item : [];
        setCategories(loaded);
        setIsLoading(false);
      })
      .catch((error) => {
        if (!isMounted) return;

        console.error("Failed to load the category overview.", error);
        setCategories([]);
        setIsLoading(false);
        toastr.error("Failed to load categories.", "Error");
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const activeCategories = useMemo(
    () =>
      categories
        .filter((category) => {
          const id = Number(idOf(category));
          const name = nameOf(category).trim();

          return (
            Number.isInteger(id) &&
            id > 0 &&
            name.length > 0 &&
            !REMOVED_CATEGORY_NAMES.has(name.toLowerCase())
          );
        })
        .sort((left, right) =>
          nameOf(left).localeCompare(nameOf(right), undefined, {
            sensitivity: "base",
          }),
        ),
    [categories],
  );

  const selectCategory = (category) => {
    const categoryId = Number(idOf(category));

    if (!Number.isInteger(categoryId) || categoryId <= 0) {
      toastr.error("That category does not have a valid ID.", "Error");
      return;
    }

    handleHeaderChange?.({
      categoryId,
      makeId: null,
      modelId: null,
      q: "",
    });
    setPageIndex?.(0);

    navigate(`/browse?categoryId=${categoryId}`);
  };

  return (
    <section className="category-landing" aria-labelledby="category-page-title">
      <div className="category-landing__header">
        <p className="category-landing__eyebrow">Browse inventory</p>
        <h1 id="category-page-title">Shop by Category</h1>
        <p>
          Choose a category to view matching parts. Each card uses the same
          customer filtering and pagination as the Categories menu.
        </p>
      </div>

      {isLoading ? (
        <div className="category-landing__status" role="status">
          Loading categories…
        </div>
      ) : activeCategories.length === 0 ? (
        <div className="category-landing__status">
          No categories are currently available.
        </div>
      ) : (
        <div className="category-grid" aria-label="Available part categories">
          {activeCategories.map((category) => {
            const categoryId = idOf(category);
            const categoryName = nameOf(category);
            const Icon =
              iconByCategory[categoryName.toLowerCase()] ?? FaCogs;

            return (
              <button
                type="button"
                className="category-card"
                key={categoryId}
                onClick={() => selectCategory(category)}
                aria-label={`Browse ${categoryName}`}
              >
                <span className="category-card__icon" aria-hidden="true">
                  <Icon />
                </span>
                <span className="category-card__name">{categoryName}</span>
                <span className="category-card__action">View parts</span>
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
}

export default CategoryLanding;
