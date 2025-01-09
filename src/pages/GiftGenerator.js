// src/pages/GiftGenerator.js
import React, { useState } from 'react';
import Dropdown from '../components/Dropdown';

const GiftGenerator = () => {
  const [category, setCategory] = useState('');
  const [occasion, setOccasion] = useState('');
  const [budget, setBudget] = useState('');

  const handleSubmit = () => {
    console.log({ category, occasion, budget });
    // Call your ChatGPT API here
  };

  return (
    <div
      className="gift-generator-page min-h-screen flex items-center justify-center"
      style={{ backgroundColor: '#FFF3E0' }} // Lightest shade for the background
    >
      <div
        className="p-8 rounded-lg shadow-lg"
        style={{
          backgroundColor: '#FFE0B2', // Soft yellow for the card background
          color: '#3E2723', // Dark brown for text
        }}
      >
        <h1
          className="text-3xl font-bold mb-6"
          style={{ color: '#3E2723' }} // Dark brown for heading
        >
          Customize Your Gift
        </h1>
        <form className="space-y-4">
          <Dropdown
            label="Category"
            options={['Electronics', 'Fashion', 'Books']}
            selected={category}
            setSelected={setCategory}
          />
          <Dropdown
            label="Occasion"
            options={['Birthday', 'Anniversary', 'Graduation']}
            selected={occasion}
            setSelected={setOccasion}
          />
          <input
            type="text"
            placeholder="Enter your budget"
            value={budget}
            onChange={(e) => setBudget(e.target.value)}
            className="w-full p-3 rounded"
            style={{
              backgroundColor: '#D4A373', // Tan shade for input background
              color: '#3E2723', // Dark brown for input text
              border: '1px solid #8D6E63', // Brown border
            }}
          />
          <button
            type="button"
            onClick={handleSubmit}
            className="w-full py-3 rounded text-black font-medium"
            style={{
              backgroundColor: '#8D6E63', // Medium brown for button background
              color: '#FFF3E0', // Lightest shade for button text
              transition: 'background-color 0.3s ease',
            }}
            onMouseOver={(e) =>
              (e.target.style.backgroundColor = '#3E2723') // Dark brown on hover
            }
            onMouseOut={(e) =>
              (e.target.style.backgroundColor = '#8D6E63') // Reset to medium brown
            }
          >
            Generate Gift
          </button>
        </form>
      </div>
    </div>
  );
};

export default GiftGenerator;
