import React, { useEffect, useState } from "react";
import makeService from "../service/makeService";
import modelService from "../service/modelService";

function MakeModelSelector({ onSelectionChange }) {
  const [makes, setMakes] = useState([]);
  const [models, setModels] = useState([]);
  const [selectedMakeId, setSelectedMakeId] = useState("");
  const [selectedModelId, setSelectedModelId] = useState("");

  // Fetch all makes on mount
  useEffect(() => {
    makeService.getAllCompanies().then(onGetMakeSuccess).catch(onError);
  }, []);

  const onGetMakeSuccess = (response) => {
    setMakes(response.item || []);
  };

  // Fetch models for selected make
  useEffect(() => {
    if (selectedMakeId) {
      modelService
        .getModelsByMakeId(selectedMakeId)
        .then(onGetModelsSuccess)
        .catch(onError);
    } else {
      setModels([]);
    }
  }, [selectedMakeId]);

  const onGetModelsSuccess = (response) => {
    setModels(response.item || []);
  };

  const onError = (err) => {
    console.error("Dropdown fetch error:", err);
  };

  const handleMakeChange = (e) => {
    const makeId = e.target.value;
    setSelectedMakeId(makeId);
    setSelectedModelId(""); // Reset model
    onSelectionChange({ makeId, modelId: "" });
  };

  const handleModelChange = (e) => {
    const modelId = e.target.value;
    setSelectedModelId(modelId);
    onSelectionChange({ makeId: selectedMakeId, modelId });
  };

  return (
    <div className="make-model-selector">
      <div>
        <label>Make:</label>
        <select value={selectedMakeId} onChange={handleMakeChange}>
          <option value="">-- Select Make --</option>
          {makes.map((make) => (
            <option key={make.id} value={make.id}>
              {make.company}
            </option>
          ))}
        </select>
      </div>

      {selectedMakeId && (
        <div>
          <label>Model:</label>
          <select value={selectedModelId} onChange={handleModelChange}>
            <option value="">-- Select Model --</option>
            {models.map((model) => (
              <option key={model.id} value={model.id}>
                {model.name}
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
}

export default MakeModelSelector;
