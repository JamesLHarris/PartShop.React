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

function AddItem() {
  const [modelsData, setModelsData] = useState({
    optionsUnmapped: [],
    optionsComponents: [],
  });

  const [makeData, setMakeData] = useState({
    optionsUnmapped: [],
    optionsComponents: [],
  });

  const mapModelOptions = (option) => {
    return <ModelDropDown data={option} />;
  };

  const mapMakeOptions = (option) => {
    return <MakeDropDown data={option} />;
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
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const navigate = useNavigate();

  const clickEvent = () => {
    navigate("home");
    console.log("I Clicked the Submit button", formData);
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
                  type="number"
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
                  type="number"
                  step="0.01"
                  value={formData.price}
                  onChange={handleChange}
                />
              </div>

              <div className="full-width">{modelsData.optionsComponents}</div>
              <div className="full-width">{makeData.optionsComponents}</div>
            </form>

            <hr className="admin-divider" />
          </Card.Body>
          <Card.Footer>
            <p className="admin-footer"></p>
            <button className="admin-button" onClick={clickEvent}>
              Next
            </button>
          </Card.Footer>
        </Card>
      </div>
    </div>
  );
}

export default AddItem;
