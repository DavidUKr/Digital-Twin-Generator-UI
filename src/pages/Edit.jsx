import React, { use, useEffect, useState } from 'react';
import { useContext } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { FileContext } from '../providers/FileProvider';
import { BackendContext } from '../providers/BackendProvider';
import LoadingSpinner from '../components/inference/LoadingSpinner';
import ErrorPopup from '../components/ErrorPopup';
import RadioLayerSelector from '../components/edit/RadioLayerSelector';

import './styles/Edit.css'
import ToggleViewUnlayered from '../components/edit/ToggleViewUnlayered';
import CanvasEditor from '../components/edit/CanvasEditor';

// import testWasm from '../components/edit/testWasm';



const Edit = () => {
    

    const navigate = useNavigate()

    const {floorplan, resultFiles} = useContext(FileContext);
    const BackendPaths = useContext(BackendContext);

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);

    const [embedding, setEmbedding] = useState(null);
    const {row, col} = useParams();
    const [layerSelect, setLayerSelect] = useState('wall');
    const [flSplit, setFlSplit] = useState(floorplan.split[`row_${row}`][`column_${col}`]);
    const [segSplit, setSegSplit] = useState('');
    const [viewUnlayered, setViewUnlayered] = useState(false);

    useEffect(()=>{
        setSegSplit(resultFiles.segmentation.find(
            (layer) => layer.class === layerSelect
        )?.split[`row_${row}`][`column_${col}`]); 

        console.log(layerSelect, segSplit);
    }, [layerSelect]);
    

    //page load checks
    if(!flSplit){
        alert("Could not load split! Please try again!");
        setError(true);
    }

    useEffect(()=>{
        if(error){
            setTimeout(()=>navigate('/upload'), 2000)
        }
    }, [error])

    const get_embedding = async () => {
        const SAM_Embedding=BackendPaths.get_sam_embedding_path

        const formData = new FormData();
        formData.append('image', floorplan.png);

        try{
            const response = await fetch(BackendPaths.get_sam_embedding_path, {
                method:'POST',
                body:formData
            });
            setLoading(false);
            if(response.ok){
                const arrayBuffer = response.arrayBuffer();
                const floatArray = new Float32Array(arrayBuffer);
                console.log("Response: "+response.ok);
                console.log(floatArray);
                setEmbedding(floatArray);
            }else{
                setError(true);
            }
        }catch (err) {
            alert(err.message);
        }
        
    }

    const handleSaveModification = () =>{
        //Todo save into mask the modifications
        navigate('/split');
    }

    const updateSegTile = (png) => {
        const layer=resultFiles.segmentation.find(item => item.class==layerSelect);
        layer.split[`row_${row}`][`column_${col}`]=png;

        console.log(resultFiles);
    }

    useEffect(
        () => {
            console.log("INFERENCE");
            get_embedding();
            if (embedding){
                console.log("Embedding OK: ");
                console.log(embedding[10]);
            }
        }
    , []);

  return (
    <div>
        <h1>Edit</h1>
        <h2>{`Split: row ${row}, column ${col}`}</h2>
        <h5>*Save Mask before changing layer, else it will be reset!</h5>
        <div className='editor-container'>
            <div>
                <RadioLayerSelector setLayer={setLayerSelect} startingOption={layerSelect}/>
                <ToggleViewUnlayered setViewUnlayered={setViewUnlayered}/>
            </div>
            <CanvasEditor fl_split={flSplit} seg_split={segSplit} saveSeg={updateSegTile}/>
        </div>
        <button onClick={handleSaveModification}>SAVE MODIFICATIONS</button>
        {loading && <LoadingSpinner message={"Getting embedding for tile"}/>}
        {error && <ErrorPopup message={'Could not retrieve embedding'}/>}
    </div>
  )
}

export default Edit