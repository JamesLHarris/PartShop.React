import React from "react";

function InLineSelect({ value, options, onSubmit, onCancel }) {
  const [v, setV] = React.useState(value ?? "");
  return (
    <span className="apd-inline">
      <select
        className="apd-input"
        value={v}
        onChange={(e) => setV(e.target.value)}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <button className="apd-btn apd-btn--sm" onClick={() => onSubmit(v)}>
        Save
      </button>
      <button
        className="apd-btn apd-btn--sm apd-btn--outlined"
        onClick={onCancel}
      >
        Cancel
      </button>
    </span>
  );
}

export default InLineSelect;
