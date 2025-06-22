import React, { useRef, useEffect, useState, useContext } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { FileContext } from '../../providers/FileProvider';

const Mask3DRenderer = ({ maskData, width, height, renderStyle = 'extrusion' }) => {
  const mountRef = useRef(null);
  const sceneRef = useRef(null);
  const rendererRef = useRef(null);
  const cameraRef = useRef(null);
  const controlsRef = useRef(null);
  const [isInitialized, setIsInitialized] = useState(false);
  
  const { viewLayers } = useContext(FileContext);

  // Initialize Three.js scene
  useEffect(() => {
    if (!mountRef.current || !maskData) return;

    // Scene setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1a1a1a);
    sceneRef.current = scene;

    // Camera setup
    const camera = new THREE.PerspectiveCamera(
      75,
      mountRef.current.clientWidth / mountRef.current.clientHeight,
      0.1,
      1000
    );
    camera.position.set(0, 0, 5);
    cameraRef.current = camera;

    // Renderer setup
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(mountRef.current.clientWidth, mountRef.current.clientHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    rendererRef.current = renderer;

    mountRef.current.appendChild(renderer.domElement);

    // Lighting
    const ambientLight = new THREE.AmbientLight(0x404040, 0.6);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(10, 10, 5);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    scene.add(directionalLight);

    // Add orbit controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controlsRef.current = controls;

    setIsInitialized(true);

    // Animation loop
    const animate = () => {
      requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    // Cleanup
    return () => {
      if (mountRef.current && renderer.domElement) {
        mountRef.current.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, []);

  // Generate 3D geometry from mask data
  useEffect(() => {
    if (!isInitialized || !maskData || !sceneRef.current) return;

    // Clear existing geometry
    const scene = sceneRef.current;
    const existingGeometry = scene.children.filter(child => 
      child.type === 'Mesh' && child.userData.isMaskGeometry
    );
    existingGeometry.forEach(child => scene.remove(child));

    // Parse mask data
    const maskArray = parseMaskData(maskData, width, height);
    
    if (renderStyle === 'extrusion') {
      createExtrudedGeometry(scene, maskArray, width, height);
    } else if (renderStyle === 'voxels') {
      createVoxelGeometry(scene, maskArray, width, height);
    } else if (renderStyle === 'surface') {
      createSurfaceGeometry(scene, maskArray, width, height);
    }

  }, [maskData, width, height, renderStyle, isInitialized]);

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      if (!mountRef.current || !cameraRef.current || !rendererRef.current) return;

      const width = mountRef.current.clientWidth;
      const height = mountRef.current.clientHeight;

      cameraRef.current.aspect = width / height;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(width, height);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Parse mask data from various formats
  const parseMaskData = (data, w, h) => {
    if (typeof data === 'string') {
      // Base64 image data
      return parseImageData(data, w, h);
    } else if (data instanceof Float32Array || data instanceof Uint8Array) {
      // Raw array data
      return Array.from(data);
    } else if (Array.isArray(data)) {
      // Already an array
      return data;
    }
    return new Array(w * h).fill(0);
  };

  // Parse image data from base64
  const parseImageData = (base64Data, w, h) => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, w, h);
        
        const imageData = ctx.getImageData(0, 0, w, h);
        const data = [];
        for (let i = 0; i < imageData.data.length; i += 4) {
          // Use red channel as mask value
          data.push(imageData.data[i] / 255);
        }
        resolve(data);
      };
      img.src = `data:image/png;base64,${base64Data}`;
    });
  };

  // Create extruded geometry (2D mask extruded into 3D)
  const createExtrudedGeometry = (scene, maskArray, w, h) => {
    const shape = new THREE.Shape();
    const extrudeSettings = {
      depth: 0.5,
      bevelEnabled: false
    };

    // Create shape from mask contours
    const contours = extractContours(maskArray, w, h);
    
    contours.forEach(contour => {
      if (contour.length > 2) {
        const points = contour.map(point => new THREE.Vector2(
          (point.x / w) * 2 - 1, 
          (point.y / h) * 2 - 1
        ));
        
        const geometry = new THREE.Shape(points);
        const extrudeGeometry = new THREE.ExtrudeGeometry(geometry, extrudeSettings);
        const material = new THREE.MeshPhongMaterial({ 
          color: 0x00ff00,
          transparent: true,
          opacity: 0.8
        });
        
        const mesh = new THREE.Mesh(extrudeGeometry, material);
        mesh.userData.isMaskGeometry = true;
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        scene.add(mesh);
      }
    });
  };

  // Create voxel geometry (3D cubes for each mask pixel)
  const createVoxelGeometry = (scene, maskArray, w, h) => {
    const geometry = new THREE.BoxGeometry(0.02, 0.02, 0.02);
    const material = new THREE.MeshPhongMaterial({ color: 0x00ff00 });

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const index = y * w + x;
        if (maskArray[index] > 0.5) {
          const mesh = new THREE.Mesh(geometry, material);
          mesh.position.set(
            (x / w) * 2 - 1,
            (y / h) * 2 - 1,
            0
          );
          mesh.userData.isMaskGeometry = true;
          mesh.castShadow = true;
          scene.add(mesh);
        }
      }
    }
  };

  // Create surface geometry (height map)
  const createSurfaceGeometry = (scene, maskArray, w, h) => {
    const geometry = new THREE.PlaneGeometry(2, 2, w - 1, h - 1);
    const material = new THREE.MeshPhongMaterial({ 
      color: 0x00ff00,
      wireframe: false,
      transparent: true,
      opacity: 0.8
    });

    // Set vertex heights based on mask values
    const positions = geometry.attributes.position.array;
    for (let i = 0; i < positions.length; i += 3) {
      const x = Math.floor((i / 3) % w);
      const y = Math.floor((i / 3) / w);
      if (x < w && y < h) {
        const index = y * w + x;
        positions[i + 2] = maskArray[index] || 0; // Z coordinate
      }
    }

    const mesh = new THREE.Mesh(geometry, material);
    mesh.userData.isMaskGeometry = true;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    scene.add(mesh);
  };

  // Extract contours from binary mask
  const extractContours = (maskArray, w, h) => {
    // Simple contour extraction - you might want to use a more sophisticated algorithm
    const contours = [];
    const visited = new Set();

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const index = y * w + x;
        if (maskArray[index] > 0.5 && !visited.has(index)) {
          const contour = traceContour(maskArray, w, h, x, y, visited);
          if (contour.length > 2) {
            contours.push(contour);
          }
        }
      }
    }

    return contours;
  };

  // Trace contour around a connected component
  const traceContour = (maskArray, w, h, startX, startY, visited) => {
    const contour = [];
    const directions = [[0, 1], [1, 0], [0, -1], [-1, 0]];
    let x = startX, y = startY;
    let dir = 0;

    do {
      visited.add(y * w + x);
      contour.push({ x, y });

      // Find next boundary pixel
      let found = false;
      for (let i = 0; i < 4; i++) {
        const nextDir = (dir + i) % 4;
        const nx = x + directions[nextDir][0];
        const ny = y + directions[nextDir][1];
        
        if (nx >= 0 && nx < w && ny >= 0 && ny < h) {
          const index = ny * w + nx;
          if (maskArray[index] > 0.5) {
            x = nx;
            y = ny;
            dir = nextDir;
            found = true;
            break;
          }
        }
      }
      
      if (!found) break;
    } while (x !== startX || y !== startY);

    return contour;
  };

  return (
    <div style={{ width: '100%', height: '500px', position: 'relative' }}>
      <div 
        ref={mountRef} 
        style={{ width: '100%', height: '100%' }}
      />
      <div style={{ 
        position: 'absolute', 
        top: '10px', 
        left: '10px', 
        background: 'rgba(0,0,0,0.8)', 
        color: '#ffffff', 
        padding: '10px',
        borderRadius: '5px',
        fontSize: '12px',
        fontFamily: 'Arial, sans-serif',
        boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
        backdropFilter: 'blur(2px)'
      }}>
        <div style={{ fontWeight: 'bold', marginBottom: '5px', fontSize: '13px' }}>3D Mask Renderer</div>
        <div style={{ marginBottom: '2px' }}>Style: {renderStyle}</div>
        <div style={{ marginBottom: '2px' }}>Size: {width} x {height}</div>
      </div>
    </div>
  );
};

export default Mask3DRenderer; 