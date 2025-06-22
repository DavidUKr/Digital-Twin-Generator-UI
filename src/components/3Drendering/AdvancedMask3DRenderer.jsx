import React, { useRef, useEffect, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { 
  maskToMarchingCubes, 
  maskToVoxels, 
  maskToHeightMap, 
  base64ToMaskData,
  smoothMask,
  heightMapToMesh
} from './Mask3DUtils';

const AdvancedMask3DRenderer = ({ 
  maskData, 
  width, 
  height, 
  renderStyle = 'marching_cubes',
  options = {} 
}) => {
  const mountRef = useRef(null);
  const sceneRef = useRef(null);
  const rendererRef = useRef(null);
  const cameraRef = useRef(null);
  const controlsRef = useRef(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [processedMaskData, setProcessedMaskData] = useState(null);

  const {
    threshold = 0.5,
    smoothing = false,
    smoothingKernel = 3,
    voxelSize = 0.02,
    maxHeight = 1.0,
    materialColor = 0x00ff00,
    materialOpacity = 0.8,
    wireframe = false
  } = options;

  // Initialize Three.js scene
  useEffect(() => {
    if (!mountRef.current) {
      console.log('AdvancedMask3DRenderer: No mount ref available');
      return;
    }

    console.log('AdvancedMask3DRenderer: Initializing Three.js scene');
    
    try {
      // Scene setup
      const scene = new THREE.Scene();
      scene.background = new THREE.Color(0x1a1a1a);
      sceneRef.current = scene;
      console.log('AdvancedMask3DRenderer: Scene created');

      // Camera setup
      const camera = new THREE.PerspectiveCamera(
        75,
        mountRef.current.clientWidth / mountRef.current.clientHeight,
        0.1,
        1000
      );
      camera.position.set(0, 0, 5);
      cameraRef.current = camera;
      console.log('AdvancedMask3DRenderer: Camera created');

      // Renderer setup
      const renderer = new THREE.WebGLRenderer({ antialias: true });
      renderer.setSize(mountRef.current.clientWidth, mountRef.current.clientHeight);
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      rendererRef.current = renderer;
      console.log('AdvancedMask3DRenderer: Renderer created');

      mountRef.current.appendChild(renderer.domElement);
      console.log('AdvancedMask3DRenderer: Canvas appended to DOM');

      // Lighting
      const ambientLight = new THREE.AmbientLight(0x404040, 0.6);
      scene.add(ambientLight);

      const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
      directionalLight.position.set(10, 10, 5);
      directionalLight.castShadow = true;
      directionalLight.shadow.mapSize.width = 2048;
      directionalLight.shadow.mapSize.height = 2048;
      scene.add(directionalLight);

      // Add point light for better illumination
      const pointLight = new THREE.PointLight(0xffffff, 0.5);
      pointLight.position.set(-10, -10, 10);
      scene.add(pointLight);
      console.log('AdvancedMask3DRenderer: Lighting setup complete');

      // Add orbit controls
      console.log('AdvancedMask3DRenderer: Creating OrbitControls');
      const controls = new OrbitControls(camera, renderer.domElement);
      controls.enableDamping = true;
      controls.dampingFactor = 0.05;
      controls.enableZoom = true;
      controls.enablePan = true;
      controlsRef.current = controls;
      console.log('AdvancedMask3DRenderer: OrbitControls created');

      setIsInitialized(true);
      console.log('AdvancedMask3DRenderer: Initialization complete');

      // Animation loop
      const animate = () => {
        requestAnimationFrame(animate);
        if (controlsRef.current) {
          controlsRef.current.update();
        }
        if (rendererRef.current && cameraRef.current) {
          rendererRef.current.render(scene, cameraRef.current);
        }
      };
      animate();

      // Cleanup
      return () => {
        console.log('AdvancedMask3DRenderer: Cleaning up');
        if (mountRef.current && rendererRef.current?.domElement) {
          mountRef.current.removeChild(rendererRef.current.domElement);
        }
        if (rendererRef.current) {
          rendererRef.current.dispose();
        }
      };
    } catch (error) {
      console.error('Error initializing Three.js scene:', error);
    }
  }, []);

  // Process mask data
  useEffect(() => {
    if (!maskData) {
      console.log('AdvancedMask3DRenderer: No mask data provided');
      return;
    }

    console.log('AdvancedMask3DRenderer: Processing mask data', { 
      type: typeof maskData, 
      length: maskData?.length,
      width,
      height 
    });

    const processMask = async () => {
      try {
        let processedData;
        
        if (typeof maskData === 'string') {
          console.log('AdvancedMask3DRenderer: Processing base64 string');
          // Base64 image data
          processedData = await base64ToMaskData(maskData, width, height);
        } else if (maskData instanceof Float32Array || maskData instanceof Uint8Array) {
          console.log('AdvancedMask3DRenderer: Processing typed array');
          // Raw array data
          processedData = Array.from(maskData);
        } else if (Array.isArray(maskData)) {
          console.log('AdvancedMask3DRenderer: Processing regular array');
          // Already an array
          processedData = maskData;
        } else {
          console.log('AdvancedMask3DRenderer: Creating empty array');
          processedData = new Array(width * height).fill(0);
        }

        console.log('AdvancedMask3DRenderer: Processed data length:', processedData.length);

        // Apply smoothing if requested
        if (smoothing) {
          console.log('AdvancedMask3DRenderer: Applying smoothing');
          processedData = smoothMask(processedData, width, height, smoothingKernel);
        }

        setProcessedMaskData(processedData);
        console.log('AdvancedMask3DRenderer: Mask data processed successfully');
      } catch (error) {
        console.error('Error processing mask data:', error);
        setProcessedMaskData(null);
      }
    };

    processMask();
  }, [maskData, width, height, smoothing, smoothingKernel]);

  // Generate 3D geometry from processed mask data
  useEffect(() => {
    if (!isInitialized || !processedMaskData || !sceneRef.current) return;

    try {
      // Clear existing geometry
      const scene = sceneRef.current;
      const existingGeometry = scene.children.filter(child => 
        child.type === 'Mesh' && child.userData.isMaskGeometry
      );
      existingGeometry.forEach(child => scene.remove(child));

      // Create geometry based on render style
      switch (renderStyle) {
        case 'marching_cubes':
          createMarchingCubesGeometry(scene, processedMaskData);
          break;
        case 'voxels':
          createVoxelGeometry(scene, processedMaskData);
          break;
        case 'height_map':
          createHeightMapGeometry(scene, processedMaskData);
          break;
        case 'instanced_voxels':
          createInstancedVoxelGeometry(scene, processedMaskData);
          break;
        default:
          createMarchingCubesGeometry(scene, processedMaskData);
      }
    } catch (error) {
      console.error('Error creating 3D geometry:', error);
    }

  }, [processedMaskData, renderStyle, isInitialized, threshold, voxelSize, maxHeight, materialColor, materialOpacity, wireframe]);

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

  // Create marching cubes geometry
  const createMarchingCubesGeometry = (scene, maskData) => {
    try {
      const meshData = maskToMarchingCubes(maskData, width, height, threshold);
      
      if (meshData.vertices.length > 0) {
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(meshData.vertices, 3));
        geometry.setIndex(meshData.faces);
        geometry.computeVertexNormals();

        const material = new THREE.MeshPhongMaterial({
          color: materialColor,
          transparent: true,
          opacity: materialOpacity,
          wireframe: wireframe,
          side: THREE.DoubleSide
        });

        const mesh = new THREE.Mesh(geometry, material);
        mesh.userData.isMaskGeometry = true;
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        scene.add(mesh);
        console.log('AdvancedMask3DRenderer: Marching cubes geometry created successfully');
      } else {
        console.warn('AdvancedMask3DRenderer: No vertices generated from marching cubes, falling back to voxels');
        createVoxelGeometry(scene, maskData);
      }
    } catch (error) {
      console.error('Error creating marching cubes geometry:', error);
      console.log('AdvancedMask3DRenderer: Falling back to voxel rendering');
      createVoxelGeometry(scene, maskData);
    }
  };

  // Create voxel geometry
  const createVoxelGeometry = (scene, maskData) => {
    try {
      const voxels = maskToVoxels(maskData, width, height, threshold, voxelSize);
      
      console.log('AdvancedMask3DRenderer: Creating voxel geometry with', voxels.length, 'voxels');
      
      if (voxels.length > 0) {
        const geometry = new THREE.BoxGeometry(voxelSize, voxelSize, voxelSize);
        const material = new THREE.MeshPhongMaterial({
          color: materialColor,
          transparent: true,
          opacity: materialOpacity
        });

        // Limit the number of voxels for performance
        const maxVoxels = 10000;
        const voxelsToRender = voxels.length > maxVoxels ? voxels.slice(0, maxVoxels) : voxels;
        
        if (voxels.length > maxVoxels) {
          console.warn(`AdvancedMask3DRenderer: Limiting voxels from ${voxels.length} to ${maxVoxels} for performance`);
        }

        voxelsToRender.forEach(voxel => {
          const mesh = new THREE.Mesh(geometry, material);
          mesh.position.set(voxel.x, voxel.y, voxel.z);
          mesh.userData.isMaskGeometry = true;
          mesh.castShadow = true;
          scene.add(mesh);
        });
        
        console.log('AdvancedMask3DRenderer: Voxel geometry created successfully');
      } else {
        console.warn('AdvancedMask3DRenderer: No voxels to render');
      }
    } catch (error) {
      console.error('Error creating voxel geometry:', error);
    }
  };

  // Create instanced voxel geometry (more efficient for large numbers of voxels)
  const createInstancedVoxelGeometry = (scene, maskData) => {
    try {
      const voxels = maskToVoxels(maskData, width, height, threshold, voxelSize);
      
      if (voxels.length > 0) {
        const geometry = new THREE.BoxGeometry(voxelSize, voxelSize, voxelSize);
        const material = new THREE.MeshPhongMaterial({
          color: materialColor,
          transparent: true,
          opacity: materialOpacity
        });

        const instancedMesh = new THREE.InstancedMesh(geometry, material, voxels.length);
        instancedMesh.userData.isMaskGeometry = true;
        instancedMesh.castShadow = true;

        const matrix = new THREE.Matrix4();
        voxels.forEach((voxel, index) => {
          matrix.setPosition(voxel.x, voxel.y, voxel.z);
          instancedMesh.setMatrixAt(index, matrix);
        });

        scene.add(instancedMesh);
      }
    } catch (error) {
      console.error('Error creating instanced voxel geometry:', error);
    }
  };

  // Create height map geometry
  const createHeightMapGeometry = (scene, maskData) => {
    try {
      const heightMapData = maskToHeightMap(maskData, width, height, maxHeight);
      const meshData = heightMapToMesh(heightMapData.heights, width, height, maxHeight);
      
      if (meshData.vertices.length > 0) {
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(meshData.vertices, 3));
        geometry.setAttribute('uv', new THREE.Float32BufferAttribute(meshData.uvs, 2));
        geometry.setIndex(meshData.faces);
        geometry.computeVertexNormals();

        const material = new THREE.MeshPhongMaterial({
          color: materialColor,
          transparent: true,
          opacity: materialOpacity,
          wireframe: wireframe,
          side: THREE.DoubleSide
        });

        const mesh = new THREE.Mesh(geometry, material);
        mesh.userData.isMaskGeometry = true;
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        scene.add(mesh);
      }
    } catch (error) {
      console.error('Error creating height map geometry:', error);
    }
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
        <div style={{ fontWeight: 'bold', marginBottom: '5px', fontSize: '13px' }}>Advanced 3D Mask Renderer</div>
        <div style={{ marginBottom: '2px' }}>Style: {renderStyle}</div>
        <div style={{ marginBottom: '2px' }}>Size: {width} x {height}</div>
        <div style={{ marginBottom: '2px' }}>Threshold: {threshold}</div>
        {smoothing && <div style={{ marginBottom: '2px' }}>Smoothing: {smoothingKernel}x{smoothingKernel}</div>}
        <div style={{ marginBottom: '2px' }}>Voxels: {processedMaskData ? maskToVoxels(processedMaskData, width, height, threshold).length : 0}</div>
      </div>
    </div>
  );
};

export default AdvancedMask3DRenderer; 