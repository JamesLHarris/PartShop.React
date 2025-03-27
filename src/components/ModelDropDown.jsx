import React, { useEffect, useState } from "react";
import "../dropDown.css";

function ModelDropDown(props) {
  const [models, setModelData] = useState({
    modelData: [],
  });

  const [open, setOpen] = useState(false);

  useEffect(() => {
    let getData = props;
    setModelData((prevState) => {
      const pd = { ...prevState };
      pd.modelData = getData.data;
      console.log("ModelDropDownUseEffect", pd);
      return pd;
    });
  }, []);

  const dropdownOptions = () => {
    console.log("Helo World I Clicked Model");
  };

  return (
    <div>
      <div
        className="dropdown"
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
      >
        <button className="dropbtn">Model</button>
        {open && (
          <div className="dropdown-content">
            {models.modelData.map((model, idx) => (
              <a key={idx} href="#" onClick={dropdownOptions}>
                {model.name}
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default ModelDropDown;
