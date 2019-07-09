import React, { Component } from 'react';
import './Reports.css'

class Reports extends Component {
    state = {  }
    render() { 
        if (this.props.children === undefined)
          return ( <p className="sc-reports-tab-init">There is currently no report generated. <br></br>
            Please click on a property to generate a property report.</p> );

        return ( <div className="sc-reports-tab-content">{this.props.children}</div> );
    }
}
 
export default Reports;