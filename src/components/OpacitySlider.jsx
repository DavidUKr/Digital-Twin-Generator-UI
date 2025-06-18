import React from 'react'

const OpacitySlider = ({maskOpacity, setMaskOpacity}) => {
  return (
    <div>
        <h4>{`Mask opacity:${(maskOpacity*100)}%`}</h4>
        <input
          type="range"
          min="0"
          max="1"
          step="0.01"
          value={maskOpacity}
          onChange={(e) => setMaskOpacity(e.target.value)}
        />
    </div>
  )
}

export default OpacitySlider