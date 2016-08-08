var vertarr = [];
var pgons = [];
var polynorms = [];
var transform_mat = new Matrix4();
var triarr = [];
var cent = [];

var xmin = 0;
var ymin = 0;
var zmin = 0;
var xmax = 0;
var ymax = 0;
var zmax = 0;
var cent;

var VSHADER_SOURCE =
  'attribute vec4 a_Position;\n' +
  'uniform mat4 mymatrix;\n' +
  'void main() {\n' +
  '  gl_Position = mymatrix * a_Position ;\n' +
  '}\n';

// Fragment shader program
var FSHADER_SOURCE =
  'precision mediump float;\n' +
  'uniform vec4 mycolor;\n' +
  'uniform vec3 norm;\n' +
  'void main() {\n' +
  '  vec3 light = vec3(0, 0, 1);\n' +
  '  float intensity = dot(light, normalize(norm));\n' +
  '  gl_FragColor = mycolor * intensity;\n' +
  '}\n';

function main() {
    // Retrieve <canvas> element
  var canvas = document.getElementById('webgl');

  // Get the rendering context for WebGL
  //gl = getWebGLContext(canvas);
  gl = WebGLUtils.setupWebGL(canvas, {preserveDrawingBuffer: true});
  if (!gl) {
    console.log('Failed to get the rendering context for WebGL');
    return;
  }

  // Initialize shaders
  if (!initShaders(gl, VSHADER_SOURCE, FSHADER_SOURCE)) {
    console.log('Failed to intialize shaders.');
    return;
  }
      // Specify the color for clearing <canvas>
  gl.clearColor(.75, .75, .75, 1);

  // Clear <canvas>
  gl.clear(gl.COLOR_BUFFER_BIT);

  // call readcoor when user uploads files
  document.getElementById('file').addEventListener('change', readcoor, false);
};

function readcoor(event) {
  //call this function when user uploads a file

  var file = event.target.files[0];

  var reader = new FileReader();
  reader.onload = function(progressEvent){

    // line by line
    var lines = this.result.split('\n');
    //var end = parseInt(lines[0]);
    for(var line = 1; line < lines.length; line++){
      vertarr[line] = lines[line].split(',').map(parseFloat);
      vertarr[line].shift();
    };
    // call readpoly from inside .coor onload
    readpoly(event);
  };

  reader.readAsText(file);
};


function readpoly(event) {
  var file = event.target.files[1];

  var reader = new FileReader();
  reader.onload = function(progressEvent) {

    // line by line
    var lines = this.result.split('\n');
    //each line in pgons
    var which_poly = 0;
    for (var line = 1; line < lines.length; line++) {
      pgons[line] = lines[line].split(' ');
      pgons[line].shift();
      // each element in line
      for (var i = 0; i < pgons[line].length; i++) {
        pgons[line][i] = parseInt(pgons[line][i]);
        //console.log(pgons[line][i]);
      };
      //console.log("this line", pgons[line]);
      //console.log("length", pgons[line].length);
      for (var j = pgons[line].length - 2; j >= 1; j--) {
        triarr.push(vertarr[pgons[line][j]][0]);
        triarr.push(vertarr[pgons[line][j]][1]);
        triarr.push(vertarr[pgons[line][j]][2]);

        triarr.push(vertarr[pgons[line][j + 1]][0]);
        triarr.push(vertarr[pgons[line][j + 1]][1]);
        triarr.push(vertarr[pgons[line][j + 1]][2]);

        triarr.push(vertarr[pgons[line][0]][0]);
        triarr.push(vertarr[pgons[line][0]][1]);
        triarr.push(vertarr[pgons[line][0]][2]);

        triarr.push(which_poly);
      };
      which_poly++;
    };
    console.log("triarr", triarr);
    // do everything here inside of .poly onload
    getpolynorms()
    console.log("polynorms", polynorms);

    get_translate_mat();
    console.log("maxes", xmax, ymax, zmax);
    console.log("mins", xmin, ymin, zmin);

    var diffx = xmax - xmin;
    var diffy = ymax - ymin;
    var diffz = zmax - zmin;

    var maxdiff = Math.max(diffx, diffy, diffz);
    var maxdiffavg = maxdiff / 2;
    console.log("maxdiff", maxdiff);

    transform_mat.setOrtho(-maxdiffavg, maxdiffavg, -maxdiffavg, maxdiffavg, -maxdiffavg, maxdiffavg);
    //transform_mat.setOrtho(-200, 200, -200, 200, -200, 200);
    transform_mat.translate(-cent[0], -cent[1], -cent[2]);
    //console.log(translation_mat);



    console.log("this is vertex array", vertarr);
    console.log("this is polygon array", pgons);

    console.log("triarr length", triarr.length);
    for (var i = 0; i < triarr.length; i += 10) {
      var vertices = new Float32Array([
        triarr[i], triarr[i+1], triarr[i+2], triarr[i+3], triarr[i+4], triarr[i+5],
        triarr[i+6], triarr[i+7], triarr[i+8]
      ]);



      var vertexBuffer = gl.createBuffer();

      // Bind the buffer object to target
      gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
      // Write date into the buffer object
      gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);



      var colorloc = gl.getUniformLocation(gl.program, "mycolor");
      gl.uniform4fv(colorloc, [0, 0, 1, 1]);

      var lightloc = gl.getUniformLocation(gl.program, "light");
      gl.uniform3fv(lightloc, [0, 0, 1]);

      var normloc = gl.getUniformLocation(gl.program, "norm");
      //console.log("accessing polynorms at index", i, triarr[i+9]);
      gl.uniform3fv(normloc, [polynorms[triarr[i+9]][0], polynorms[triarr[i+9]][1], polynorms[triarr[i+9]][2]]);

      var matloc = gl.getUniformLocation(gl.program, "mymatrix");
      gl.uniformMatrix4fv(matloc, gl.FALSE /*transpose?*/, transform_mat.elements);

      var a_Position = gl.getAttribLocation(gl.program, 'a_Position');

      // Assign the buffer object to a_Position variable
      gl.vertexAttribPointer(a_Position, 3, gl.FLOAT, false, 0, 0);

      // Enable the assignment to a_Position variable
      gl.enableVertexAttribArray(a_Position);

      //console.log("about to draw tri:", vertices);
      gl.drawArrays(gl.TRIANGLE_FAN, 0, 3);
    };

  };
  reader.readAsText(file);
};

function getpolynorms() {
  //var polynorms = [];
  // each polygon in pgons
  for (var pgon = 1; pgon < pgons.length - 1; pgon++) {
    // get normal to pgon
    // append to polynorms
    var norm = calcnorm(pgons[pgon]);
    polynorms.push(norm);
  };
};

function calcnorm(pgon) {
  //console.log("pgon[0] is", pgon[0]);
  //console.log("pgon[1] is", pgon[1]);
  var v1 = vecdiff(vertarr[pgon[1]], vertarr[pgon[0]]);
  var v2 = vecdiff(vertarr[pgon.length - 1], vertarr[pgon[0]]);
  var v3 = [];
  v3[0] = (v1[1] * v2[2]) - (v1[2] * v2[1])
  v3[1] = (v1[2] * v2[0]) - (v1[0] * v2[2])
  v3[2] = (v1[0] * v2[1]) - (v1[1] * v2[0])
  return v3;
};

function vecdiff(v1, v2) {
  //console.log('v1 is', v1);
  //console.log('v2 is', v2);
  var v3 = [];
  v3[0] = v1[0] - v2[0];
  v3[1] = v1[1] - v2[1];
  v3[2] = v1[2] - v2[2];
  return v3;
}

function get_translate_mat() {

  for (var vert = 1; vert < vertarr.length - 1; vert++) {
    //console.log("vert[0] is", vertarr[vert][0]);
    if (vertarr[vert][0] < xmin) xmin = vertarr[vert][0];
    if (vertarr[vert][0] > xmax) xmax = vertarr[vert][0];
    if (vertarr[vert][1] < ymin) ymin = vertarr[vert][1];
    if (vertarr[vert][1] > ymax) ymax = vertarr[vert][1];
    if (vertarr[vert][2] < zmin) zmin = vertarr[vert][2];
    if (vertarr[vert][2] > zmax) zmax = vertarr[vert][2];
  };

  cent = [(xmax + xmin) / 2, (ymax + ymin) / 2, (zmax + zmin) / 2 ];
  //transform_mat.translate(-cent[0], -cent[1], -cent[2]);
};

