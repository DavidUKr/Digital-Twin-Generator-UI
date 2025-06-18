import React, { useEffect } from 'react'
import { useState } from 'react';

const ToggleViewUnlayered = ({setViewUnlayered}) => {
    const [onlyFloorplan, setOnlyFloorplan] = useState(false);

    const handleToggle = () => {
      setOnlyFloorplan(!onlyFloorplan);
    };

    useEffect(()=>{
        setViewUnlayered(onlyFloorplan);
    }, [onlyFloorplan]);
  
    const buttonStyle = {
        padding: '10px 20px',
        backgroundColor: onlyFloorplan ? 'red' : '#1a1a1a',
        color: 'white',
        border: 'none',
        borderRadius: '4px',
        cursor: 'pointer',
        position: 'absolute',
        top: '940px',
    };
  
    return (
      <button style={buttonStyle} onClick={handleToggle}>
        Only floorplan
      </button>
    );
}

export default ToggleViewUnlayered