import React, { useState } from "react";
import { Outlet } from "react-router-dom";
import "./Home.css";
import partsService from "../service/partsService";
import toastr from "toastr";
import AdminCard from "./AdminCard";

function SearchItem() {
  const [formData, setFormData] = useState({
    name: "",
    partNumber: "",
  });

  const [partData, setPartData] = useState({
    partsUnmapped: [],
    partsComponents: [],
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const prune = (o = {}) =>
    Object.fromEntries(
      Object.entries(o).filter(
        ([_, v]) => v !== undefined && v !== null && v !== ""
      )
    );

  const submitEvent = (e) => {
    e.preventDefault();

    const params = prune({
      q: formData.name?.trim(), // keyword
      PartNumber: formData.partNumber?.trim(),
      BoxId: formData.boxId ? Number(formData.boxId) : undefined,
      MakeId: formData.makeId ? Number(formData.makeId) : undefined,
      ModelId: formData.modelId ? Number(formData.modelId) : undefined,
      MaxRows: 200,
    });

    partsService.searchPart(params).then(onGetSuccess).catch(onError);
  };

  const onGetSuccess = (response) => {
    let getData = response.item;
    setPartData({
      partsUnmapped: getData,
      partsComponents: getData.map(mapParts),
    });
  };

  const mapParts = (part) => (
    <AdminCard
      name={part.name}
      tested={part.tested}
      rusted={part.rusted}
      photo={part.image}
      price={part.price}
      description={part.description}
      id={part.id}
    />
  );

  const onError = () => {
    toastr.error("Failed to search parts on Admin Search Page.", "Error");
  };

  return (
    <div className="landing-wrapper">
      <form className="part-form">
        <div>
          <label>Name:</label>
          <input name="name" value={formData.name} onChange={handleChange} />
        </div>
        <div>
          <label>Part Number:</label>
          <input
            name="partNumber"
            value={formData.partNumber}
            onChange={handleChange}
          />
        </div>
      </form>
      <button onClick={submitEvent}>Search</button>
      <div>{partData.partsComponents}</div>
      <Outlet />
    </div>
  );
}

export default SearchItem;
