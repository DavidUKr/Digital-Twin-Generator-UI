import { useContext, useState } from 'react'
import {Routes, Route} from 'react-router-dom'
import './App.css'

import Upload from './pages/Upload'
import Home from './pages/Home'
import Edit from './pages/Edit'
import Split from './pages/Split'
import NotFound from './pages/NotFound'
import Inference from './pages/Inference'

import { FileProvider } from './providers/FileProvider'
import BackendProvider from './providers/BackendProvider'

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
          <Route path="*" element={<NotFound />} />
        </Routes>
      </div>
      </FileProvider>
    </BackendProvider>
  )
}

export default App
