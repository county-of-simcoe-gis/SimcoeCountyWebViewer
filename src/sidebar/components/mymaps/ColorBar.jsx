import React, {useState, useEffect} from 'react';
import "./ColorBar.css";

const ColorBar = props => {

  // USE HOOKS
  //const [activeColor, setActiveColor] = useState("#e809e5");
  const [activeColor, setActiveColor] = useState(props.activeColor);
  
  // PARENT CHANGES THE COLOR FROM STORAGE
  useEffect(() => {
    // UPDATE ACTIVE COLOR
    setActiveColor(props.activeColor);
  });

  return(
    
    <div className="sc-mymaps-colorbar-container">
        <div className="sc-mymaps-colorbar" color="#000000">
            <button className={activeColor === "#000000" ? "active": ""} style={{backgroundColor: "#000000"}} onClick={() => {setActiveColor("#000000"); props.onClick("#000000");}}></button>
            <button className={activeColor === "#e90808" ? "active": ""} style={{backgroundColor: "#e90808"}} onClick={() => {setActiveColor("#e90808"); props.onClick("#e90808");}}></button>
            <button className={activeColor === "#3174ba" ? "active": ""} style={{backgroundColor: "#3174ba"}} onClick={() => {setActiveColor("#3174ba"); props.onClick("#3174ba");}}></button>
            <button className={activeColor === "#55F31E" ? "active": ""} style={{backgroundColor: "#55F31E"}} onClick={() => {setActiveColor("#55F31E"); props.onClick("#55F31E");}}></button>
            <button className={activeColor === "#636363" ? "active": ""} style={{backgroundColor: "#636363"}} onClick={() => {setActiveColor("#636363"); props.onClick("#636363");}}></button>
            <button className={activeColor === "#8aedbd" ? "active": ""} style={{backgroundColor: "#8aedbd"}} onClick={() => {setActiveColor("#8aedbd"); props.onClick("#8aedbd");}}></button>
            <button className={activeColor === "#974400" ? "active": ""} style={{backgroundColor: "#974400"}} onClick={() => {setActiveColor("#974400"); props.onClick("#974400");}}></button>
            <button className={activeColor === "#fcff1b" ? "active": ""} style={{backgroundColor: "#fcff1b"}} onClick={() => {setActiveColor("#fcff1b"); props.onClick("#fcff1b");}}></button>
            <button className={activeColor === "#ffb016" ? "active": ""} style={{backgroundColor: "#ffb016"}} onClick={() => {setActiveColor("#ffb016"); props.onClick("#ffb016");}}></button>
            <button className={activeColor === "#e809e5" ? "active": ""} style={{backgroundColor: "#e809e5"}} onClick={() => {setActiveColor("#e809e5"); props.onClick("#e809e5");}}></button>
            <button className={activeColor === "#6aad2f" ? "active": ""} style={{backgroundColor: "#6aad2f"}} onClick={() => {setActiveColor("#6aad2f"); props.onClick("#6aad2f");}}></button>
            <button className={activeColor === "#08d1e9" ? "active": ""} style={{backgroundColor: "#08d1e9"}} onClick={() => {setActiveColor("#08d1e9"); props.onClick("#08d1e9");}}></button>
            <button className={activeColor === "#FFFFFF" ? "active": ""} style={{backgroundColor: "#FFFFFF"}} onClick={() => {setActiveColor("#FFFFFF"); props.onClick("#FFFFFF");}}></button>
            {/* <button className={activeColor === "#FFFFFF" ? "active": ""} style={{backgroundColor: "#FFFFFF", border: "1px solid #ccc"}} onClick={() => {setActiveColor("#FFFFFF"); props.onClick("#FFFFFF");}}></button> */}
            <button className={activeColor === "#aaaaaa" ? "active": ""} style={{backgroundColor: "#aaaaaa"}} onClick={() => {setActiveColor("#aaaaaa"); props.onClick("#aaaaaa");}}></button>
            <button className={activeColor === "#8aedbd" ? "active": ""} style={{backgroundColor: "#8aedbd"}} onClick={() => {setActiveColor("#8aedbd"); props.onClick("#8aedbd");}}></button>
            <button className={activeColor === "#BE00C1" ? "active": ""} style={{backgroundColor: "#BE00C1"}} onClick={() => {setActiveColor("#BE00C1"); props.onClick("#BE00C1");}}></button>
        </div>
    </div>
  )
}

export default ColorBar;