import React, { useEffect } from 'react'
import { useContext, useState} from 'react'
import { FileContext } from '../../providers/FileProvider'

import './ImageResultOverlay.css'

const ImageResultOverlay = ({maskOpacity}) => {
  const {floorplan, resultFiles, viewLayers} = useContext(FileContext);
  const [floorplanObjectUrl, setFloorplanObjectUrl] = useState(null);

  useEffect(() => {
    if (floorplan?.png instanceof File) {
      const url = URL.createObjectURL(floorplan.png);
      setFloorplanObjectUrl(url);
      return () => {
        URL.revokeObjectURL(url);
      };
    }
      setFloorplanObjectUrl(null);
  }, [floorplan?.png]);

  if (!floorplanObjectUrl) {
    return <div style={{
      margin:'50px'
    }}>No oploaded floorplan</div>;
  }
  
    return (
    <div className='image-container'>
        <img src={floorplanObjectUrl} 
        alt='floorplan image' className='floorplan'/>
        
        {Object.entries(viewLayers).map(([key, value])=>(
          value? <img key={key} src={`data:image/png;base64,${resultFiles.segmentation.find((layer)=> layer.class === key).png}`}
          alt={key+' mask'} className='mask'
          style={{opacity:maskOpacity}}
          /> : null
        ))}
    </div>
  )
}

export default ImageResultOverlay