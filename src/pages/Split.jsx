import { useEffect, useContext, useState } from 'react'
import { useNavigate } from 'react-router-dom';
import { FileContext } from '../providers/FileProvider';
import LoadingSpinner from '../components/inference/LoadingSpinner';
import ErrorPopup from '../components/ErrorPopup';
import { BackendContext } from '../providers/BackendProvider';
import TileView from '../components/split/TileView';
import ScrollView from '../components/split/ScrollView';
import LayerViewSelector from '../components/inference/layerViewSelector';


import './styles/Split.css';
import {reconstructMasks, loadImage} from '../utils/Reconstructor'
import OpacitySlider from '../components/OpacitySlider';

const Split = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [errorMessage, setErrorMessage] = useState("Could not proceed");

  const [view, setView] = useState('tile');
  const [maskOpacity, setMaskOpacity] = useState(0.5);

  const {floorplan, setFloorplanSplit, resultFiles, resultFilesDispatch, setUpdateState} = useContext(FileContext);
  const BackendPaths = useContext(BackendContext);

  const[startScrollRow, setStartScrollRow] = useState(0);
  const[startScrollCol, setStartScrollCol] = useState(0);

  const handleSave = async () => {
    setUpdateState('edited_inference');
    try {
      console.log("loading Image");
      const img = await loadImage(floorplan.png);
      console.log("Reconstructing mask");
      const reconstructedSegmentation = await reconstructMasks(
        resultFiles.segmentation,
        img.width,
        img.height,
        10,
        8
      );
      console.log('dispatching files');
      resultFilesDispatch({
        type: 'set_segmentation', // Adjust based on your reducer
        value: reconstructedSegmentation,
      });
      console.log('DONE');
      // setLoading(false);
      navigate('/inference');
    } catch (e) {
      // setLoading(false);
      setErrorMessage(`Failed to reconstruct masks: ${e.message}`);
    }
  };

  const handleSwitchToTileView = () => {
    setView('tile');
  };

  const handleSwitchToScrollView = () => {
    setView('scroll');
  };

  const handleChangeToScrollFromView = (row, col) =>{
    setStartScrollRow(row);
    setStartScrollCol(col);
    setView('scroll');
  };

  useEffect(() => {

    if (!floorplan.png) {
      alert("No floorplan, redirecting ...");
      navigate('/inference');
    }
    const hasValidSegmentation = resultFiles.segmentation.some(
      (item) => item.class && item.png && item.png !== ""
    );
    if (!hasValidSegmentation) {
      alert("No valid segmentation masks, redirecting...");
      navigate('/inference');
      return;
    }

    const splitImages = async () => {
      const formData = new FormData();
      
      formData.append('image', floorplan.png);
      resultFiles.segmentation.forEach((item) => {
        if (item.png)
          formData.append(`segmentation_${item.class}`, item.png);
      })
      formData.append('num_horizontal_splits', 10);
      formData.append('num_vertical_splits', 8);

      try{
        const request = await fetch(BackendPaths.split_image_masks, {
          method: 'POST',
          body: formData
        })

        if(!request.ok) console.error('Split request failed: ', request.status);
        
        const response = await request.json();
        setFloorplanSplit(response.floorplan)
        resultFilesDispatch({type:'all_split', value:response.segmentation})


      }catch(e){
        console.log(e);
        setErrorMessage("Couldn't split images:"+e);
        setError(true);
      }finally{
        setLoading(false);
      }

    } 
    if(resultFiles.segmentation[0]['split']['row_0']['column_0']==''){
      splitImages();
    }else{
      setLoading(false);
    }

  },[]);

  return (
    <div>
      <h1>Splitting</h1>
      <div className='settings-container'>
        <LayerViewSelector/>
        <OpacitySlider maskOpacity={maskOpacity} setMaskOpacity={setMaskOpacity}/>
      </div>
      <div className='switch-container'>
        
        <button onClick={handleSwitchToTileView} disabled={view==='tile'} className='switch' id='tile-switch'>TILE</button>
        <button onClick={handleSwitchToScrollView} disabled={view==='scroll'} className='switch' id='scroll-switch'>SCROLL</button>
      </div>

      {view === 'tile'? <TileView 
        changeToScroll={handleChangeToScrollFromView}
        maskOpacity={maskOpacity}
      />:<ScrollView 
        startRow={startScrollRow} 
        startCol={startScrollCol}
        maskOpacity={maskOpacity}
      />}

      <button onClick={handleSave}>SAVE</button>
      {loading && <LoadingSpinner/>}
      {error && <ErrorPopup message={errorMessage}/>}
    </div>
  );
}

export default Split;