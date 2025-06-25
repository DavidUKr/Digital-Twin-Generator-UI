import React, { createContext } from 'react'

const SettingsContext = createContext();

const SettingsProvider = ({children}) => {

    const layerColors={
        wall:[255, 0, 0],
        doorway:[0,255,0],
        window:[0,0,255],
        appartment_unit:[108,66,188],
        hallway:[15,81,209],
        elevator:[0,205,208],
        stairwell:[255,0,124],
        public_ammenity:[164,123,199],
        balcony:[61,245,61],
    }


  return (
    <SettingsContext value={{layerColors}}>
        {children}
    </SettingsContext>
  )
}

export default SettingsProvider
export {SettingsContext}