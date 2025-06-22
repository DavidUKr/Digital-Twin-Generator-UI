import React, { useContext, useState, useEffect } from 'react'
import { FileContext } from '../../providers/FileProvider'
import Mask3DRenderer from './Mask3DRenderer'
import AdvancedMask3DRenderer from './AdvancedMask3DRenderer'
import ErrorBoundary from './ErrorBoundary'

const MaskCanvas = ({ demoData }) => {
    const { floorplan, resultFiles } = useContext(FileContext);
    const [selectedLayer, setSelectedLayer] = useState('wall');
    const [renderStyle, setRenderStyle] = useState('marching_cubes');
    const [maskData, setMaskData] = useState(null);
    const [maskDimensions, setMaskDimensions] = useState({ width: 256, height: 256 });
    const [useAdvancedRenderer, setUseAdvancedRenderer] = useState(true);
    const [renderOptions, setRenderOptions] = useState({
        threshold: 0.5,
        smoothing: false,
        smoothingKernel: 3,
        voxelSize: 0.02,
        maxHeight: 1.0,
        materialColor: 0x00ff00,
        materialOpacity: 0.8,
        wireframe: false
    });

    // Get available layers from resultFiles
    const availableLayers = resultFiles?.segmentation?.map(layer => layer.class) || [];

    // Update mask data when layer, resultFiles, or demoData change
    useEffect(() => {
        if (demoData) {
            // Use demo data if provided
            setMaskData(demoData);
            setMaskDimensions({ width: 256, height: 256 });
        } else if (!resultFiles?.segmentation || !selectedLayer) {
            setMaskData(null);
        } else {
            const layer = resultFiles.segmentation.find(l => l.class === selectedLayer);
            if (layer?.png) {
                setMaskData(layer.png);
                
                // Try to get dimensions from floorplan if available
                if (floorplan?.png instanceof File) {
                    const img = new Image();
                    img.onload = () => {
                        setMaskDimensions({ width: img.width, height: img.height });
                    };
                    img.onerror = () => {
                        console.warn('Failed to load floorplan image for dimensions');
                        setMaskDimensions({ width: 256, height: 256 });
                    };
                    img.src = URL.createObjectURL(floorplan.png);
                }
            } else {
                setMaskData(null);
            }
        }
    }, [selectedLayer, resultFiles, floorplan, demoData]);

    const renderStyles = [
        { value: 'marching_cubes', label: 'Marching Cubes' },
        { value: 'voxels', label: 'Voxels' },
        { value: 'instanced_voxels', label: 'Instanced Voxels' },
        { value: 'height_map', label: 'Height Map' },
        { value: 'extrusion', label: 'Extrusion (Basic)' },
        { value: 'surface', label: 'Surface (Basic)' }
    ];

    const colorOptions = [
        { value: 0x00ff00, label: 'Green' },
        { value: 0xff0000, label: 'Red' },
        { value: 0x0000ff, label: 'Blue' },
        { value: 0xffff00, label: 'Yellow' },
        { value: 0xff00ff, label: 'Magenta' },
        { value: 0x00ffff, label: 'Cyan' },
        { value: 0xffffff, label: 'White' },
        { value: 0xffa500, label: 'Orange' }
    ];

    const handleOptionChange = (key, value) => {
        setRenderOptions(prev => ({
            ...prev,
            [key]: value
        }));
    };

    return (
        <div style={{ padding: '20px', background: '#ffffff', color: '#333333' }}>
            <h2 style={{ color: '#333333' }}>3D Mask Visualization</h2>
            
            {/* Renderer Selection */}
            <div style={{ marginBottom: '20px', padding: '10px', background: '#e8f4fd', borderRadius: '5px', border: '1px solid #b3d9ff' }}>
                <label style={{ marginRight: '10px', color: '#333333' }}>
                    <input 
                        type="checkbox" 
                        checked={useAdvancedRenderer}
                        onChange={(e) => setUseAdvancedRenderer(e.target.checked)}
                        style={{ marginRight: '5px' }}
                    />
                    Use Advanced Renderer
                </label>
            </div>

            {/* Layer Selection - Only show if not using demo data */}
            {!demoData && (
                <div style={{ marginBottom: '20px' }}>
                    <label style={{ marginRight: '10px', color: '#333333' }}>Select Layer:</label>
                    <select 
                        value={selectedLayer} 
                        onChange={(e) => setSelectedLayer(e.target.value)}
                        style={{ padding: '5px', marginRight: '20px', color: '#333333' }}
                    >
                        {availableLayers.map(layer => (
                            <option key={layer} value={layer}>{layer}</option>
                        ))}
                    </select>
                </div>
            )}

            {/* Render Style Selection */}
            <div style={{ marginBottom: '20px' }}>
                <label style={{ marginRight: '10px', color: '#333333' }}>Render Style:</label>
                <select 
                    value={renderStyle} 
                    onChange={(e) => setRenderStyle(e.target.value)}
                    style={{ padding: '5px', color: '#333333' }}
                >
                    {renderStyles.map(style => (
                        <option key={style.value} value={style.value}>{style.label}</option>
                    ))}
                </select>
            </div>

            {/* Advanced Options */}
            {useAdvancedRenderer && (
                <div style={{ marginBottom: '20px', padding: '15px', background: '#f8f9fa', borderRadius: '5px', border: '1px solid #dee2e6' }}>
                    <h3 style={{ color: '#333333', marginTop: '0' }}>Advanced Options</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px' }}>
                        <div>
                            <label style={{ color: '#333333' }}>Threshold: {renderOptions.threshold}</label>
                            <input 
                                type="range" 
                                min="0" 
                                max="1" 
                                step="0.1" 
                                value={renderOptions.threshold}
                                onChange={(e) => handleOptionChange('threshold', parseFloat(e.target.value))}
                                style={{ width: '100%' }}
                            />
                        </div>
                        
                        <div>
                            <label style={{ color: '#333333' }}>Opacity: {renderOptions.materialOpacity}</label>
                            <input 
                                type="range" 
                                min="0" 
                                max="1" 
                                step="0.1" 
                                value={renderOptions.materialOpacity}
                                onChange={(e) => handleOptionChange('materialOpacity', parseFloat(e.target.value))}
                                style={{ width: '100%' }}
                            />
                        </div>

                        <div>
                            <label style={{ color: '#333333' }}>Max Height: {renderOptions.maxHeight}</label>
                            <input 
                                type="range" 
                                min="0.1" 
                                max="5" 
                                step="0.1" 
                                value={renderOptions.maxHeight}
                                onChange={(e) => handleOptionChange('maxHeight', parseFloat(e.target.value))}
                                style={{ width: '100%' }}
                            />
                        </div>

                        <div>
                            <label style={{ color: '#333333' }}>Voxel Size: {renderOptions.voxelSize}</label>
                            <input 
                                type="range" 
                                min="0.01" 
                                max="0.1" 
                                step="0.01" 
                                value={renderOptions.voxelSize}
                                onChange={(e) => handleOptionChange('voxelSize', parseFloat(e.target.value))}
                                style={{ width: '100%' }}
                            />
                        </div>

                        <div>
                            <label style={{ color: '#333333' }}>Material Color:</label>
                            <select 
                                value={renderOptions.materialColor}
                                onChange={(e) => handleOptionChange('materialColor', parseInt(e.target.value))}
                                style={{ width: '100%', padding: '5px', color: '#333333' }}
                            >
                                {colorOptions.map(color => (
                                    <option key={color.value} value={color.value}>{color.label}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label style={{ color: '#333333' }}>
                                <input 
                                    type="checkbox" 
                                    checked={renderOptions.smoothing}
                                    onChange={(e) => handleOptionChange('smoothing', e.target.checked)}
                                    style={{ marginRight: '5px' }}
                                />
                                Enable Smoothing
                            </label>
                            {renderOptions.smoothing && (
                                <div>
                                    <label style={{ color: '#333333' }}>Smoothing Kernel: {renderOptions.smoothingKernel}</label>
                                    <input 
                                        type="range" 
                                        min="3" 
                                        max="9" 
                                        step="2" 
                                        value={renderOptions.smoothingKernel}
                                        onChange={(e) => handleOptionChange('smoothingKernel', parseInt(e.target.value))}
                                        style={{ width: '100%' }}
                                    />
                                </div>
                            )}
                        </div>

                        <div>
                            <label style={{ color: '#333333' }}>
                                <input 
                                    type="checkbox" 
                                    checked={renderOptions.wireframe}
                                    onChange={(e) => handleOptionChange('wireframe', e.target.checked)}
                                    style={{ marginRight: '5px' }}
                                />
                                Wireframe Mode
                            </label>
                        </div>
                    </div>
                </div>
            )}

            {/* 3D Renderer */}
            {maskData ? (
                <ErrorBoundary>
                    {useAdvancedRenderer ? (
                        <AdvancedMask3DRenderer 
                            maskData={maskData}
                            width={maskDimensions.width}
                            height={maskDimensions.height}
                            renderStyle={renderStyle}
                            options={renderOptions}
                        />
                    ) : (
                        <Mask3DRenderer 
                            maskData={maskData}
                            width={maskDimensions.width}
                            height={maskDimensions.height}
                            renderStyle={renderStyle}
                        />
                    )}
                </ErrorBoundary>
            ) : (
                <div style={{ 
                    width: '100%', 
                    height: '500px', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    background: '#f8f9fa',
                    border: '2px dashed #dee2e6',
                    color: '#6c757d'
                }}>
                    <p>No mask data available. {demoData ? 'Demo data not loaded.' : 'Please run inference first.'}</p>
                </div>
            )}

            {/* Instructions */}
            <div style={{ marginTop: '20px', padding: '15px', background: '#f8f9fa', borderRadius: '5px', border: '1px solid #dee2e6' }}>
                <h3 style={{ color: '#333333', marginTop: '0' }}>Controls:</h3>
                <ul style={{ color: '#333333' }}>
                    <li><strong>Mouse:</strong> Rotate view</li>
                    <li><strong>Scroll:</strong> Zoom in/out</li>
                    <li><strong>Right-click + drag:</strong> Pan view</li>
                </ul>
                
                <h3 style={{ color: '#333333' }}>Render Styles:</h3>
                <ul style={{ color: '#333333' }}>
                    <li><strong>Marching Cubes:</strong> Advanced contour-based 3D mesh</li>
                    <li><strong>Voxels:</strong> Individual 3D cubes for each mask pixel</li>
                    <li><strong>Instanced Voxels:</strong> Efficient voxel rendering for large masks</li>
                    <li><strong>Height Map:</strong> 3D surface with height based on mask values</li>
                    <li><strong>Extrusion:</strong> 2D mask extruded into 3D volume (basic)</li>
                    <li><strong>Surface:</strong> 3D surface mesh (basic)</li>
                </ul>
            </div>
        </div>
    )
}

export default MaskCanvas