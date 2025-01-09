import React from 'react';

const Dropdown = ({ label, options, selected, setSelected }) => {
  return (
    <div className="dropdown mb-4">
      <label
        className="block text-sm font-medium mb-2"
        style={{ color: '#3E2723' }} // Dark brown for label text
      >
        {label}
      </label>
      <select
        value={selected}
        onChange={(e) => setSelected(e.target.value)}
        className="w-full p-3 rounded"
        style={{
          backgroundColor: '#FFE0B2', // Soft yellow background
          color: '#3E2723', // Dark brown text
          border: '1px solid #8D6E63', // Medium brown border
        }}
      >
        <option value="" style={{ color: '#3E2723' }}>
          Select {label}
        </option>
        {options.map((option, index) => (
          <option key={index} value={option} style={{ color: '#3E2723' }}>
            {option}
          </option>
        ))}
      </select>
    </div>
  );
};

export default Dropdown;
