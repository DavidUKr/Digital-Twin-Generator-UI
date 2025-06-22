import React, { useState, useEffect } from 'react';
import MaskCanvas from '../components/MaskCanvas';
import { FileContext } from '../../providers/FileProvider';

const Mask3DDemo = () => {
    const [demoMode, setDemoMode] = useState(false);
    const [demoMaskData, setDemoMaskData] = useState(null);

    // Generate demo mask data
    useEffect(() => {
        if (demoMode) {
            generateDemoMask();
        }
    }, [demoMode]);

    const generateDemoMask = () => {
        const width = 256;
        const height = 256;
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');

        // Clear canvas
        ctx.fillStyle = 'black';
        ctx.fillRect(0, 0, width, height);

        // Draw some geometric shapes as demo mask
        ctx.fillStyle = 'red';
        
        // Rectangle
        ctx.fillRect(50, 50, 100, 80);
        
        // Circle
        ctx.beginPath();
        ctx.arc(180, 120, 40, 0, 2 * Math.PI);
        ctx.fill();
        
        // Triangle
        ctx.beginPath();
        ctx.moveTo(100, 200);
        ctx.lineTo(150, 150);
        ctx.lineTo(200, 200);
        ctx.closePath();
        ctx.fill();

        // Convert to base64
        const base64Data = canvas.toDataURL('image/png').replace(/^data:image\/png;base64,/, '');
        setDemoMaskData(base64Data);
    };

    return (
        <div style={{ padding: '20px', background: '#ffffff', color: '#333333' }}>
            <h1 style={{ color: '#333333' }}>3D Binary Mask Rendering Demo</h1>
            
            <div style={{ marginBottom: '20px', padding: '15px', background: '#e3f2fd', borderRadius: '5px', border: '1px solid #2196f3' }}>
                <h3 style={{ color: '#333333', marginTop: '0' }}>Demo Controls</h3>
                <label style={{ marginRight: '10px', color: '#333333' }}>
                    <input 
                        type="checkbox" 
                        checked={demoMode}
                        onChange={(e) => setDemoMode(e.target.checked)}
                        style={{ marginRight: '5px' }}
                    />
                    Use Demo Data
                </label>
                <p style={{ marginTop: '10px', fontSize: '14px', color: '#666666' }}>
                    {demoMode 
                        ? "Using generated demo mask with geometric shapes (rectangle, circle, triangle)"
                        : "Using actual segmentation data from your project"
                    }
                </p>
            </div>

            {demoMode ? (
                <div>
                    <h3 style={{ color: '#333333' }}>Demo Mask Preview</h3>
                    <div style={{ marginBottom: '20px' }}>
                        <img 
                            src={`data:image/png;base64,${demoMaskData}`}
                            alt="Demo mask"
                            style={{ 
                                border: '2px solid #dee2e6', 
                                maxWidth: '300px',
                                imageRendering: 'pixelated'
                            }}
                        />
                    </div>
                    
                    {/* Custom MaskCanvas with demo data */}
                    <div style={{ 
                        border: '2px solid #dee2e6', 
                        borderRadius: '5px',
                        padding: '10px',
                        background: '#f8f9fa'
                    }}>
                        <h4 style={{ color: '#333333', marginTop: '0' }}>3D Rendering of Demo Mask</h4>
                        <MaskCanvas demoData={demoMaskData} />
                    </div>
                </div>
            ) : (
                <MaskCanvas />
            )}

            <div style={{ marginTop: '30px', padding: '20px', background: '#f8f9fa', borderRadius: '5px', border: '1px solid #dee2e6' }}>
                <h3 style={{ color: '#333333', marginTop: '0' }}>How to Generate 3D Renderings of Binary Masks</h3>
                
                <h4 style={{ color: '#333333' }}>1. Data Preparation</h4>
                <ul style={{ color: '#333333' }}>
                    <li>Binary masks can be in various formats: PNG images, Float32Array, or Uint8Array</li>
                    <li>Each pixel value represents the probability or binary classification (0-1)</li>
                    <li>Masks are automatically processed and converted to 3D geometries</li>
                </ul>

                <h4 style={{ color: '#333333' }}>2. Rendering Techniques</h4>
                <ul style={{ color: '#333333' }}>
                    <li><strong>Marching Cubes:</strong> Advanced algorithm that creates smooth 3D meshes from binary data</li>
                    <li><strong>Voxels:</strong> Individual 3D cubes for each positive pixel - good for detailed visualization</li>
                    <li><strong>Height Maps:</strong> 3D surfaces where height corresponds to mask values</li>
                    <li><strong>Extrusion:</strong> Simple 2D-to-3D conversion by extruding contours</li>
                </ul>

                <h4 style={{ color: '#333333' }}>3. Performance Considerations</h4>
                <ul style={{ color: '#333333' }}>
                    <li>Large masks (&gt;1024x1024) work best with instanced voxels or marching cubes</li>
                    <li>Smoothing can improve visual quality but increases processing time</li>
                    <li>Wireframe mode is useful for debugging and understanding geometry</li>
                </ul>

                <h4 style={{ color: '#333333' }}>4. Integration with Your Project</h4>
                <ul style={{ color: '#333333' }}>
                    <li>The renderers work with your existing segmentation data from SAM</li>
                    <li>Supports multiple layers (walls, doors, windows, etc.)</li>
                    <li>Can be integrated into your existing workflow</li>
                </ul>
            </div>
        </div>
    );
};

export default Mask3DDemo; 