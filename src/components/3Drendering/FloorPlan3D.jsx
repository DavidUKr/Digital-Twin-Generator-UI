import React, { useRef, useEffect } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';

function pointInPolygon(point, polygon) {
    const x = point[0], y = point[1];
    let isInside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
        const xi = polygon[i][0], yi = polygon[i][1];
        const xj = polygon[j][0], yj = polygon[j][1];
        const intersect = ((yi > y) !== (yj > y))
            && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
        if (intersect) isInside = !isInside;
    }
    return isInside;
}

const FloorPlan3D = ({ pointList }) => {
    const mountRef = useRef(null);

    useEffect(() => {
        if (!pointList || !pointList.outerPoints || pointList.outerPoints.length === 0) {
            return;
        }

        const currentMount = mountRef.current;
        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(75, currentMount.clientWidth/currentMount.clientHeight, 0.1, 1000);
        camera.position.set(30, 40, 50);

        const renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setSize(currentMount.clientWidth, currentMount.clientHeight);
        renderer.shadowMap.enabled = true;
        currentMount.appendChild(renderer.domElement);

        const controls = new OrbitControls(camera, renderer.domElement);
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        scene.add(ambientLight);

        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(50, 50, 50);
        directionalLight.castShadow = true;
        scene.add(directionalLight);

        const allPoints = pointList.outerPoints.flat();
        const boundingBox = new THREE.Box2();
        allPoints.forEach(p => {
            boundingBox.expandByPoint(new THREE.Vector2(p[0], p[1]));
        });

        const center = new THREE.Vector2();
        boundingBox.getCenter(center);

        const size = new THREE.Vector2();
        boundingBox.getSize(size);

        const targetSize = 100;
        const scale = targetSize / Math.max(size.x, size.y);

        const disposables = [];
        
        const sideMaterial = new THREE.MeshStandardMaterial({ color: 0xcccccc, roughness: 0.8, metalness: 0.2 });
        const topMaterial = new THREE.MeshStandardMaterial({ color: 0xff0000, roughness: 0.8, metalness: 0.2 });
        disposables.push(sideMaterial, topMaterial);

        const sections = pointList.outerPoints
            .filter(c => Array.isArray(c) && c.length >= 3)
            .map(outerContour => ({ outer: outerContour, holes: [] }));

        if (pointList.innerPoints) {
            pointList.innerPoints
                .filter(c => Array.isArray(c) && c.length >= 3)
                .forEach(holeContour => {
                    const parentSection = sections.find(section => pointInPolygon(holeContour[0], section.outer));
                    if (parentSection) parentSection.holes.push(holeContour);
                });
        }
        
        sections.forEach(section => {
            const wallHeight = 500;
            const scaledWallHeight = wallHeight * scale;
            
            const scaledOuterPoints = section.outer.map(p => 
                new THREE.Vector2((p[0] - center.x) * scale, (p[1] - center.y) * scale)
            );
            const shape = new THREE.Shape(scaledOuterPoints);
            
            shape.holes = section.holes.map(holeContour => {
                const scaledHolePoints = holeContour.map(p => 
                    new THREE.Vector2((p[0] - center.x) * scale, (p[1] - center.y) * scale)
                );
                return new THREE.Path(scaledHolePoints);
            });

            const wallExtrudeSettings = { depth: scaledWallHeight, bevelEnabled: false };
            const wallGeometry = new THREE.ExtrudeGeometry(shape, wallExtrudeSettings);
            const wallMesh = new THREE.Mesh(wallGeometry, sideMaterial);
            wallMesh.rotation.x = -Math.PI / 2;
            wallMesh.castShadow = true;
            wallMesh.receiveShadow = true;
            scene.add(wallMesh);
            disposables.push(wallGeometry);

            const topGeometry = new THREE.ShapeGeometry(shape);
            const topMesh = new THREE.Mesh(topGeometry, topMaterial);
            
            topMesh.rotation.x = -Math.PI / 2;
            
            // --- THE FIX ---
            // Add a tiny offset to prevent Z-fighting
            topMesh.position.y = scaledWallHeight + 0.01;
            
            topMesh.castShadow = true;
            scene.add(topMesh);
            disposables.push(topGeometry);
        });

        const groundGeometry = new THREE.PlaneGeometry(targetSize+10, targetSize+10);
        const groundMaterial = new THREE.MeshStandardMaterial({ color: 0x669966, side: THREE.DoubleSide });
        const groundPlane = new THREE.Mesh(groundGeometry, groundMaterial);
        groundPlane.rotation.x = -Math.PI / 2;
        groundPlane.receiveShadow = true;
        scene.add(groundPlane);
        disposables.push(groundGeometry, groundMaterial);
        
        let animationFrameId;
        const animate = () => {
            animationFrameId = requestAnimationFrame(animate);
            controls.update();
            renderer.render(scene, camera);
        };
        animate();
        
        const handleResize = () => {
            if (!currentMount) return;
            camera.aspect = currentMount.clientWidth / currentMount.clientHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(currentMount.clientWidth, currentMount.clientHeight);
        };
        window.addEventListener('resize', handleResize);

        return () => {
            window.removeEventListener('resize', handleResize);
            cancelAnimationFrame(animationFrameId);
            if (currentMount) {
                currentMount.removeChild(renderer.domElement);
            }
            disposables.forEach(item => item.dispose());
            renderer.dispose();
        };
    }, [pointList]);

    return <div ref={mountRef} style={{ width: '100vw', height: '100vh' }} />;
};

export default FloorPlan3D;