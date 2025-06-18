import React from 'react'
import { useContext, useState } from 'react';
import ImagePreview from '../components/upload/ImagePreview';
import { FileContext } from '../providers/FileProvider';
import { useNavigate } from 'react-router-dom';


const Upload = () => {

    const {floorplan, setFloorplanPNG} = useContext(FileContext);
    const navigate=useNavigate();

    const handleFileChange = (e) => {
        const newFile=e.target.files[0];

        if(newFile.type!=='image/png'){
            alert("Please upload a .png file")
            return;
        }

        // console.log("Upload: Floorplan PNG changed");

        setFloorplanPNG(newFile);
    };

    const handleUpload = () =>{
        if (!floorplan.png){
            alert("Please upload floorplan!");
            return;
        }
        navigate('/inference');
    }

  return (
    <div>
        <form>
              <h3>Select .png file:</h3>
              <input 
                type="file" 
                onChange={handleFileChange}/>
        </form>
        <ImagePreview/>

        <br />
        <button onClick={handleUpload}>Upload</button>
    </div>
);
}

export default Upload;