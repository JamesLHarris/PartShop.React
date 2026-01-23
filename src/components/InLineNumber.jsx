import React from "react";

function InLineNumber({ value, onSubmit, onCancel, step = 0.01 }) {
  const [v, setV] = React.useState(value ?? "");
  const ref = React.useRef(null);
  React.useEffect(() => {
    ref.current?.focus();
  }, []);

  const submit = () => {
    const n = Number(v);
    if (!Number.isFinite(n)) return;
    onSubmit(n);
  };

  return (
    <span className="apd-inline">
      <input
        ref={ref}
        type="number"
        step={step}
        value={v}
        onChange={(e) => setV(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") submit();
          if (e.key === "Escape") onCancel?.();
        }}
        className="apd-input"
      />
      <button className="apd-btn apd-btn--sm" onClick={submit}>
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

export default InLineNumber;
