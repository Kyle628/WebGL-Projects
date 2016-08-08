var c = document.getElementById("mycanvas");
var ctx = c.getContext("2d");
ctx.moveTo(0, 0);
ctx.lineTo(5, 0);
ctx.lineTo(5, 5);
ctx.lineTo(0, 5);
ctx.lineTo(0, 0);
ctx.stroke();
