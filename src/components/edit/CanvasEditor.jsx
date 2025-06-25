import React, { useRef, useState, useEffect, useContext } from 'react';
import * as ort from 'onnxruntime-web';
import { FileContext } from '../../providers/FileProvider';
import { BackendContext } from '../../providers/BackendProvider';

// Configure WASM paths to use files in public/wasm/
ort.env.wasm.wasmPaths = {
  'ort-wasm.wasm': '/wasm/ort-wasm-simd-threaded.wasm', // Map to available SIMD WASM
  'ort-wasm-simd.wasm': '/wasm/ort-wasm-simd-threaded.wasm',
  'ort-wasm-threaded.wasm': '/wasm/ort-wasm-simd-threaded.wasm',
  'ort-wasm-simd-threaded.wasm': '/wasm/ort-wasm-simd-threaded.wasm',
  'ort-wasm-simd-threaded.jsep.wasm': '/wasm/ort-wasm-simd-threaded.jsep.wasm',
};

const CanvasEditor = ({ fl_split, seg_split, saveSeg}) => {
  const canvasRef = useRef(null);
  const[tempMask, setTempMask] = useState(null)
  const [image, setImage] = useState(null);
  const [points, setPoints] = useState([]);
  const [currentMode, setCurrentMode] = useState('positive');
  const [latestMask, setLatestMask] = useState(null);
  const [imageEmbedding, setImageEmbedding] = useState(null);
  const [session, setSession] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const [ignorePredictedMask, setIgnorePredictedMask] = useState(false);

  const { floorplan, resultFiles } = useContext(FileContext);
  const BackendPaths = useContext(BackendContext);

  const modelUrl = '/models/sam_onnx_example.onnx';

  // Load ONNX model on component mount
  useEffect(() => {
    const loadModel = async () => {
      setIsLoading(true);
      try {
        const session = await ort.InferenceSession.create(modelUrl, { executionProviders: ['wasm'] });
        setSession(session);
        console.log('Model loaded successfully');
      } catch (error) {
        console.error('Model loading failed:', error);
        console.error('Model URL:', modelUrl);
        console.error('Error stack:', error.stack);
      } finally {
        setIsLoading(false);
      }
    };
    loadModel();
  }, []);

  const base64ToFile = (base64String, fileName = 'floorplan.png') => {
    const base64Data = base64String.replace(/^data:image\/png;base64,/, '');
    const byteString = atob(base64Data);
    const arrayBuffer = new ArrayBuffer(byteString.length);
    const uint8Array = new Uint8Array(arrayBuffer);

    for (let i = 0; i < byteString.length; i++) {
      uint8Array[i] = byteString.charCodeAt(i);
    }

    const blob = new Blob([arrayBuffer], { type: 'image/png' });
    return new File([blob], fileName, { type: 'image/png' });
  };

  // Handle image upload
  const uploadFloorplan = async () => {
    if (!fl_split) return;
    const imageFile = base64ToFile(fl_split);

    const img = new Image();
    img.src = URL.createObjectURL(imageFile);
    img.onload = async () => {
      setImage(img);
      setPoints([]);
      setLatestMask(null);
      await fetchImageEmbedding(imageFile);
      URL.revokeObjectURL(img.src);
    };
    img.onerror = () => console.error('Failed to load floorplan image');
  };

  useEffect(() => {
    uploadFloorplan();
  }, [fl_split]);

  const fetchImageEmbedding = async (imageFile) => {
    setIsLoading(true);
    try {
      const formData = new FormData();
      formData.append('image', imageFile);
      const response = await fetch(BackendPaths.get_sam_embedding_path, {
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

  const convertSegSplitToTensor = async () => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.src = `data:image/png;base64,${seg_split}`;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 256;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, 256, 256);

        const imageData = ctx.getImageData(0, 0, 256, 256);
        const data = imageData.data;

        const tensorData = new Float32Array(256 * 256);
        for (let i = 0; i < tensorData.length; i++) {
          tensorData[i] = data[i * 4] / 255; // Normalize red channel to [0, 1]
        }

        const tensor = new ort.Tensor('float32', tensorData, [1, 1, 256, 256]);
        resolve(tensor);
      };
      img.onerror = () => reject(new Error('Failed to load base64 mask image'));
    });
  };

  // Generate mask
  const generateMask = async () => {
    if (!imageEmbedding || !session || !image) {
      console.warn('Cannot generate mask: missing imageEmbedding, session, or image;','embedding:', 
        imageEmbedding, 'session',session,'image', image
      );
      return null;
    }

    if(!seg_split){
      alert("No segmentation mask, starting fresh.")
    }

    if (points.length === 0 && !seg_split) {
      return { data: new Float32Array(image.width * image.height).fill(0), width: image.width, height: image.height };
    }

    const pointCoordsData = new Float32Array(points.length * 2);
    const pointLabelsData = new Float32Array(points.length);
    points.forEach((point, i) => {
      pointCoordsData[i * 2] = point.x;
      pointCoordsData[i * 2 + 1] = point.y;
      pointLabelsData[i] = point.label;
    });

    let maskInputTensor;
    if (seg_split && !ignorePredictedMask) {
      try {
        maskInputTensor = await convertSegSplitToTensor();
        console.log("NEW mask input:", maskInputTensor);
      } catch (error) {
        console.error('Failed to convert base64 mask to tensor:', error);
        maskInputTensor = new ort.Tensor('float32', new Float32Array(256 * 256).fill(0), [1, 1, 256, 256]);
      }
    } else {
      console.log('No mask input')
      maskInputTensor = new ort.Tensor('float32', new Float32Array(256 * 256).fill(0), [1, 1, 256, 256]);
    }

    const feeds = {
      image_embeddings: imageEmbedding,
      point_coords: new ort.Tensor('float32', pointCoordsData, [1, points.length, 2]),
      point_labels: new ort.Tensor('float32', pointLabelsData, [1, points.length]),
      mask_input: maskInputTensor,
      has_mask_input: new ort.Tensor('float32', new Float32Array([seg_split ? 1 : 0]), [1]),
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

    canvas.width = image.width;
    canvas.height = image.height;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(image, 0, 0, image.width, image.height);

    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = maskWidth;
    tempCanvas.height = maskHeight;
    const tempCtx = tempCanvas.getContext('2d');

    const imageData = tempCtx.createImageData(maskWidth, maskHeight);
    for (let i = 0; i < maskData.length; i++) {
      const value = maskData[i] > 0 ? 1 : 0;
      imageData.data[i * 4] = value * 255; //Red
      imageData.data[i * 4 + 1] = value * 255; //Green
      imageData.data[i * 4 + 2] = value * 255; //Blue
      imageData.data[i * 4 + 3] = value * 255; //Alpha
    }
    tempCtx.putImageData(imageData, 0, 0);

    setTempMask(tempCanvas.toDataURL('image/png'));

    ctx.drawImage(tempCanvas, 0, 0, image.width, image.height);

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

  //reset points when changing seg_split
  useEffect(()=>{
    setPoints([]);
  }, [seg_split])

  // Update mask when points, image, or seg_split change
  useEffect(() => {
    const updateMask = async () => {
      if (isLoading) return;
      console.log('ignore predicted mask:',ignorePredictedMask)
      const maskResult = await generateMask();
      if (maskResult) {
        setLatestMask(maskResult);
        renderMask(maskResult.data, maskResult.width, maskResult.height);
      }
    };
    updateMask();
  }, [points, image, imageEmbedding, session, seg_split, ignorePredictedMask]);

  // Handle canvas click
  const handleCanvasClick = async (event) => {
    if (!imageEmbedding || !session || isLoading) return;

    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width; // Account for CSS scaling
    const scaleY = canvas.height / rect.height;
    const x = (event.clientX - rect.left) * scaleX;
    const y = (event.clientY - rect.top) * scaleY;

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

  const handleSave = () => {
    saveSeg(tempMask.replace(/^data:image\/png;base64,/, ''));
  }

  // Styles
  const styles = {
    container: { textAlign: 'center', fontFamily: 'Arial, sans-serif', marginLeft: '50px'},
    button: { padding: '10px 20px', margin: '5px', cursor: 'pointer', borderRadius: '5px'},
    activeButton: { backgroundColor: '#4CAF50', color: 'white' },
    canvas: { border: '1px solid #ccc', display: 'block', margin: '10px auto' },
  };

  return (
    <div style={styles.container}>
      <div>
        <button onClick={()=>setIgnorePredictedMask(!ignorePredictedMask)}>
          {`Ignore predicted mask: ${ignorePredictedMask}`}
        </button>
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
      </div>
      <canvas ref={canvasRef} onClick={handleCanvasClick} style={styles.canvas} />
      <button
          style={{ ...styles.button, backgroundColor: '#673AB7', color: 'white' }}
          onClick={handleSave}
          disabled={isLoading}
        >
          Save Mask
        </button>
    </div>
  );
};

export default CanvasEditor;