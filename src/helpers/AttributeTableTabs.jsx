import React, { Component, useState, useEffect, useCallback, useRef } from "react";
import styled from "styled-components";
import * as helpers from "./helpers";
import "./AttributeTableTabs.css";
import { Tab, Tabs, TabList, TabPanel } from "react-tabs";
import { useTable, useBlockLayout, useResizeColumns } from "react-table";
import { useSticky } from "react-table-sticky";
import { FixedSizeList } from "react-window";

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
									<AttributeTableTabButton key={helpers.getUID()} name={item.name} onTabClose={this.props.onTabClose} />
								</Tab>
							);
						})}
					</TabList>
					{this.props.items.map((item) => {
						return (
							<TabPanel id={item.name + "_content"} key={helpers.getUID()}>
								<AttributeTableContent
									item={item}
									data={item.geoJson}
									key={helpers.getUID()}
									height={this.props.height}
									width={this.props.width}
									onHeaderClick={this.props.onHeaderClick}
									onRowClick={this.props.onRowClick}
									onLoadMoreClick={this.props.onLoadMoreClick}
									onLoadAllClick={this.props.onLoadAllClick}
									name={item.name}
									isLoading={this.props.isLoading}
								/>
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
			<div className="sc-attribute-table-close-button-container" onClick={() => props.onTabClose(props.name)}>
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
	const tmpData = {};
	// CREATE COLUMNS
	let columnArray = [];
	columnArray.push({
		Header: "*",
		accessor: "*",
		width: 20,
		style: { backgroundColor: "#ddd" },
	});
	Object.keys(props.data[0].getProperties()).forEach((key) => {
		if (key === "geometry") return;
		columnArray.push({ Header: key, accessor: key, visible: false });
	});
	//const columns = React.useMemo(() => columnArray, []);
	tmpData["columns"] = columnArray;
	let rowArray = [];
	props.item.geoJson.forEach((feature) => {
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
	tmpData["rows"] = rowArray;

	return (
		<div className="sc-attribute-table">
			<CustomTable
				columns={tmpData.columns}
				data={tmpData.rows}
				width={props.width}
				height={props.height}
				onHeaderClick={props.onHeaderClick}
				onRowClick={props.onRowClick}
				item={props.item}
				onLoadMoreClick={props.onLoadMoreClick}
				onLoadAllClick={props.onLoadAllClick}
				isLoading={props.isLoading}
			/>
			;
		</div>
	);
};

const CustomTable = ({ columns, data, width, height, onHeaderClick, item, onLoadMoreClick, onLoadAllClick, isLoading, onRowClick }) => {
	const id = "sc-attribute-table-tab-" + item.name;
	// const [loaded, setLoaded] = useState(0);

	// useEffect(() => {
	//   console.log("use Effect");
	//   setLoaded(true);
	//   if (parseInt(data.length) === parseInt(item.maxRecords) || parseInt(data.length) === parseInt(item.total)) {
	//     document.getElementById(id).scrollTop = item.scrollTop;
	//   }
	// }, []);

	const { getTableProps, getTableBodyProps, headerGroups, rows, prepareRow } = useTable(
		{
			columns,
			data,
		},
		useBlockLayout,
		useSticky,
		useResizeColumns
	);

	return (
		<Styles>
			<div
				{...getTableProps()}
				className="table sticky sc-attribute-table-header-content"
				id={id}
				style={{
					width: width - 4,
					height: height - 32,
					backgroundColor: "aliceblue",
				}}
				onScroll={(evt) => {
					// if (loaded) {
					const el = evt.target;
					const triggerHeight = el.scrollHeight - el.offsetHeight;
					item.scrollTop = el.scrollTop;
					if (el.scrollTop > triggerHeight && item.maxRecords <= item.total) {
						onLoadMoreClick(item);
					}
					// }
				}}
			>
				<div className="header">
					{headerGroups.map((headerGroup) => {
						item.headerWidth = headerGroup.getHeaderGroupProps().style.width;
						return (
							<div {...headerGroup.getHeaderGroupProps()} className="tr">
								{headerGroup.headers.map((column) => (
									<div
										{...column.getHeaderProps()}
										className="th sc-attribute-table-header"
										onClick={(evt) => {
											onHeaderClick(evt, item.name, column);
										}}
									>
										{column.render("Header")}
										{/* Use column.getResizerProps to hook up the events correctly */}
										<div {...column.getResizerProps()} className={`resizer ${column.isResizing ? "isResizing" : ""}`} />
									</div>
								))}
							</div>
						);
					})}
				</div>
				<div {...getTableBodyProps()} className="body sc-attribute-table-row-content">
					{rows.map((row) => {
						prepareRow(row);
						return (
							<div {...row.getRowProps()} className="tr">
								{row.cells.map((cell) => {
									// console.log(cell.column.Header);
									return (
										<div
											{...cell.getCellProps()}
											className={cell.column.Header === "*" ? "sc-attribute-table-cell-button td" : "td"}
											onClick={(evt) => {
												onRowClick(evt, item, row.index);
											}}
										>
											{cell.render("Cell")}
										</div>
									);
								})}
							</div>
						);
					})}
				</div>
				<div
					className="footer"
					style={{
						width: item.headerWidth.replace("px", "") - 20,
						fontSize: "9pt",
					}}
				>
					{"Showing records: " + item.geoJson.length + " of " + item.total}{" "}
					<button
						className="sc-button sc-attribute-table-footer-button"
						onClick={() => {
							onLoadMoreClick(item);
						}}
					>
						Load More
					</button>
					<button
						className="sc-button sc-attribute-table-footer-button"
						onClick={() => {
							onLoadAllClick(item);
						}}
					>
						Load All
					</button>
					<div className={isLoading ? "sc-attribute-table-loading" : "sc-hidden"}>
						<span>Loading...</span>
						<img src={images["loading20.gif"]} alt="loading" style={{ position: "relative", top: "3px", marginLeft: "3px" }} />
					</div>
				</div>
			</div>
		</Styles>
	);
};
//style={{ width: document.getElementById(id) === null ? 400 : (parseInt(document.getElementById(id).offsetWidth) - 20) } }
//className="sc-attribute-table-footer"
// IMPORT ALL IMAGES
const images = importAllImages(require.context("./images", false, /\.(png|jpe?g|svg|gif)$/));
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
