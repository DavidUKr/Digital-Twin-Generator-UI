import React from 'react'
import { useNavigate } from 'react-router-dom'
import { useContext } from 'react'
import { FileContext} from '../providers/FileProvider'

const Main = () => {
const navigate = useNavigate()
const {clearFiles} = useContext(FileContext);

const handleStartNew = () => {
  console.log("Clearing previously stored files.");
  clearFiles();
  navigate('/upload');
}

  return (
    <div>
      <h1>Blueprint</h1>

      <button onClick={handleStartNew}>START NEW</button>

    </div>
  )
}

export default Main