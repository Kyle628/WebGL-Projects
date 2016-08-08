// Name: Kyle O'Connor
// Login: kyjoconn@ucsc.edu
// Assignment: lab1
// Instructor: Professor Alex Pang
// Date: 3/7/2016

//make some shape that we can call 10 times
function makecircle(x, y) {
    // connect with the canvas we made in html file
    var c = document.getElementById("mycanvas");
    var ctx = c.getContext("2d");
    if (ctx == null) console.log("ctx is null");
    // draw the circle
    ctx.beginPath();
    ctx.arc(x,y,10,0,2*Math.PI);
    ctx.stroke();
}

// draw 10 circles in random spots
for (i = 0; i < 10; i++) {
    x = Math.random() * 200;
    y = Math.random() * 100;
    makecircle(x, y);
}





