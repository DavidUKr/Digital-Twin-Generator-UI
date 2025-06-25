import React, { useContext } from 'react';
import './TileView.css';
import { useNavigate } from 'react-router-dom';
import { FileContext } from '../../providers/FileProvider';
import Tile from './Tile';

const TileView = ({changeToScroll, maskOpacity}) => {
  const navigate = useNavigate();
  const { floorplan } = useContext(FileContext);

  const handleEditTile = (row, col) => {
    changeToScroll(row, col);
  };

  return (
    <div>
      <div className="tile-view">
      {Object.keys(floorplan.split).map((rowKey) => {
        const rowNumber = parseInt(rowKey.match(/\d+/)?.[0] || '0', 10);
        return (
          <div className="row" key={rowKey}>
            {Object.entries(floorplan.split[rowKey]).map(([columnKey, png]) => {
              const colNumber = parseInt(columnKey.match(/\d+/)?.[0] || '0', 10);

              return (
                <Tile 
                  key={columnKey}
                  row={rowNumber} 
                  col={colNumber} 
                  onEdit={handleEditTile}
                  opacity={maskOpacity}
                />
              );
            })}
          </div>
        );
      })}
    </div>
    </div>
    
  );
};

export default TileView;