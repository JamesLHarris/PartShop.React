import React from "react";

function DropDownOptions(props) {
  console.log("HelloWorld Drop Down Component", props);

  return (
    <div>
      <div>Hello</div>
      {props.map((model) => (
        <option key={model.id} value={model.name}>
          {model.name}
        </option>
      ))}
    </div>
  );
}
export default DropDownOptions;
