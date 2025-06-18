import React, { useRef, useState, useEffect } from 'react';
import * as ort from 'onnxruntime-web';

const SAMWebDemo = () => {
  const canvasRef = useRef(null);
  const [image, setImage] = useState(null);
  const [points, setPoints] = useState([]);
  const [currentMode, setCurrentMode] = useState('positive');
  const [latestMask, setLatestMask] = useState(null);
  const [imageEmbedding, setImageEmbedding] = useState(null);
  const [session, setSession] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const modelUrl = './sam_onnx_example.onnx';

  // Load ONNX model on component mount
  useEffect(() => {
    const loadModel = async () => {
      try {
        const session = await ort.InferenceSession.create(modelUrl, { executionProviders: ['wasm'] });
        setSession(session);
        console.log('Model loaded successfully');
      } catch (error) {
        console.error('Model loading failed:', error);
      }
    };
    loadModel();
  }, []);

  // Handle image upload
  const handleImageUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const img = new Image();
    img.src = URL.createObjectURL(file);
    img.onload = async () => {
      setImage(img);
      setPoints([]);
      setLatestMask(null);
      await fetchImageEmbedding(file);
    };
  };

  // Fetch image embedding (same as original)
  const fetchImageEmbedding = async (imageFile) => {
    setIsLoading(true);
    try {
      const formData = new FormData();
      formData.append('image', imageFile);
      const response = await fetch('http://localhost:5050/get_embedding', {
        method: 'POST',
        body: formData,
      });
      if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
      const arrayBuffer = await response.arrayBuffer();
      const embeddingData = new Float32Array(arrayBuffer);
      const expectedLength = 1 * 256 * 64 * 64;
      if (embeddingData.length !== expectedLength) {
        throw new Error(`Invalid embedding length: ${embeddingData.length}`);
      }
      setImageEmbedding(new ort.Tensor('float32', embeddingData, [1, 256, 64, 64]));
    } catch (error) {
      console.error('Failed to fetch image embedding:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Generate mask (same as original)
  const generateMask = async () => {
    if (!imageEmbedding || !session) return null;
    if (points.length === 0) {
      return { data: new Float32Array(image.width * image.height).fill(0), width: image.width, height: image.height };
    }

    const pointCoordsData = new Float32Array(points.length * 2);
    const pointLabelsData = new Float32Array(points.length);
    points.forEach((point, i) => {
      pointCoordsData[i * 2] = point.x;
      pointCoordsData[i * 2 + 1] = point.y;
      pointLabelsData[i] = point.label;
    });

    const feeds = {
      image_embeddings: imageEmbedding,
      point_coords: new ort.Tensor('float32', pointCoordsData, [1, points.length, 2]),
      point_labels: new ort.Tensor('float32', pointLabelsData, [1, points.length]),
      mask_input: new ort.Tensor('float32', new Float32Array(256 * 256).fill(0), [1, 1, 256, 256]),
      has_mask_input: new ort.Tensor('float32', new Float32Array([0]), [1]),
      orig_im_size: new ort.Tensor('float32', new Float32Array([image.height, image.width]), [2]),
    };

    try {
      const output = await session.run(feeds);
      const maskTensor = output['masks'];
      return { data: maskTensor.data, width: maskTensor.dims[3], height: maskTensor.dims[2] };
    } catch (error) {
      console.error('Inference error:', error);
      return null;
    }
  };

  // Render mask and image
  const renderMask = (maskData, maskWidth, maskHeight) => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    if (!image || !ctx) return;

    // Set canvas size to image size
    canvas.width = image.width;
    canvas.height = image.height;

    // Draw original image
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(image, 0, 0, image.width, image.height);

    // Create temporary canvas for mask
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = maskWidth;
    tempCanvas.height = maskHeight;
    const tempCtx = tempCanvas.getContext('2d');

    // Render mask as semi-transparent red
    const imageData = tempCtx.createImageData(maskWidth, maskHeight);
    for (let i = 0; i < maskData.length; i++) {
      const value = maskData[i] > 0 ? 0.5 : 0;
      imageData.data[i * 4] = 255; // R
      imageData.data[i * 4 + 1] = 0; // G
      imageData.data[i * 4 + 2] = 0; // B
      imageData.data[i * 4 + 3] = value * 255; // A
    }
    tempCtx.putImageData(imageData, 0, 0);

    // Draw mask onto main canvas, scaled to image size
    ctx.drawImage(tempCanvas, 0, 0, image.width, image.height);

    // Draw points
    points.forEach((point) => {
      ctx.beginPath();
      ctx.arc(point.x, point.y, 5, 0, 2 * Math.PI);
      ctx.fillStyle = point.label === 1 ? 'blue' : 'red';
      ctx.fill();
      ctx.strokeStyle = 'white';
      ctx.lineWidth = 1;
      ctx.stroke();
    });
  };

  // Update mask when points or image change
  useEffect(() => {
    const updateMask = async () => {
      if (isLoading) return;
      const maskResult = await generateMask();
      if (maskResult) {
        setLatestMask(maskResult);
        renderMask(maskResult.data, maskResult.width, maskResult.height);
      }
    };
    updateMask();
  }, [points, image, imageEmbedding, session]);

  // Handle canvas click
  const handleCanvasClick = async (event) => {
    if (!imageEmbedding || !session || isLoading) return;

    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    if (currentMode === 'delete') {
      setPoints(points.filter((point) => {
        const dist = Math.sqrt((point.x - x) ** 2 + (point.y - y) ** 2);
        return dist > 10;
      }));
    } else {
      const label = currentMode === 'positive' ? 1 : 0;
      setPoints([...points, { x, y, label }]);
    }
  };

  // Styles
  const styles = {
    container: { textAlign: 'center', fontFamily: 'Arial, sans-serif' },
    button: { padding: '10px 20px', margin: '5px', cursor: 'pointer', borderRadius: '5px' },
    activeButton: { backgroundColor: '#4CAF50', color: 'white' },
    canvas: { border: '1px solid #ccc', display: 'block', margin: '10px auto' },
  };

  return (
    <div style={styles.container}>
      <div>
        <input type="file" accept="image/*" onChange={handleImageUpload} disabled={isLoading} />
        <button
          style={{ ...styles.button, backgroundColor: '#2196F3', color: 'white', ...(currentMode === 'positive' && styles.activeButton) }}
          onClick={() => setCurrentMode('positive')}
          disabled={isLoading}
        >
          Add Positive Point
        </button>
        <button
          style={{ ...styles.button, backgroundColor: '#F44336', color: 'white', ...(currentMode === 'negative' && styles.activeButton) }}
          onClick={() => setCurrentMode('negative')}
          disabled={isLoading}
        >
          Add Negative Point
        </button>
        <button
          style={{ ...styles.button, backgroundColor: '#FFC107', color: 'black', ...(currentMode === 'delete' && styles.activeButton) }}
          onClick={() => setCurrentMode('delete')}
          disabled={isLoading}
        >
          Delete Point
        </button>
        <button
          style={{ ...styles.button, backgroundColor: '#9E9E9E', color: 'white' }}
          onClick={() => setPoints(points.slice(0, -1))}
          disabled={isLoading}
        >
          Undo
        </button>
        <button
          style={{ ...styles.button, backgroundColor: '#673AB7', color: 'white' }}
          onClick={() => console.log('Save mask')} // Implement saveMask similarly
          disabled={isLoading}
        >
          Save Mask
        </button>
      </div>
      <canvas ref={canvasRef} onClick={handleCanvasClick} style={styles.canvas} />
    </div>
  );
};

export default SAMWebDemo;