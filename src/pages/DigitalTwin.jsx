import React, { useContext, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom';
import FloorPlan3D from '../components/3Drendering/FloorPlan3D'
import { FileContext } from '../providers/FileProvider'
import { BackendContext } from '../providers/BackendProvider';

const DigitalTwin = () => {

    const {resultFiles}=useContext(FileContext);
    const BackendPaths=useContext(BackendContext);

    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);
    const [errorMessage, setErrorMessage] = useState("Could not proceed");

    const [points, setPoints] = useState({ 
        outerPoints:[
            [0,0],
            [50,0],
            [50,30],
            [0,30],
            [0.0]
        ],
        innerPoints:[
            [10,10],
            [40,10],
            [40,20],
            [10,20],
            [10.10]
        ]
        }
    );

    useEffect(()=>{
        
        const get_3D_vectors = async () => {
            const formData = new FormData();
            resultFiles.segmentation.forEach((item) => {
                if (item.png)
                formData.append(`segmentation_${item.class}`, item.png);
            })
            formData.append('graph', resultFiles.graph)
            console.log("form request body:", formData)
            try{
                const request = await fetch(BackendPaths.build_digitaltwin, {
                    method: "POST",
                    body: formData
                })
                if(!request.ok) console.error('Digital Twin build failed: ', request.status);
        
                const response = await request.json();
                console.log(response)
                const wall_points={
                    outerPoints:response.outers,
                    innerPoints:response.holes
                }
                setPoints(wall_points)
            }catch(e){
                console.log(e);
                setErrorMessage("Couldn't split images:"+e);
                setError(true);
            }finally{
                setLoading(false);
            }
        }

        get_3D_vectors();

    },[]);

    const handleBack = () => {
        navigate('/inference');
    }

    const handleNew = () => {
        navigate('/')
    }

  return (
    <div>
        <h1>Digital Twin</h1>
        <h3>rendering</h3>
        <button onClick={handleBack}>BACK</button>
        <button onClick={handleNew}>NEW</button>
        <b/>
        <FloorPlan3D pointList={points}/>
    </div>
  )
}

export default DigitalTwin