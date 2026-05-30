import React from 'react';
import { Loader2 } from 'lucide-react';

const LoadingButton = ({ loading, children, className = '', ...props }) => {
  return (
    <button
      {...props}
      disabled={loading || props.disabled}
      className={`inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60 ${className}`}
    >
      {loading && <Loader2 className="animate-spin" size={16} />}
      <span>{children}</span>
    </button>
  );
};

export default LoadingButton;
