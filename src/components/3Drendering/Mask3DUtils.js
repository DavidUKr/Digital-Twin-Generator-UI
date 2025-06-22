// Utility functions for 3D mask processing and generation

/**
 * Convert binary mask to marching cubes mesh
 * @param {Float32Array|Uint8Array} maskData - Binary mask data
 * @param {number} width - Mask width
 * @param {number} height - Mask height
 * @param {number} threshold - Threshold for binary classification
 * @returns {Object} Mesh data with vertices and faces
 */
export function maskToMarchingCubes(maskData, width, height, threshold = 0.5) {
  // Simple marching squares implementation for 2D contours
  const contours = extractContours(maskData, width, height, threshold);
  return contoursToMesh(contours, width, height);
}

/**
 * Extract contours from binary mask using marching squares
 * @param {Float32Array|Uint8Array} maskData - Binary mask data
 * @param {number} width - Mask width
 * @param {number} height - Mask height
 * @param {number} threshold - Threshold for binary classification
 * @returns {Array} Array of contour points
 */
export function extractContours(maskData, width, height, threshold = 0.5) {
  const contours = [];
  const visited = new Set();

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const index = y * width + x;
      if (maskData[index] > threshold && !visited.has(index)) {
        const contour = traceContour(maskData, width, height, x, y, visited, threshold);
        if (contour.length > 2) {
          contours.push(contour);
        }
      }
    }
  }

  return contours;
}

/**
 * Trace contour around a connected component
 * @param {Float32Array|Uint8Array} maskData - Binary mask data
 * @param {number} width - Mask width
 * @param {number} height - Mask height
 * @param {number} startX - Starting X coordinate
 * @param {number} startY - Starting Y coordinate
 * @param {Set} visited - Set of visited pixels
 * @param {number} threshold - Threshold for binary classification
 * @returns {Array} Contour points
 */
function traceContour(maskData, width, height, startX, startY, visited, threshold) {
  const contour = [];
  const directions = [[0, 1], [1, 0], [0, -1], [-1, 0]];
  let x = startX, y = startY;
  let dir = 0;
  const maxContourLength = Math.max(width, height) * 4; // Reasonable maximum contour length
  let steps = 0;

  do {
    // Check bounds and visited status
    if (x < 0 || x >= width || y < 0 || y >= height) {
      console.warn('Contour tracing went out of bounds, stopping');
      break;
    }

    const index = y * width + x;
    if (visited.has(index)) {
      console.warn('Contour tracing hit visited pixel, stopping');
      break;
    }

    visited.add(index);
    contour.push({ x, y });
    steps++;

    // Prevent infinite loops
    if (steps > maxContourLength) {
      console.warn('Contour tracing exceeded maximum length, stopping');
      break;
    }

    // Find next boundary pixel
    let found = false;
    for (let i = 0; i < 4; i++) {
      const nextDir = (dir + i) % 4;
      const nx = x + directions[nextDir][0];
      const ny = y + directions[nextDir][1];
      
      if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
        const nextIndex = ny * width + nx;
        if (maskData[nextIndex] > threshold && !visited.has(nextIndex)) {
          x = nx;
          y = ny;
          dir = nextDir;
          found = true;
          break;
        }
      }
    }
    
    if (!found) {
      console.warn('No next boundary pixel found, stopping');
      break;
    }
  } while (x !== startX || y !== startY);

  return contour;
}

/**
 * Convert contours to 3D mesh
 * @param {Array} contours - Array of contour points
 * @param {number} width - Original mask width
 * @param {number} height - Original mask height
 * @param {number} depth - Extrusion depth
 * @returns {Object} Mesh data
 */
export function contoursToMesh(contours, width, height, depth = 1.0) {
  const vertices = [];
  const faces = [];
  let vertexIndex = 0;

  contours.forEach(contour => {
    if (contour.length < 3) return;

    // Normalize coordinates to [-1, 1] range
    const normalizedContour = contour.map(point => ({
      x: (point.x / width) * 2 - 1,
      y: (point.y / height) * 2 - 1
    }));

    // Create top and bottom faces
    const topVertices = [];
    const bottomVertices = [];

    normalizedContour.forEach(point => {
      // Top vertices
      vertices.push(point.x, point.y, depth / 2);
      topVertices.push(vertexIndex++);

      // Bottom vertices
      vertices.push(point.x, point.y, -depth / 2);
      bottomVertices.push(vertexIndex++);
    });

    // Create top face (triangulate)
    for (let i = 1; i < topVertices.length - 1; i++) {
      faces.push(topVertices[0], topVertices[i], topVertices[i + 1]);
    }

    // Create bottom face (triangulate)
    for (let i = 1; i < bottomVertices.length - 1; i++) {
      faces.push(bottomVertices[0], bottomVertices[i + 1], bottomVertices[i]);
    }

    // Create side faces
    for (let i = 0; i < topVertices.length; i++) {
      const next = (i + 1) % topVertices.length;
      
      // Side face 1
      faces.push(topVertices[i], bottomVertices[i], topVertices[next]);
      
      // Side face 2
      faces.push(bottomVertices[i], bottomVertices[next], topVertices[next]);
    }
  });

  return { vertices, faces };
}

/**
 * Generate voxel geometry from binary mask
 * @param {Float32Array|Uint8Array} maskData - Binary mask data
 * @param {number} width - Mask width
 * @param {number} height - Mask height
 * @param {number} threshold - Threshold for binary classification
 * @param {number} voxelSize - Size of each voxel
 * @returns {Object} Voxel positions
 */
export function maskToVoxels(maskData, width, height, threshold = 0.5, voxelSize = 0.02) {
  const voxels = [];

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const index = y * width + x;
      if (maskData[index] > threshold) {
        voxels.push({
          x: (x / width) * 2 - 1,
          y: (y / height) * 2 - 1,
          z: 0,
          size: voxelSize
        });
      }
    }
  }

  return voxels;
}

/**
 * Generate height map from binary mask
 * @param {Float32Array|Uint8Array} maskData - Binary mask data
 * @param {number} width - Mask width
 * @param {number} height - Mask height
 * @param {number} maxHeight - Maximum height for the surface
 * @returns {Object} Height map data
 */
export function maskToHeightMap(maskData, width, height, maxHeight = 1.0) {
  const heights = new Float32Array(width * height);
  
  for (let i = 0; i < maskData.length; i++) {
    heights[i] = maskData[i] * maxHeight;
  }

  return {
    heights,
    width,
    height,
    maxHeight
  };
}

/**
 * Apply smoothing to binary mask
 * @param {Float32Array|Uint8Array} maskData - Binary mask data
 * @param {number} width - Mask width
 * @param {number} height - Mask height
 * @param {number} kernelSize - Size of smoothing kernel
 * @returns {Float32Array} Smoothed mask data
 */
export function smoothMask(maskData, width, height, kernelSize = 3) {
  const smoothed = new Float32Array(maskData.length);
  const halfKernel = Math.floor(kernelSize / 2);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let sum = 0;
      let count = 0;

      for (let ky = -halfKernel; ky <= halfKernel; ky++) {
        for (let kx = -halfKernel; kx <= halfKernel; kx++) {
          const nx = x + kx;
          const ny = y + ky;
          
          if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
            sum += maskData[ny * width + nx];
            count++;
          }
        }
      }

      smoothed[y * width + x] = sum / count;
    }
  }

  return smoothed;
}

/**
 * Convert base64 image to mask data
 * @param {string} base64Data - Base64 encoded image
 * @param {number} width - Expected width
 * @param {number} height - Expected height
 * @returns {Promise<Float32Array>} Mask data
 */
export function base64ToMaskData(base64Data, width, height) {
  return new Promise((resolve, reject) => {
    try {
      const img = new Image();
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);
          
          const imageData = ctx.getImageData(0, 0, width, height);
          const maskData = new Float32Array(width * height);
          
          for (let i = 0; i < imageData.data.length; i += 4) {
            // Use red channel as mask value
            maskData[i / 4] = imageData.data[i] / 255;
          }
          
          resolve(maskData);
        } catch (error) {
          reject(error);
        }
      };
      img.onerror = () => {
        reject(new Error('Failed to load image'));
      };
      img.src = `data:image/png;base64,${base64Data}`;
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Generate mesh from height map
 * @param {Float32Array} heights - Height data
 * @param {number} width - Width of height map
 * @param {number} height - Height of height map
 * @param {number} maxHeight - Maximum height value
 * @returns {Object} Mesh data
 */
export function heightMapToMesh(heights, width, height, maxHeight = 1.0) {
  const vertices = [];
  const faces = [];
  const uvs = [];

  // Generate vertices
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const index = y * width + x;
      const xPos = (x / (width - 1)) * 2 - 1;
      const yPos = (y / (height - 1)) * 2 - 1;
      const zPos = (heights[index] / maxHeight) * 2 - 1;

      vertices.push(xPos, yPos, zPos);
      uvs.push(x / (width - 1), y / (height - 1));
    }
  }

  // Generate faces
  for (let y = 0; y < height - 1; y++) {
    for (let x = 0; x < width - 1; x++) {
      const topLeft = y * width + x;
      const topRight = topLeft + 1;
      const bottomLeft = (y + 1) * width + x;
      const bottomRight = bottomLeft + 1;

      // First triangle
      faces.push(topLeft, bottomLeft, topRight);
      
      // Second triangle
      faces.push(topRight, bottomLeft, bottomRight);
    }
  }

  return { vertices, faces, uvs };
} 