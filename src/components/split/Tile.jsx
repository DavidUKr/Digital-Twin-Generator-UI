import React, { useContext, useEffect, useState, useRef} from 'react';
import { FileContext } from '../../providers/FileProvider';
import { SettingsContext } from '../../providers/SettingsProvider';
import { tiledLights } from 'three/examples/jsm/tsl/lighting/TiledLightsNode.js';

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

const Tile = ({ row, col, onEdit, opacity, width, height}) => {
  const { floorplan, resultFiles, viewLayers } = useContext(FileContext);
  const canvasRef = useRef(null);
  const { layerColors } = useContext(SettingsContext);
  const [processedLayers, setProcessedLayers] = useState(null);
  const [processedFloorplan, setProcessedFloorplan] = useState(null);

  // Get the floorplan PNG for this tile
  const floorplanPng = floorplan.split[`row_${row}`][`column_${col}`];

  let tileWidth=100;
  let tileHeight=100;

  if (width) tileWidth=width;
  if (height) tileWidth=height;

  useEffect(() => {
    if (!resultFiles?.segmentation || !layerColors) {
        setProcessedLayers(null);
        return;
    }

    const processAllLayers = async () => {
        let bgImg=null;
        if (floorplanPng) {
              try {
                  bgImg = await loadImage(floorplanPng);
                  tileWidth = bgImg.naturalWidth;
                  tileHeight = bgImg.naturalHeight;
                  console.log('tile width ', tileWidth, 'tile height ', tileHeight);
                  setProcessedFloorplan(bgImg);
              } catch (error) {
                  console.error("Could not draw floorplanPng image.", error);
              }
          }
      
        const processingPromises = resultFiles.segmentation.map(async (layer) => {
            try {
                const maskImg = await loadImage(layer.split[`row_${row}`][`column_${col}`]);
                const layerCanvas = document.createElement('canvas');
                layerCanvas.width = tileWidth;
                layerCanvas.height = tileHeight;
                const layerCtx = layerCanvas.getContext('2d', { willReadFrequently: true });
                
                layerCtx.drawImage(maskImg, 0, 0, tileWidth, tileHeight);
                
                const imageData = layerCtx.getImageData(0, 0, tileWidth, tileHeight);
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

                return { class: layer.class, canvas: layerCanvas};
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
  }, [resultFiles, floorplan, layerColors, floorplanPng]);

  useEffect(() => {
      const canvas = canvasRef.current;
      if (!canvas || !processedFloorplan) return;

      const ctx = canvas.getContext('2d');
      canvas.width = tileWidth;
      canvas.height = tileHeight;

      const drawVisibleLayers = async () => {
          ctx.clearRect(0, 0, tileWidth, tileHeight);

          ctx.drawImage(processedFloorplan, 0, 0, tileWidth, tileHeight);

          if (!processedLayers) {
              return;
          }

          ctx.globalAlpha = opacity;
          for (const layerClass in viewLayers) {
              if (viewLayers[layerClass] && processedLayers[layerClass]) {
                  ctx.drawImage(processedLayers[layerClass], 0, 0, tileWidth, tileHeight);
              }
          }
          ctx.globalAlpha = 1.0;
      };

      drawVisibleLayers();
  }, [processedLayers, viewLayers, processedFloorplan, opacity]);

  const handleClick = () => {
    if (onEdit)
      onEdit(row, col);
  };

  return (
    <div className="tile" onClick={handleClick}>
        <canvas ref={canvasRef} />
    </div>
  );


  // return (
  //   <div className="tile" onClick={handleClick}>
  //     {/* Floorplan image */}
  //     <img
  //       src={`data:image/png;base64,${floorplanPng}`}
  //       alt={`fl_${row}_${col}`}
  //       className="fl-tile-layer"
  //     />
  //     {/* Segmentation layers */}
  //     {Object.entries(viewLayers).map(([key, value]) => {
  //       if (!value) return null; // Skip if layer is not visible
  //       const layerData = resultFiles.segmentation.find(
  //         (layer) => layer.class === key
  //       )?.split[`row_${row}`][`column_${col}`];
  //       if (!layerData) return null; // Skip if no data for this layer
  //       return (
  //         <img
  //           key={key}
  //           src={`data:image/png;base64,${layerData}`}
  //           alt={`sg_${key}_${row}_${col}`}
  //           className="msk-tile-layer"
  //           style={{
  //             opacity:maskOpacity
  //           }}
  //         />
  //       );
  //     })}
  //   </div>
  // );
};

export default Tile;