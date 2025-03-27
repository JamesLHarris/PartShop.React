import React from "react";

function DropDownOptions(props) {
  console.log("HelloWorld", props.data);

  // var dropOptions =
  // {
  //   props.data.map((model) => (
  //     <option key={model.id} value={model.name}>
  //       {model.name}
  //     </option>
  //   ))
  // }

  return (
    <div>
      <div>Hello</div>
      {props.data.map((model) => (
        <option key={model.id} value={model.name}>
          {model.name}
        </option>
      ))}
    </div>
  );
}
export default DropDownOptions;
