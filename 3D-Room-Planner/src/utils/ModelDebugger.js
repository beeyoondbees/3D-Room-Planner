// src/utils/ModelDebugger.js
// Helper utility to debug model loading issues

export class ModelDebugger {
  static debugModel(model, label = 'Model Debug') {
    console.group(`%c ${label}`, 'color: #4CAF50; font-weight: bold;');
    
    // Log basic model info
    console.log('Model object:', model);
    
    if (!model) {
      console.error('Model is null or undefined!');
      console.groupEnd();
      return;
    }
    
    // Check if it's a group or mesh
    const isGroup = model.isGroup;
    const isMesh = model.isMesh;
    console.log(`Type: ${isGroup ? 'Group' : (isMesh ? 'Mesh' : 'Other')}`);
    
    // Check for empty group
    if (isGroup && model.children.length === 0) {
      console.warn('Group has no children!');
    }
    
    // Count meshes and materials
    let meshCount = 0;
    let materialCount = 0;
    let emptyMaterialCount = 0;
    let invalidGeometryCount = 0;
    
    model.traverse((node) => {
      if (node.isMesh) {
        meshCount++;
        
        // Debug geometry
        if (!node.geometry) {
          console.error('Mesh has no geometry!', node);
          invalidGeometryCount++;
        } else {
          // Check for empty geometry
          const attributes = node.geometry.attributes;
          if (!attributes || !attributes.position || attributes.position.count === 0) {
            console.error('Mesh has empty geometry!', node);
            invalidGeometryCount++;
          }
        }
        
        // Debug materials
        if (!node.material) {
          emptyMaterialCount++;
          console.error('Mesh has no material!', node);
        } else {
          const materials = Array.isArray(node.material) ? node.material : [node.material];
          materialCount += materials.length;
          
          // Debug each material
          materials.forEach((material, index) => {
            if (!material) {
              console.error(`Material at index ${index} is null!`, node);
              return;
            }
            
            // Check for texture issues
            ['map', 'normalMap', 'roughnessMap', 'metalnessMap', 'aoMap'].forEach(texType => {
              if (material[texType] && !material[texType].image) {
                console.warn(`Material has ${texType} but no image!`, material);
              }
            });
            
            // Check for shader material issues
            if (material.type === 'ShaderMaterial' || material.type === 'RawShaderMaterial') {
              if (!material.vertexShader) {
                console.error('Shader material missing vertexShader!', material);
              }
              if (!material.fragmentShader) {
                console.error('Shader material missing fragmentShader!', material);
              }
              if (material.uniforms) {
                const uniforms = Object.entries(material.uniforms);
                uniforms.forEach(([key, uniform]) => {
                  if (uniform === undefined || uniform.value === undefined) {
                    console.error(`Uniform "${key}" has undefined value!`, material);
                  }
                });
              }
            }
          });
        }
      }
    });
    
    console.log(`Found ${meshCount} meshes, ${materialCount} materials`);
    
    if (emptyMaterialCount > 0) {
      console.error(`${emptyMaterialCount} meshes have no material!`);
    }
    
    if (invalidGeometryCount > 0) {
      console.error(`${invalidGeometryCount} meshes have invalid geometry!`);
    }
    
    // Check for animations
    if (model.animations && model.animations.length > 0) {
      console.log(`Model has ${model.animations.length} animations`);
    } else {
      console.log('Model has no animations');
    }
    
    console.groupEnd();
  }
  
  static inspectScene(scene, label = 'Scene Debug') {
    console.group(`%c ${label}`, 'color: #2196F3; font-weight: bold;');
    
    console.log('Scene:', scene);
    
    // Check lights
    const lights = [];
    scene.traverse(node => {
      if (node.isLight) {
        lights.push({
          type: node.type,
          intensity: node.intensity,
          position: node.position,
          name: node.name || 'Unnamed light'
        });
      }
    });
    
    console.log(`Found ${lights.length} lights:`, lights);
    
    // Count objects by type
    const objectTypes = {};
    scene.traverse(node => {
      const type = node.type || 'Unknown';
      objectTypes[type] = (objectTypes[type] || 0) + 1;
    });
    
    console.log('Object types in scene:', objectTypes);
    
    console.groupEnd();
  }
  
  static fixModelIssues(model) {
    if (!model) return null;
    
    console.log('Attempting to fix model issues...');
    
    // Fix material issues
    model.traverse((node) => {
      if (node.isMesh) {
        // Fix missing materials
        if (!node.material) {
          console.log('Adding default material to mesh with missing material');
          node.material = new THREE.MeshStandardMaterial({ 
            color: 0xaaaaaa,
            roughness: 0.7,
            metalness: 0.3
          });
        }
        
        // Handle array of materials
        const materials = Array.isArray(node.material) ? node.material : [node.material];
        
        // Fix each material
        for (let i = 0; i < materials.length; i++) {
          let material = materials[i];
          
          // Replace null materials in array
          if (!material) {
            material = new THREE.MeshStandardMaterial({ 
              color: 0xaaaaaa,
              roughness: 0.7,
              metalness: 0.3
            });
            
            if (Array.isArray(node.material)) {
              node.material[i] = material;
            } else {
              node.material = material;
            }
          }
          
          // Ensure material is visible
          material.transparent = material.transparent || false;
          material.opacity = material.opacity !== undefined ? material.opacity : 1.0;
          material.side = THREE.DoubleSide; // Show both sides of faces
          
          // Force material to update
          material.needsUpdate = true;
        }
        
        // Enable shadows
        node.castShadow = true;
        node.receiveShadow = true;
      }
    });
    
    return model;
  }
}