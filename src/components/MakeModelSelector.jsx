import React, { useState, useEffect } from "react";
import makeService from "../service/makeService";
import modelService from "../service/modelService";

function MakeModelSelector({ onSelectionChange }) {
  const [makes, setMakes] = useState([]);
  const [models, setModels] = useState([]);
  const [selectedMakeId, setSelectedMakeId] = useState("");
  const [selectedModelId, setSelectedModelId] = useState("");

  useEffect(() => {
    makeService.getAllCompanies().then((res) => {
      setMakes(res.item);
    });
  }, []);

  const handleMakeChange = (e) => {
    const newMakeId = e.target.value;
    setSelectedMakeId(newMakeId);
    setModels([]); // clear models on make change
    setSelectedModelId(""); // reset model

    if (newMakeId) {
      modelService.getAllModelsByMakeId(newMakeId).then((res) => {
        setModels(res.item);
      });
    }

    onSelectionChange({ makeId: newMakeId, modelId: "" });
  };

  const handleModelChange = (e) => {
    const newModelId = e.target.value;
    setSelectedModelId(newModelId);
    onSelectionChange({ makeId: selectedMakeId, modelId: newModelId });
  };

  return (
    <div>
      <label>Make:</label>
      <select value={selectedMakeId} onChange={handleMakeChange}>
        <option value="">Select Make</option>
        {makes.map((make) => (
          <option key={make.id} value={make.id}>
            {make.company}
          </option>
        ))}
      </select>

      <label>Model:</label>
      <select value={selectedModelId} onChange={handleModelChange}>
        <option value="">Select Model</option>
        {models.map((model) => (
          <option key={model.id} value={model.id}>
            {model.name}
          </option>
        ))}
      </select>
    </div>
  );
}

export default MakeModelSelector;
