import React, { createContext, use, useEffect, useReducer, useState } from 'react';
import { useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import ImagePreview from '../components/upload/ImagePreview';
import { FileContext } from '../providers/FileProvider';
import { BackendContext } from '../providers/BackendProvider';
import LoadingSpinner from '../components/inference/LoadingSpinner';
import ErrorPopup from '../components/ErrorPopup';
import ImageResultOverlay from '../components/inference/ImageResultOverlay';
import LayerViewSelector from '../components/inference/layerViewSelector';
import OpacitySlider from '../components/OpacitySlider';
import MaskCanvas from '../components/MaskCanvas';

const Inference = ({modified}) => {

    //logic state management
      const {floorplan, resultFiles, resultFilesDispatch, updateState} = useContext(FileContext);
      const BackendPaths = useContext(BackendContext);
      const navigate = useNavigate()
      const [loading, setLoading] = useState(true);
      const [error, setError] = useState(false);
      const [errorMessage, setErrorMessage] = useState("Could not proceed");
      
    //interactions
      const [maskOpacity, setMaskOpacity] = useState(0.5)

    //page loading
    if(!floorplan.png){
      alert("No loaded floorplan! Please try again!");
      navigate('/upload');
    }

    //model inference
    const getModelResult = async () =>{
      const formData = new FormData();
      formData.append('image', floorplan.png)

      try{
        const request = await fetch(BackendPaths.get_prediction_path, {
          method: 'POST',
          body:formData
        })
        
        if(!request.ok) {
          console.error("Request failed:", request.status);
        }

        console.log("GOT MODEL INFERENCE RESPONSE 200 OK");

        return await request.json();
         
 
      }catch(e){
        console.log(e);
        setLoading(false);
        setErrorMessage("Could not retrieve result!");
        setError(true);
      }
      
    }

    //button handling
    const handleEditInference = () => {
        navigate('/split');
    }

    const handleGenerateDT = () => {
      navigate('/digitaltwin');
    }

    //get model inference evry time the page loads
    useEffect(()=>{
      let isMounted = true;
      const fetchResult = async () => {
        try{
         const data = await getModelResult();
         if(isMounted){
          resultFilesDispatch({type:"all_result", value:data})
          console.log("Server retrieved data:",data);
         } 
         setLoading(false);
        }
        catch (error) {
          if (isMounted) console.error('Error in useEffect:', error);
        }
      }

      if (updateState==="inference"){
        fetchResult();
      }else{
        setLoading(false);
      }
      
      return () => {
        isMounted=false;
      }
    },[]);

    

  return (
    <div>
        <h3>INFERENCE</h3>
        <LayerViewSelector/> 
        <OpacitySlider maskOpacity={maskOpacity} setMaskOpacity={setMaskOpacity}/>
        {/* {!loading? <ImageResultOverlay maskOpacity={maskOpacity}/>:<ImagePreview/>} */}
        {!loading?
          <MaskCanvas width={900} height={600} background={floorplan.png} mask_layers={resultFiles} opacity={maskOpacity}/>
          : <ImagePreview/>
        }
        <br />
        <button onClick={handleEditInference} disabled={loading}>EDIT RESULT</button>
        <button onClick={handleGenerateDT} disabled={loading} >GENERATE DIGITAL TWIN</button>
        {loading && <LoadingSpinner/>}
        {error && <ErrorPopup message={errorMessage}/>}
        {/* {
          !loading &&
          resultFiles.segmentation &&
          resultFiles.segmentation.find((layer) => layer.class === "wall")?.png && (
            <div>
              <br />
              <h2>Mask Preview</h2>
              <img
                src={`data:image/png;base64,${
                  resultFiles.segmentation.find((layer) => layer.class === "wall").png
                }`}
                alt="test wall mask png"
                style={{
                  maxWidth: "700px",
                  maxHeight: "700px",
                  objectFit: "contain",
                  border: "2px solid blue",
                  margin: "50px",
                }}
              />
            </div>
          )
        } */}
    </div>
  )
}

export default Inference