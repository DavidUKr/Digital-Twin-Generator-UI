import React, { useContext } from 'react';
import { FileContext } from '../../providers/FileProvider';

const Tile = ({ data, row, col, onEdit, maskOpacity }) => {
  const { floorplan, resultFiles, viewLayers } = useContext(FileContext);

  // Get the floorplan PNG for this tile
  const floorplanPng = floorplan.split[`row_${row}`][`column_${col}`];

  const handleClick = () => {
    onEdit(row, col);
  };

  return (
    <div className="tile" onClick={handleClick}>
      {/* Floorplan image */}
      <img
        src={`data:image/png;base64,${floorplanPng}`}
        alt={`fl_${row}_${col}`}
        className="fl-tile-layer"
      />
      {/* Segmentation layers */}
      {Object.entries(viewLayers).map(([key, value]) => {
        if (!value) return null; // Skip if layer is not visible
        const layerData = resultFiles.segmentation.find(
          (layer) => layer.class === key
        )?.split[`row_${row}`][`column_${col}`];
        if (!layerData) return null; // Skip if no data for this layer
        return (
          <img
            key={key}
            src={`data:image/png;base64,${layerData}`}
            alt={`sg_${key}_${row}_${col}`}
            className="msk-tile-layer"
            style={{
              opacity:maskOpacity
            }}
          />
        );
      })}
    </div>
  );
};

export default Tile;