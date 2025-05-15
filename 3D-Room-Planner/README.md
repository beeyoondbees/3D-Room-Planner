# 3D Gym Room Planner

A web-based 3D room planner application for designing gym spaces. This tool allows users to add and arrange gym equipment in a virtual room, providing a realistic preview of how the space will look.

## Features

- Interactive 3D environment built with Three.js
- Drag-and-drop gym equipment placement
- 2D and 3D view modes
- Realistic lighting and shadows
- Object manipulation (move, rotate, scale)
- Grid system for precise placement
- Equipment library with common gym items
- Room customization options

## Installation and Setup

### Prerequisites

- Node.js (v14.0.0 or higher)
- npm (v6.0.0 or higher)

### Installation Steps

1. Clone or download this repository
2. Navigate to the project directory in your terminal
3. Install dependencies:

```bash
npm install
```

```bash
npm install three @react-three/fiber @react-three/drei gsap zustand
```

4. Start the development server:

```bash
npm start
```

5. Open your browser and navigate to `http://localhost:3000`

## Using the Application

### Adding Equipment

1. Browse the equipment catalog in the side panel
2. Click on any equipment item to add it to the room
3. The item will be placed in the center of the room

### Manipulating Equipment

1. Click on any equipment item to select it
2. Use the transform controls to:
   - Move: Click and drag to reposition
   - Rotate: Select rotate mode and drag to rotate
   - Scale: Select scale mode and drag to resize

### View Controls

- Switch between 2D (top-down) and 3D views using the view toggle button
- Use the zoom controls to zoom in and out
- Click and drag in empty space to orbit the camera (in 3D mode)
- Right-click and drag to pan the camera

### Additional Controls

- Undo/Redo: Use the toolbar buttons to undo or redo actions
- Grid Toggle: Show or hide the grid for precise placement
- Properties Panel: View and edit properties of selected items

## Troubleshooting

### Common Issues

1. **Models not loading**: 
   - Check if you have an active internet connection
   - The application will display placeholder boxes if models fail to load

2. **Performance issues**:
   - Try reducing the number of objects in the scene
   - Close other resource-intensive applications
   - Update your graphics drivers

3. **Interface not displaying properly**:
   - Make sure your browser is up to date
   - Try a different browser (Chrome, Firefox, or Edge recommended)
   - Check if JavaScript is enabled

### Browser Compatibility

This application works best on:
- Google Chrome (latest)
- Mozilla Firefox (latest)
- Microsoft Edge (latest)
- Safari 14+

## Development Environment Setup

If you want to modify the application:

1. Make sure you have all dependencies installed:
```bash
npm install
```

2. Start the development server with hot reload:
```bash
npm start
```

3. When ready for production, build the optimized version:
```bash
npm run build
```

## Adding Custom 3D Models

To add your own gym equipment models:

1. Create or obtain GLB format 3D models
2. Place the model files in the `public/assets/models/` directory
3. Update the `src/config/equipment.js` file to include your models:
   ```javascript
   modelPaths: {
     // Add your model:
     'your-model-name': '/assets/models/your-model-file.glb',
     // ...existing models
   },
   
   dimensions: {
     // Add dimensions for your model:
     'your-model-name': { width: 1.0, height: 0.5, depth: 1.0 },
     // ...existing dimensions
   },
   
   catalog: {
     'Your Category': [
       { id: 'your-model-name', name: 'Your Model', icon: '/assets/icons/your-icon.png' },
       // ...other models in this category
     ],
     // ...other categories
   }
   ```

4. Add an icon for your model in the `public/assets/icons/` directory

## License

This project is licensed under the MIT License - see the LICENSE file for details.