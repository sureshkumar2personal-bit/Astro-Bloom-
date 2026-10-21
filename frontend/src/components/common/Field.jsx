import { useState, forwardRef } from 'react';

const Field = forwardRef(function Field({ label, type = 'text', error, ...props }, ref) {
  const [visible, setVisible] = useState(false);
  const isPassword = type === 'password';
  const errorId = props.name ? `${props.name}-error` : undefined;
  return (
    <label className="field">
      <span>{label}</span>
      <div className={isPassword ? 'password-wrap' : ''}>
        <input
          ref={ref}
          type={isPassword && visible ? 'text' : type}
          aria-invalid={error ? 'true' : undefined}
          aria-describedby={error ? errorId : undefined}
          {...props}
        />
        {isPassword && (
          <button
            type="button"
            className="password-toggle"
            onClick={() => setVisible(!visible)}
            aria-label={visible ? 'Hide password' : 'Show password'}
          >
            {visible ? 'Hide' : 'Show'}
          </button>
        )}
      </div>
      {error && <span className="field-error" id={errorId} role="alert">{error}</span>}
    </label>
  );
});

export default Field;
