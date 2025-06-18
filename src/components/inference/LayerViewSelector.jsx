import React, { useContext } from 'react'

import { FileContext } from '../../providers/FileProvider'
import './LayerViewSelector.css'
import Checkbox from './Checkbox'

const LayerViewSelector = () => {

    const {viewLayers} = useContext(FileContext);

  return (
    <div
    style={{
        marginLeft:'20px',
        marginRight:'20px',
        display:'inline-block'
    }}>   
        <h3>Toggle view layer</h3>
        {Object.entries(viewLayers).map(([key, value])=>(
            <Checkbox key={key} target={key}/>
        ))}
    </div>
  )
}

export default LayerViewSelector