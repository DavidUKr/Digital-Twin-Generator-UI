import React, { useContext, useEffect, useState, useRef } from 'react';
import { FileContext } from '../providers/FileProvider';
import { SettingsContext } from '../providers/SettingsProvider';

const loadImage = (source) => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    let objectUrl = null; 

    let src;
    if (source instanceof File) {
        objectUrl = URL.createObjectURL(source);
        src = objectUrl;
    } else if (typeof source === 'string') {
        src = `data:image/png;base64,${source}`;
    } else {
        return reject(new Error('Invalid image source type provided.'));
    }
    
    img.onload = () => {
        if (objectUrl) {
            URL.revokeObjectURL(objectUrl);
        }
        resolve(img);
    };
    
    img.onerror = (err) => {
        if (objectUrl) {
            URL.revokeObjectURL(objectUrl);
        }
        reject(err);
    };

    img.src = src;
  });
};

const MaskCanvas = ({ width, height, background, mask_layers, opacity = 1.0 }) => {
    const canvasRef = useRef(null);
    const { viewLayers } = useContext(FileContext);
    const { layerColors } = useContext(SettingsContext);
    const [processedLayers, setProcessedLayers] = useState(null);

    useEffect(() => {
        if (!mask_layers?.segmentation || !layerColors || !width || !height) {
            setProcessedLayers(null);
            return;
        }

        const processAllLayers = async () => {
            const processingPromises = mask_layers.segmentation.map(async (layer) => {
                try {
                    const maskImg = await loadImage(layer.png);
                    const layerCanvas = document.createElement('canvas');
                    layerCanvas.width = width;
                    layerCanvas.height = height;
                    const layerCtx = layerCanvas.getContext('2d', { willReadFrequently: true });
                    
                    layerCtx.drawImage(maskImg, 0, 0, width, height);
                    
                    const imageData = layerCtx.getImageData(0, 0, width, height);
                    const data = imageData.data;
                    const rgbColor = layerColors[layer.class];

                    for (let i = 0; i < data.length; i += 4) {
                        if (data[i] > 10 || data[i+1] > 10 || data[i+2] > 10) {
                            data[i] = rgbColor[0];
                            data[i+1] = rgbColor[1];
                            data[i+2] = rgbColor[2];
                        } else {
                            data[i+3] = 0;
                        }
                    }
                    layerCtx.putImageData(imageData, 0, 0);

                    return { class: layer.class, canvas: layerCanvas };
                } catch (error) {
                    console.error(`Could not process layer: ${layer.id}`, error);
                    return null;
                }
            });

            const results = await Promise.all(processingPromises);
            
            const newProcessedLayers = results
                .filter(Boolean)
                .reduce((acc, { class: layerClass, canvas }) => {
                    acc[layerClass] = canvas;
                    return acc;
                }, {});

            setProcessedLayers(newProcessedLayers);
        };

        processAllLayers();
    }, [mask_layers, layerColors, width, height]);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas || !width || !height) return;

        const ctx = canvas.getContext('2d');
        canvas.width = width;
        canvas.height = height;

        const drawVisibleLayers = async () => {
            ctx.clearRect(0, 0, width, height);

            if (background) {
                try {
                    const bgImg = await loadImage(background);
                    ctx.drawImage(bgImg, 0, 0, width, height);
                } catch (error) {
                    console.error("Could not draw background image.", error);
                }
            }

            if (!processedLayers) {
                return;
            }

            ctx.globalAlpha = opacity;
            for (const layerClass in viewLayers) {
                if (viewLayers[layerClass] && processedLayers[layerClass]) {
                    ctx.drawImage(processedLayers[layerClass], 0, 0, width, height);
                }
            }
            ctx.globalAlpha = 1.0;
        };

        drawVisibleLayers();
    }, [processedLayers, viewLayers, background, opacity, width, height]);

    return (
      <div className='image-container'>
        <canvas ref={canvasRef} width={width} height={height}/>
      </div>
    );
};

export default MaskCanvas;