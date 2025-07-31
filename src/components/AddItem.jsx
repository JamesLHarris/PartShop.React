import React, { useEffect, useState } from "react";
import "./add-item.css";
import { Card } from "react-bootstrap";
import addItem from "../itemPhotos/add_item.png";
import { useNavigate } from "react-router-dom";
import modelService from "../service/modelService";
import makeService from "../service/makeService";
import toastr from "toastr";
import ModelDropDown from "./ModelDropDown";
import MakeDropDown from "./MakeDropDown";
import MakeModelSelector from "./MakeModelSelector";
import LocationSelector from "./LocationSelector";
import catagoryService from "../service/catagoryService";
import partsService from "../service/partsService";

function AddItem() {
  const [modelsData, setModelsData] = useState({
    optionsUnmapped: [],
    optionsComponents: [],
  });

  const [makeData, setMakeData] = useState({
    optionsUnmapped: [],
    optionsComponents: [],
  });

  const [isMakeSelected, setIsMakeSelected] = useState(false);
  const [catagoryOptions, setCatagoryOptions] = useState([]);

  const mapModelOptions = (option) => {
    return <ModelDropDown data={option} />;
  };

  const mapMakeOptions = (option) => {
    return <MakeDropDown data={option} onChange={handleMakeSelect} />;
  };

  useEffect(() => {
    makeService.getAllCompanies().then(onGetMakeSuccess).catch(onGetError);
  }, []);

  useEffect(() => {
    catagoryService.getAllCatagories().then((res) => {
      setCatagoryOptions(res.item);
    });
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

  const handleMakeSelect = (event) => {
    const selected = event.target.value;
    if (selected && selected !== "") {
      setIsMakeSelected(true);
    } else {
      setIsMakeSelected(false);
    }
  };

  const onGetError = () => {
    toastr.error("Failed to load surveys on AnswersPage.", "Error");
  };

  const [file, setFile] = useState({ photo: addItem });

  const [previewUrl, setPreviewUrl] = useState({ photo: addItem });

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setFile(file);
      setPreviewUrl((prevState) => {
        const pd = { ...prevState };
        pd.photo = URL.createObjectURL(file);
        console.log(pd);
        return pd;
      });
    }
    console.log("LOG FOR FILE UPLOAD", e.target.files);
  };

  const [formData, setFormData] = useState({
    name: "",
    year: "",
    partNumber: "",
    description: "",
    price: "",
    makeId: "",
    modelId: "",
    catagoryId: "",
    locationId: "",
    availableId: 1, // default "Available"
    rusted: false,
    tested: false,
    lastMovedBy: 1, // placeholder for now
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const navigate = useNavigate();

  const submitEvent = () => {
    const payload = new FormData();
    console.log("Form Data Being Sent", formData);
    Object.entries(formData).forEach(([key, value]) => {
      // Ensure booleans are sent as strings for FormData
      payload.append(
        key,
        typeof value === "boolean" ? value.toString() : value
      );
    });

    if (file && file.name) {
      payload.append("image", file); // image must match API param name
    }

    partsService
      .addPart(payload)
      .then(() => {
        toastr.success("Part added successfully!");
        console.log("Successful Payload", payload);
        navigate("/home");
      })
      .catch((err) => {
        console.error("Submission failed", err);
        console.log("Error Payload", payload);
        toastr.error("Failed to add part.");
      });
  };

  const handleMakeModelChange = ({ makeId, modelId }) => {
    setFormData((prev) => ({
      ...prev,
      makeId,
      modelId,
    }));
  };

  return (
    <div className="add-container">
      <div className="add-action">
        <Card className="custom-card">
          <Card.Body>
            <div className="form-header">
              <div className="image-preview">
                <img
                  src={previewUrl.photo}
                  alt="Preview"
                  className="preview-image"
                />
                <input
                  type="file"
                  name="Photo"
                  onChange={handleImageChange}
                  accept="image/*"
                />
              </div>
            </div>

            <form className="part-form">
              <div>
                <label>Name:</label>
                <input
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                />
              </div>
              <div>
                <label>Year:</label>
                <input
                  name="year"
                  value={formData.year}
                  onChange={handleChange}
                />
              </div>
              <div>
                <label>Part Number:</label>
                <input
                  name="partNumber"
                  value={formData.partNumber}
                  onChange={handleChange}
                />
              </div>
              <div>
                <label>Description:</label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                />
              </div>
              <div>
                <label>Price:</label>
                <input
                  name="price"
                  value={formData.price}
                  onChange={handleChange}
                />
              </div>
              <div>
                <label>Category:</label>
                <select
                  name="catagoryId"
                  value={formData.catagoryId}
                  onChange={handleChange}
                >
                  <option value="">Select Category</option>
                  {catagoryOptions.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>

              <MakeModelSelector onSelectionChange={handleMakeModelChange} />

              <div className="checkbox-group">
                <label>
                  <input
                    type="checkbox"
                    name="rusted"
                    checked={formData.rusted}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        rusted: e.target.checked,
                      }))
                    }
                  />
                  Rusted
                </label>

                <label>
                  <input
                    type="checkbox"
                    name="tested"
                    checked={formData.tested}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        tested: e.target.checked,
                      }))
                    }
                  />
                  Tested
                </label>
              </div>

              <LocationSelector
                onChange={(loc) => {
                  if (loc?.boxId) {
                    setFormData((prev) => ({
                      ...prev,
                      locationId: parseInt(loc.boxId),
                    }));
                  }
                }}
              />
            </form>

            <hr className="admin-divider" />
          </Card.Body>
          <Card.Footer>
            <p className="admin-footer"></p>
            <button className="admin-button" onClick={submitEvent}>
              Submit
            </button>
          </Card.Footer>
        </Card>
      </div>
    </div>
  );
}

export default AddItem;
