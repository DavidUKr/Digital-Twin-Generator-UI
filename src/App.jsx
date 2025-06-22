import { useContext, useState } from 'react'
import {Routes, Route} from 'react-router-dom'
import './App.css'

import Upload from './pages/Upload'
import Home from './pages/Home'
import Edit from './pages/Edit'
import Split from './pages/Split'
import NotFound from './pages/NotFound'
import Inference from './pages/Inference'
// import Mask3DDemo from './pages/Mask3DDemo'

import { FileProvider } from './providers/FileProvider'
import BackendProvider from './providers/BackendProvider'
import DigitalTwin from './pages/DigitalTwin'

function App() {

  return (
    <BackendProvider>
    <FileProvider>
      <div style={{
        margin:'50px'
      }}>
        <Routes>
          <Route path="/" element={<Home/>}/>
          <Route path="/upload" element={<Upload/>}/>
          <Route path="/inference" element={<Inference/>}/>
          <Route path="/split" element={<Split/>}/>
          <Route path="/edit/:row/:col" element={<Edit/>}/>
          <Route path="/digitaltwin" element={<DigitalTwin/>}/>
          {/* <Route path="/mask3d" element={<Mask3DDemo/>}/> */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </div>
      </FileProvider>
    </BackendProvider>
  )
}

export default App
