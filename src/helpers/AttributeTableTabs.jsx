import React, { Component } from "react";
import styled from "styled-components";
import * as helpers from "./helpers";
import "./AttributeTableTabs.css";
import { Tab, Tabs, TabList, TabPanel } from "react-tabs";
// import { useTable, useBlockLayout, useResizeColumns, useAbsoluteLayout } from "react-table";
import { useTable, useBlockLayout, useResizeColumns } from "react-table";
import { useSticky } from "react-table-sticky";

class AttributeTableTabs extends Component {
  constructor(props) {
    super(props);
    this.state = {};
  }
  render() {
    if (this.props.items.length === 0) return <div>No items to display.</div>;
    return (
      <div>
        <Tabs forceRenderTabPanel={true} selectedIndex={this.state.tabIndex} onSelect={this.onTabSelect}>
          <TabList>
            {this.props.items.map((item) => {
              return (
                <Tab id={item.name} key={helpers.getUID()} className="sc-attribute-table-tab sc-noselect">
                  <AttributeTableTabButton key={helpers.getUID()} name={item.name} />
                </Tab>
              );
            })}
          </TabList>
          {this.props.items.map((item) => {
            return (
              <TabPanel id={item.name + "_content"} key={helpers.getUID()}>
                <AttributeTableContent data={item.geoJson} key={helpers.getUID()} height={this.props.height} width={this.props.width} />
              </TabPanel>
            );
          })}
        </Tabs>
      </div>
    );
  }
}

export default AttributeTableTabs;

// TAB BUTTON
const AttributeTableTabButton = (props) => {
  return (
    <div>
      {props.name}
      {/* <img className="sc-attribute-tab-close-img" src={images["close-tab.png"]} alt="close tab" /> */}
      <div className="sc-attribute-table-close-button-container">
        <div className="sc-attribute-table-close-button-mid">
          <div className="sc-attribute-table-close-button-mid2" />
        </div>
      </div>
    </div>
  );
};

// TAB BUTTON
const AttributeTableContent = (props) => {
  if (props.data.length === 0) return <div>No Data</div>;

  // console.log(props.data);
  // CREATE COLUMNS
  let columnArray = [];
  columnArray.push({ Header: "*", accessor: "*", width: 20, style: { backgroundColor: "#ddd" } });
  Object.keys(props.data[0].getProperties()).forEach((key) => {
    if (key === "geometry") return;
    columnArray.push({ Header: key, accessor: key });
  });
  const columns = React.useMemo(() => columnArray, []);

  let rowArray = [];
  props.data.forEach((feature) => {
    const featureProps = feature.getProperties();
    let row = {};
    row["*"] = "";
    Object.keys(featureProps).forEach((key) => {
      if (key === "geometry") return;

      const val = featureProps[key];
      row[key] = val;
    });
    rowArray.push(row);
  });

  const data = React.useMemo(() => rowArray, []);

  //   const { getTableProps, getTableBodyProps, headerGroups, rows, prepareRow } = useTable({ columns, data }, useAbsoluteLayout);

  return (
    <div className="sc-attribute-table">
      <CustomTable columns={columns} data={data} width={props.width} height={props.height} />;
    </div>
  );

  // return (
  //   <div className="sc-attribute-table">
  //     <ReactTableFixedColumns
  //       data={data}
  //       columns={columns}
  //       // defaultPageSize={50}
  //       style={{ height: props.height }}
  //       className="-striped"
  //     />
  //   </div>
  // );
};

const CustomTable = ({ columns, data, width, height }) => {
  const { getTableProps, getTableBodyProps, headerGroups, rows, prepareRow } = useTable(
    {
      columns,
      data,
    },
    useBlockLayout,
    useSticky,
    useResizeColumns
  );

  // Workaround as react-table footerGroups doesn't provide the same internal data than headerGroups
  // const footerGroups = headerGroups.slice().reverse();

  return (
    <Styles>
      <div {...getTableProps()} className="table sticky" style={{ width: width - 4, height: height - 32 }}>
        <div className="header">
          {headerGroups.map((headerGroup) => (
            <div {...headerGroup.getHeaderGroupProps()} className="tr">
              {headerGroup.headers.map((column) => (
                <div {...column.getHeaderProps()} className="th sc-attribute-table-header">
                  {column.render("Header")}
                  {/* Use column.getResizerProps to hook up the events correctly */}
                  <div {...column.getResizerProps()} className={`resizer ${column.isResizing ? "isResizing" : ""}`} />
                </div>
              ))}
            </div>
          ))}
        </div>
        <div {...getTableBodyProps()} className="body">
          {rows.map((row) => {
            prepareRow(row);

            return (
              <div {...row.getRowProps()} className="tr">
                {row.cells.map((cell) => {
                  console.log(cell.column.Header);
                  return (
                    <div {...cell.getCellProps()} className={cell.column.Header === "*" ? "sc-attribute-table-cell-button td" : "td"}>
                      {cell.render("Cell")}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
        {/* <div className="footer">
          {footerGroups.map((footerGroup) => (
            <div {...footerGroup.getHeaderGroupProps()} className="tr">
              {footerGroup.headers.map((column) => (
                <div {...column.getHeaderProps()} className="td">
                  {column.render("Footer")}
                </div>
              ))}
            </div>
          ))}
        </div> */}
      </div>
    </Styles>
  );
};
// const CustomTable = ({ columns, data }) => {
//   // Use the state and functions returned from useTable to build your UI

//   const defaultColumn = React.useMemo(
//     () => ({
//       width: 150,
//     }),
//     []
//   );

//   const { getTableProps, getTableBodyProps, headerGroups, rows, prepareRow } = useTable(
//     {
//       columns,
//       data,
//       defaultColumn,
//     },
//     useAbsoluteLayout
//   );

//   // Render the UI for your table
//   return (
//     <div {...getTableProps()} className="sc-attribute-table">
//       <div>
//         {headerGroups.map((headerGroup) => (
//           <div {...headerGroup.getHeaderGroupProps()} className="sc-attribute-table-row header-group">
//             {headerGroup.headers.map((column) => (
//               <div {...column.getHeaderProps()} className="sc-attribute-table-cell header">
//                 {column.render("Header")}
//               </div>
//             ))}
//           </div>
//         ))}
//       </div>

//       <div className="sc-attribute-table-rows" {...getTableBodyProps()}>
//         {rows.map((row, i) => {
//           prepareRow(row);
//           return (
//             <div {...row.getRowProps()} className="sc-attribute-table-row body">
//               {row.cells.map((cell, index) => (
//                 <div {...cell.getCellProps()} key={index} className="sc-attribute-table-cell">
//                   {cell.render("Cell")}
//                 </div>
//               ))}
//             </div>
//           );
//         })}
//       </div>
//     </div>
//   );
// };

// IMPORT ALL IMAGES
const images = importAllImages(require.context("./images", false, /\.(png|jpe?g|svg)$/));
function importAllImages(r) {
  let images = {};
  r.keys().map((item, index) => (images[item.replace("./", "")] = r(item)));
  return images;
}

const Styles = styled.div`
  .table {
    border: 1px solid #ddd;

    .tr {
      :last-child {
        .td {
          border-bottom: 0;
        }
      }
    }

    .th,
    .td {
      padding: 5px;
      border-bottom: 1px solid #ddd;
      border-right: 1px solid #ddd;
      background-color: #fff;
      overflow: hidden;

      :last-child {
        border-right: 0;
      }

      .resizer {
        display: inline-block;
        width: 5px;
        height: 100%;
        position: absolute;
        right: 0;
        top: 0;
        transform: translateX(50%);
        z-index: 1;

        &.isResizing {
          background: red;
        }
      }
    }

    &.sticky {
      overflow: scroll;
      .header,
      .footer {
        position: sticky;
        z-index: 1;
        width: fit-content;
      }

      .header {
        top: 0;
        box-shadow: 0px 3px 3px #ccc;
      }

      .footer {
        bottom: 0;
        box-shadow: 0px -3px 3px #ccc;
      }

      .body {
        position: relative;
        z-index: 0;
      }

      [data-sticky-td] {
        position: sticky;
      }

      [data-sticky-last-left-td] {
        box-shadow: 2px 0px 3px #ccc;
      }

      [data-sticky-first-right-td] {
        box-shadow: -2px 0px 3px #ccc;
      }
    }
  }
`;
