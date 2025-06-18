import React, { useEffect, useState } from 'react';
import { useContext } from 'react';
import { FileContext } from '../../providers/FileProvider';

const ImagePreview = () => {
  const { floorplan } = useContext(FileContext);
  const [objectUrl, setObjectUrl] = useState(null);

  useEffect(() => {
    if (floorplan?.png instanceof File) {
      const url = URL.createObjectURL(floorplan.png);
      setObjectUrl(url);
      return () => {
        URL.revokeObjectURL(url);
      };
    }
    setObjectUrl(null);
  }, [floorplan?.png]);

  if (!objectUrl) {
    return <div style={{
      margin:'50px'
    }}>Please upload floorplan.</div>;
  }

  return (
    <div>
      <img
        src={objectUrl}
        alt="floorplan image"
        style={{
          maxWidth: '700px',
          maxHeight: '700px',
          objectFit: 'contain',
          border: '2px solid red',
          margin: '50px',
        }}
        onError={(e) => console.error('Image load error:', e)}
      />
    </div>
  );
};

export default ImagePreview;