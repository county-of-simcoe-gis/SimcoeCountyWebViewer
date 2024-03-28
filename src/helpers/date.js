export function getFriendlyDateString(dt) {
  // var time = new Date();
  // var timeString = time.toLocaleString("en-US", { hour: "numeric", hour12: true });

  //var dtstring = dt.getFullYear() + "-" + this.pad2(dt.getMonth() + 1) + "-" + this.pad2(dt.getDate()) + " " + this.pad2(dt.getHours()) + ":" + this.pad2(dt.getMinutes()) + ":" + this.pad2(dt.getSeconds());
  var dtstring = dt.getFullYear() + "-" + pad2(dt.getMonth() + 1) + "-" + pad2(dt.getDate()) + " " + formatAMPM(dt);
  return dtstring;
}

export function getSqlDateString(dt) {
  var dtstring = dt.getFullYear() + "-" + pad2(dt.getMonth() + 1) + "-" + pad2(dt.getDate()) + " " + pad2(dt.getHours()) + ":" + pad2(dt.getMinutes()) + ":" + pad2(dt.getSeconds());
  return dtstring;
}

export function getEsriInsertDate() {
  const date = new Date();
  // adjust 0 before single digit date
  let day = ("0" + date.getDate()).slice(-2);
  // current month
  let month = ("0" + (date.getMonth() + 1)).slice(-2);
  // current year
  let year = date.getFullYear();
  // current hours
  let hours = ("0" + (date.getHours() + 1)).slice(-2);
  // current minutes
  let minutes = ("0" + (date.getMinutes() + 1)).slice(-2);
  // current seconds
  let seconds = ("0" + (date.getSeconds() + 1)).slice(-2);

  const dateString = `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
  return dateString;
}
function pad2(number) {
  var str = "" + number;
  while (str.length < 2) {
    str = "0" + str;
  }

  return str;
}

function formatAMPM(date) {
  var hours = date.getHours();
  var minutes = date.getMinutes();
  var ampm = hours >= 12 ? "pm" : "am";
  hours = hours % 12;
  hours = hours ? hours : 12; // the hour '0' should be '12'
  minutes = minutes < 10 ? "0" + minutes : minutes;
  var strTime = hours + ":" + minutes + " " + ampm;
  return strTime.toUpperCase();
}
