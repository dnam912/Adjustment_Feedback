//= laz r
//= 04-04-2026 11:08
//= setToday.js

function setToday() {
    let today = new Date();
    console.log(today);
    let nowString = today.toISOString();
    console.log(nowString.slice(0, nowString.lastIndexOf('.')))
}

setToday();