// src/App.js
// Main application component

import React from 'react';
import RoomPlanner from './components/RoomPlanner';
import './styles/main.scss';

function App() {
  return (
    <div className="app">
      <RoomPlanner />
    </div>
  );
}

export default App;