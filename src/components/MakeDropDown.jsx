import React, { useEffect, useState } from "react";
import "../dropDown.css";

function MakeDropDown(props) {
  const [models, setMakeData] = useState({
    modelData: [],
  });
  //const handleSelect = props.handleMake onChange={handleSelect}
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let getData = props;
    setMakeData((prevState) => {
      const pd = { ...prevState };
      pd.modelData = getData.data;
      return pd;
    });
  }, []);

  const dropdownOptions = () => {
    console.log("Helo World I Clicked Make");
  };

  return (
    <div>
      <div
        className="dropdown"
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
      >
        <button className="dropbtn">Make</button>
        {open && (
          <div className="dropdown-content">
            {models.modelData.map((model, idx) => (
              <a key={idx} href="#" onClick={dropdownOptions}>
                {model.company}
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default MakeDropDown;
