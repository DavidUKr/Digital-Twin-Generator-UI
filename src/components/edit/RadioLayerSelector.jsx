import React, { useContext, useEffect, useState } from 'react'
import { FileContext } from '../../providers/FileProvider';

const RadioLayerSelector = ({setLayer, startingOption}) => {
    const {resultFiles} = useContext(FileContext);

    const [selectedOption, setSelectedOption] = useState(startingOption);

    const handleOptionChange = (event) => {
        const target=event.target.value;
        setSelectedOption(target);
    };

    useEffect(()=>{
        setLayer(selectedOption);
    }, [selectedOption]);

    return (
        <div >
        <h3>Select a layer:</h3>
        {Object.values(resultFiles.segmentation).map(layer => {
            return (
                    <button
                        key={layer.class}
                        className='layer-select-btn'
                        disabled={selectedOption === layer.class} 
                        value={layer.class}
                        onClick={handleOptionChange}
                        >
                        {layer.class}
                    </button>
                    
            );
        })}
        </div>
    );
    }

export default RadioLayerSelector