import React from 'react';
import { Info } from 'lucide-react';

const Tooltip = ({ text, children }) => {
  return (
    <span className="relative flex items-center">
      {children}
      <span className="ml-2 inline-flex items-center" title={text}>
        <Info className="text-slate-400" size={14} />
      </span>
    </span>
  );
};

export default Tooltip;
