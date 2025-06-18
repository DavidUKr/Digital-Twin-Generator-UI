import React from 'react'
import { createPortal } from 'react-dom'

const LoadingSpinner = ({message}) => {

  return createPortal(
    <div>
        <h2>Loading...</h2>
        {message && <p>{message}</p>}
        <img src="/Infinity@1x-1.0s-200px-200px.svg" alt="loading spinner" />
    </div>, 
    document.querySelector('#loading-popup')
  )
}

export default LoadingSpinner