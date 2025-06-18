import React, { useState } from 'react'
import { createPortal } from 'react-dom'
import './ErrorPopup.css'

const ErrorPopup = ({message}) => {

  const [display, setDisplay] = useState(true);

  const handleOnDismiss = () => {
    setDisplay(false);
  }

  return createPortal(
    <div>
      {display && 
      <div className="error-container">
        <h3>Something went wrong...</h3>
        <h1>500</h1>
        <p>{message}</p>
        <button onClick={handleOnDismiss}>Dismiss</button>
      </div>}
    </div>
    
    ,document.querySelector('#error-popup')
  )
}

export default ErrorPopup;