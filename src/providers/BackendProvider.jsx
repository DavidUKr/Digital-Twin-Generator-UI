import React from 'react'
import { createContext } from 'react'

const BackendContext = createContext();

const BackendProvider = ({children}) => {

    const baseUrl="http://localhost:5050"

    const BackendPaths = {
        base:baseUrl,
        get_prediction_path:baseUrl+"/predict",
        get_sam_embedding_path:baseUrl+"/get_SAM_embedding",
        save_mask_embedding:baseUrl+"/save_mask",
        split_image_masks:baseUrl+"/split",
        reconstruct_image_masks:baseUrl+"/reconstruct"
    }
  return (
    <BackendContext.Provider value={BackendPaths}>
        {children}
    </BackendContext.Provider>
  )
}
export default BackendProvider;
export {BackendContext}