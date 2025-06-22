# 3D Binary Mask Rendering Guide

This guide explains how to generate 3D renderings of binary masks in the BlueprintCorrector project.

## Overview

The project now includes comprehensive 3D visualization capabilities for binary masks, supporting multiple rendering techniques and real-time interaction. This is particularly useful for visualizing segmentation results from SAM (Segment Anything Model) and other computer vision models.

## Quick Start

1. **Access the Demo**: Navigate to `/mask3d` in your application
2. **Use Demo Data**: Toggle "Use Demo Data" to see examples with generated geometric shapes
3. **Try Different Styles**: Experiment with different rendering techniques
4. **Adjust Parameters**: Use the advanced options to fine-tune the visualization

## Available Rendering Techniques

### 1. Marching Cubes (Recommended)
- **Best for**: Smooth, high-quality 3D meshes
- **Use case**: Professional visualization, detailed analysis
- **Performance**: Good for masks up to 1024x1024
- **Features**: Automatic contour extraction, smooth surfaces

### 2. Voxels
- **Best for**: Detailed pixel-level visualization
- **Use case**: Understanding mask structure, debugging
- **Performance**: Good for small to medium masks
- **Features**: Individual 3D cubes for each positive pixel

### 3. Instanced Voxels
- **Best for**: Large masks with many positive pixels
- **Use case**: High-performance voxel rendering
- **Performance**: Excellent for large masks
- **Features**: GPU-optimized rendering

### 4. Height Map
- **Best for**: Topographic-style visualization
- **Use case**: Understanding mask intensity variations
- **Performance**: Good for all mask sizes
- **Features**: 3D surface with height based on mask values

### 5. Extrusion (Basic)
- **Best for**: Simple 2D-to-3D conversion
- **Use case**: Quick visualization, educational purposes
- **Performance**: Good for all mask sizes
- **Features**: Extrudes 2D contours into 3D volumes

### 6. Surface (Basic)
- **Best for**: Simple surface visualization
- **Use case**: Basic 3D representation
- **Performance**: Good for all mask sizes
- **Features**: 3D surface mesh

## Data Formats Supported

The renderers support multiple input formats:

### 1. Base64 PNG Images
```javascript
const maskData = "iVBORw0KGgoAAAANSUhEUgAA..."; // Base64 string
```

### 2. Float32Array
```javascript
const maskData = new Float32Array(width * height);
// Values should be between 0 and 1
```

### 3. Uint8Array
```javascript
const maskData = new Uint8Array(width * height);
// Values should be between 0 and 255
```

### 4. Regular Arrays
```javascript
const maskData = [0, 1, 0, 1, ...]; // Array of numbers
```

## Integration with Your Project

### Using with SAM Segmentation Results

The renderers work seamlessly with your existing SAM segmentation data:

```javascript
import MaskCanvas from './components/MaskCanvas';

// In your component
const { resultFiles } = useContext(FileContext);

// The component automatically uses segmentation data
<MaskCanvas />
```

### Using with Custom Mask Data

```javascript
import AdvancedMask3DRenderer from './components/AdvancedMask3DRenderer';

const MyComponent = () => {
  const [maskData, setMaskData] = useState(null);
  
  // Your mask processing logic here
  const processMask = async () => {
    // Convert your mask to base64 or array format
    const processedMask = await convertToMaskFormat(yourMaskData);
    setMaskData(processedMask);
  };

  return (
    <AdvancedMask3DRenderer
      maskData={maskData}
      width={256}
      height={256}
      renderStyle="marching_cubes"
      options={{
        threshold: 0.5,
        smoothing: true,
        materialColor: 0x00ff00,
        materialOpacity: 0.8
      }}
    />
  );
};
```

## Advanced Configuration Options

### Threshold
- **Range**: 0.0 - 1.0
- **Default**: 0.5
- **Description**: Determines which pixels are considered "positive" in the mask

### Smoothing
- **Type**: Boolean
- **Default**: false
- **Description**: Applies Gaussian smoothing to reduce noise

### Smoothing Kernel
- **Range**: 3, 5, 7, 9
- **Default**: 3
- **Description**: Size of the smoothing kernel (larger = more smoothing)

### Voxel Size
- **Range**: 0.01 - 0.1
- **Default**: 0.02
- **Description**: Size of individual voxels in voxel rendering

### Max Height
- **Range**: 0.1 - 5.0
- **Default**: 1.0
- **Description**: Maximum height for height map rendering

### Material Color
- **Options**: Various predefined colors
- **Default**: Green (0x00ff00)
- **Description**: Color of the 3D geometry

### Material Opacity
- **Range**: 0.0 - 1.0
- **Default**: 0.8
- **Description**: Transparency of the 3D geometry

### Wireframe Mode
- **Type**: Boolean
- **Default**: false
- **Description**: Shows wireframe instead of solid geometry

## Performance Considerations

### Large Masks (>1024x1024)
- Use **Instanced Voxels** or **Marching Cubes**
- Consider downsampling the mask before rendering
- Enable smoothing with caution (increases processing time)

### Real-time Applications
- Use **Voxels** or **Height Map** for better performance
- Disable smoothing for faster updates
- Consider using lower resolution masks

### Memory Usage
- **Voxels**: High memory usage for dense masks
- **Marching Cubes**: Moderate memory usage
- **Height Map**: Low memory usage
- **Instanced Voxels**: Optimized memory usage

## Troubleshooting

### Common Issues

1. **No 3D Geometry Appears**
   - Check if mask data is properly loaded
   - Verify threshold value (try lowering it)
   - Ensure mask contains positive pixels

2. **Poor Performance**
   - Switch to a more efficient rendering style
   - Reduce mask resolution
   - Disable smoothing

3. **Incorrect Visualization**
   - Check mask data format
   - Verify width and height parameters
   - Adjust threshold value

4. **Memory Issues**
   - Use instanced voxels for large masks
   - Reduce voxel size
   - Consider downsampling

### Debug Tips

- Use **Wireframe Mode** to see geometry structure
- Enable **Smoothing** to reduce noise
- Adjust **Threshold** to find optimal value
- Try different **Render Styles** to find best fit

## Examples

### Basic Usage
```javascript
<MaskCanvas />
```

### Advanced Usage
```javascript
<AdvancedMask3DRenderer
  maskData={myMaskData}
  width={512}
  height={512}
  renderStyle="marching_cubes"
  options={{
    threshold: 0.3,
    smoothing: true,
    smoothingKernel: 5,
    materialColor: 0xff0000,
    materialOpacity: 0.9,
    wireframe: false
  }}
/>
```

### Custom Integration
```javascript
// Process your own mask data
const processCustomMask = async (imageData) => {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  // Your processing logic here
  return canvas.toDataURL('image/png').replace(/^data:image\/png;base64,/, '');
};

// Use in component
const [processedMask, setProcessedMask] = useState(null);

useEffect(() => {
  processCustomMask(myImageData).then(setProcessedMask);
}, [myImageData]);
```

## Future Enhancements

Planned features for future versions:

1. **Texture Mapping**: Apply original images as textures
2. **Animation**: Animate between different mask states
3. **Export**: Export 3D models in various formats (OBJ, STL, etc.)
4. **Multi-layer Rendering**: Render multiple masks simultaneously
5. **Advanced Lighting**: More sophisticated lighting models
6. **VR Support**: Virtual reality visualization

## Contributing

To contribute to the 3D rendering capabilities:

1. Fork the repository
2. Create a feature branch
3. Implement your changes
4. Add tests for new functionality
5. Submit a pull request

## License

This 3D rendering functionality is part of the BlueprintCorrector project and follows the same licensing terms. 