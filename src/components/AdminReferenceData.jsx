import React, { useEffect, useMemo, useState } from "react";
import toastr from "toastr";
import catagoryService from "../service/catagoryService";
import makeService from "../service/makeService";
import "./AdminReferenceData.css";

const getApiMessage = (error, fallback) =>
  error?.response?.data?.errors?.[0] ||
  error?.response?.data?.error ||
  error?.response?.data?.message ||
  fallback;

function AdminReferenceData() {
  const [categories, setCategories] = useState([]);
  const [makeRows, setMakeRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingCategory, setSavingCategory] = useState(false);
  const [savingMakeModel, setSavingMakeModel] = useState(false);
  const [categoryName, setCategoryName] = useState("");
  const [company, setCompany] = useState("");
  const [modelName, setModelName] = useState("");

  const loadReferenceData = async () => {
    setLoading(true);

    try {
      const [categoryResponse, makesResponse] = await Promise.all([
        catagoryService.getAllCatagories(),
        makeService.getAllMakes(),
      ]);

      setCategories(categoryResponse?.item || []);
      setMakeRows(makesResponse?.item || []);
    } catch (error) {
      console.error("Reference data load failed", error);
      toastr.error(getApiMessage(error, "Failed to load catalog reference data."));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReferenceData();
  }, []);

  const companies = useMemo(() => {
    const unique = new Map();

    makeRows.forEach((row) => {
      const name = String(row?.company || "").trim();
      if (name && !unique.has(name.toLowerCase())) {
        unique.set(name.toLowerCase(), name);
      }
    });

    return Array.from(unique.values()).sort((a, b) => a.localeCompare(b));
  }, [makeRows]);

  const groupedMakes = useMemo(() => {
    const groups = new Map();

    makeRows.forEach((row) => {
      const companyName = String(row?.company || "").trim();
      const model = String(row?.model?.name || row?.modelName || "").trim();
      if (!companyName) return;

      if (!groups.has(companyName)) {
        groups.set(companyName, []);
      }

      if (model && !groups.get(companyName).includes(model)) {
        groups.get(companyName).push(model);
      }
    });

    return Array.from(groups.entries())
      .map(([companyName, models]) => ({
        company: companyName,
        models: models.sort((a, b) => a.localeCompare(b)),
      }))
      .sort((a, b) => a.company.localeCompare(b.company));
  }, [makeRows]);

  const onCategorySubmit = async (event) => {
    event.preventDefault();
    const name = categoryName.trim();

    if (name.length < 2) {
      toastr.error("Category name must be at least 2 characters.");
      return;
    }

    if (categories.some((item) => String(item?.name || "").trim().toLowerCase() === name.toLowerCase())) {
      toastr.error("That category already exists.");
      return;
    }

    setSavingCategory(true);

    try {
      await catagoryService.addCatagory({ name });
      setCategoryName("");
      toastr.success(`Category “${name}” was created.`);
      await loadReferenceData();
    } catch (error) {
      console.error("Category creation failed", error);
      toastr.error(getApiMessage(error, "Failed to create category."));
    } finally {
      setSavingCategory(false);
    }
  };

  const onMakeModelSubmit = async (event) => {
    event.preventDefault();

    const cleanCompany = company.trim();
    const cleanModel = modelName.trim();

    if (cleanCompany.length < 2) {
      toastr.error("Make name must be at least 2 characters.");
      return;
    }

    if (!cleanModel) {
      toastr.error("Model name is required.");
      return;
    }

    const duplicate = makeRows.some((row) => {
      const existingCompany = String(row?.company || "").trim().toLowerCase();
      const existingModel = String(row?.model?.name || row?.modelName || "").trim().toLowerCase();
      return existingCompany === cleanCompany.toLowerCase() && existingModel === cleanModel.toLowerCase();
    });

    if (duplicate) {
      toastr.error("That make/model combination already exists.");
      return;
    }

    setSavingMakeModel(true);

    try {
      await makeService.addMakeModel({
        company: cleanCompany,
        modelName: cleanModel,
      });

      setCompany(cleanCompany);
      setModelName("");
      toastr.success(`${cleanCompany} ${cleanModel} was created.`);
      await loadReferenceData();
    } catch (error) {
      console.error("Make/model creation failed", error);
      toastr.error(getApiMessage(error, "Failed to create make/model."));
    } finally {
      setSavingMakeModel(false);
    }
  };

  return (
    <main className="admin-reference-page" aria-labelledby="admin-reference-title">
      <header className="admin-reference-heading">
        <p className="admin-reference-eyebrow">Administration</p>
        <h1 id="admin-reference-title">Catalog Setup</h1>
        <p>
          Add categories and make/model combinations without a database update.
          New values become available to Add Item, admin editing, and customer filters.
        </p>
      </header>

      <section className="admin-reference-grid">
        <article className="admin-reference-card">
          <div className="admin-reference-card__heading">
            <div>
              <p className="admin-reference-kicker">Categories</p>
              <h2>Add Category</h2>
            </div>
            <span className="admin-reference-count">{categories.length}</span>
          </div>

          <form className="admin-reference-form" onSubmit={onCategorySubmit}>
            <label htmlFor="admin-new-category">Category name</label>
            <div className="admin-reference-form-row">
              <input
                id="admin-new-category"
                type="text"
                value={categoryName}
                maxLength={128}
                disabled={savingCategory}
                onChange={(event) => setCategoryName(event.target.value)}
                placeholder="e.g. Cooling System"
              />
              <button type="submit" disabled={savingCategory}>
                {savingCategory ? "Adding…" : "Add Category"}
              </button>
            </div>
          </form>

          <div className="admin-reference-chip-list" aria-label="Existing categories">
            {categories.map((category) => (
              <span className="admin-reference-chip" key={category.id}>
                {category.name}
              </span>
            ))}
          </div>
        </article>

        <article className="admin-reference-card">
          <div className="admin-reference-card__heading">
            <div>
              <p className="admin-reference-kicker">Compatibility</p>
              <h2>Add Make / Model</h2>
            </div>
            <span className="admin-reference-count">{makeRows.length}</span>
          </div>

          <p className="admin-reference-help">
            Choose an existing make or type a new one, then enter the model exactly
            as it should appear on the site.
          </p>

          <form className="admin-reference-form" onSubmit={onMakeModelSubmit}>
            <div className="admin-reference-fields">
              <label htmlFor="admin-new-make">
                Make
                <input
                  id="admin-new-make"
                  type="text"
                  list="admin-company-options"
                  value={company}
                  maxLength={128}
                  disabled={savingMakeModel}
                  onChange={(event) => setCompany(event.target.value)}
                  placeholder="e.g. Porsche"
                />
              </label>

              <datalist id="admin-company-options">
                {companies.map((companyName) => (
                  <option value={companyName} key={companyName} />
                ))}
              </datalist>

              <label htmlFor="admin-new-model">
                Model
                <input
                  id="admin-new-model"
                  type="text"
                  value={modelName}
                  maxLength={128}
                  disabled={savingMakeModel}
                  onChange={(event) => setModelName(event.target.value)}
                  placeholder="e.g. 992"
                />
              </label>
            </div>

            <button className="admin-reference-submit" type="submit" disabled={savingMakeModel}>
              {savingMakeModel ? "Adding…" : "Add Make / Model"}
            </button>
          </form>
        </article>
      </section>

      <section className="admin-reference-card admin-reference-card--wide">
        <div className="admin-reference-card__heading">
          <div>
            <p className="admin-reference-kicker">Current data</p>
            <h2>Make / Model Directory</h2>
          </div>
          {loading && <span className="admin-reference-loading">Refreshing…</span>}
        </div>

        <div className="admin-reference-directory">
          {groupedMakes.map((group) => (
            <div className="admin-reference-make" key={group.company}>
              <h3>{group.company}</h3>
              <div className="admin-reference-chip-list">
                {group.models.map((model) => (
                  <span className="admin-reference-chip" key={`${group.company}-${model}`}>
                    {model}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}

export default AdminReferenceData;
