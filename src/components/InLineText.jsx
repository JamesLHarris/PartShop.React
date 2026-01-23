import React from "react";

function InLineText({ value, onSubmit, onCancel, rows = 3, max = 4000 }) {
  const [v, setV] = React.useState(value ?? "");
  const ref = React.useRef(null);
  React.useEffect(() => {
    ref.current?.focus();
  }, []);

  return (
    <div className="apd-inline-col">
      <textarea
        ref={ref}
        rows={rows}
        maxLength={max}
        value={v}
        onChange={(e) => setV(e.target.value)}
        className="apd-textarea"
      />
      <div className="apd-actions">
        <button className="apd-btn apd-btn--sm" onClick={() => onSubmit(v)}>
          Save
        </button>
        <button
          className="apd-btn apd-btn--sm apd-btn--outlined"
          onClick={onCancel}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

export default InLineText;
