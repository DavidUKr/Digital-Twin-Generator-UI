import React, { useContext, useEffect, useState } from 'react'
import './ScrollView.css'
import { FileContext } from '../../providers/FileProvider'
import { useNavigate } from 'react-router-dom'
import Tile from './Tile';


const ScrollView = ({startRow, startCol, maskOpacity}) => {
  const navigate = useNavigate();
//data
  const {floorplan, resultFiles, viewLayers} = useContext(FileContext);
  
//tile display logic
  const [row, setRow]=useState(startRow);
  const [col, setCol]=useState(startCol);
  const maxRow = Object.keys(floorplan.split).length-1;
  const maxCol = Object.keys(floorplan.split['row_0']).length-1;

  const handleEdit = () => {
    navigate(`/edit/${row}/${col}`);
  };

  return (
    <div>
      <h3>{`Row: ${row} Column: ${col}`}</h3>
      <div className='scroll-view'>
        <button disabled={row===0} onClick={()=>setRow(row-1)}>UP</button>
          <div className='inline-view'>
            <button disabled={col===0} onClick={()=>setCol(col-1)}>LEFT</button>
              {/* <div className="scroll-image">
                <Tile 
                    key={row+col}
                    row={row} 
                    col={col}
                    opacity={maskOpacity}
                    // width={1000}
                    // height={1000}
                  />
              </div> */}
              <div className="scroll-image">
              {/* Floorplan image */}
              <img
                src={`data:image/png;base64,${floorplan.split[`row_${row}`][`column_${col}`]}`}
                alt={`fl_${row}_${col}`}
                className="fl-scroll-layer"
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
                    className="msk-scroll-layer"
                    style={{
                      opacity:maskOpacity
                    }}
                  />
                );
              })}
            </div>
            <button disabled={col===maxCol} onClick={()=>setCol(col+1)}>RIGHT</button>
          </div>
        <button disabled={row===maxRow} onClick={()=>setRow(row+1)}>DOWN</button>
        <button onClick={handleEdit}>EDIT</button>
      </div>
    </div>
  )
}

export default ScrollView


