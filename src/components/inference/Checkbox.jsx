import React, { useContext } from 'react'
import { FileContext } from '../../providers/FileProvider';

const Checkbox = ({target}) => {

    const {viewLayers, setViewLayers} = useContext(FileContext);

    const handleSetCheck = () => {
        setViewLayers({
            ...viewLayers,
            [target]:!viewLayers[target]
        });
    };

  return (
    <div>
        <input 
            type="checkbox" 
            id={target+'-checkbox'}
            checked={viewLayers[target]}
            onChange={handleSetCheck}
        />
         <label htmlFor={target+'-checkbox'}>{target.replaceAll("_", " ").toUpperCase()}</label>
    </div>
  )
}

export default Checkbox