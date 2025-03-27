import React, { useEffect, useState } from "react";
import "../dropDown.css";

function CatagoryDropDown(props) {
  const [models, setCatagoryData] = useState({
    modelData: [],
  });

  const [open, setOpen] = useState(false);

  useEffect(() => {
    let getData = props;
    setCatagoryData((prevState) => {
      const pd = { ...prevState };
      pd.modelData = getData.data;
      return pd;
    });
  }, []);

  const dropdownOptions = () => {
    console.log("Helo World I Clicked Catagory");
  };

  return (
    <div>
      <div
        className="dropdown"
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
      >
        <button className="dropbtn">Catagory</button>
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

export default CatagoryDropDown;
