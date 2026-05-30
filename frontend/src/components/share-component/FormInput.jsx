import React from 'react';

const FormInput = ({
  label,
  name,
  type = 'text',
  placeholder = '',
  value,
  onChange,
  error,
  helpText,
  required = false,
  ...rest
}) => {
  const helpId = helpText ? `${name}-help` : undefined;
  const errorId = error ? `${name}-error` : undefined;

  return (
    <div>
      <label className="mb-1.5 flex items-center justify-between text-sm font-medium text-slate-300">
        <span className="flex items-center gap-1">
          {label}
          {required && <span className="text-rose-400">*</span>}
        </span>
      </label>

      <input
        name={name}
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        aria-describedby={`${helpId || ''} ${errorId || ''}`.trim() || undefined}
        className={`w-full rounded-lg border px-4 py-2.5 text-sm outline-none transition focus:ring-1 ${
          error
            ? 'border-rose-400 bg-slate-800 text-white focus:ring-rose-400'
            : 'border-slate-700 bg-slate-800 text-slate-100 focus:ring-emerald-500'
        }`}
        {...rest}
      />

      {helpText && <p id={helpId} className="mt-1 text-xs text-slate-400">{helpText}</p>}
      {error && <p id={errorId} className="mt-1 text-xs text-rose-400">{error}</p>}
    </div>
  );
};

export default FormInput;
