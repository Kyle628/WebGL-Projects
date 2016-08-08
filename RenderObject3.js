var vertarr = [];
var pgons = [];
var polynorms = [];
var translation_mat = new Matrix4();
var triarr = [];

var VSHADER_SOURCE =
  'attribute vec4 a_Position;\n' +
  'uniform mat4 mymatrix;\n' +
  'void main() {\n' +
  '  gl_Position = mymatrix * a_Position ;\n' +
  '}\n';

// Fragment shader program
var FSHADER_SOURCE =
  'uniform vec3 mycolor;\n' +
  'void main() {\n' +
  '  vec3 light = (0, 0, 1);\n' +
  '  vec3 norm = (0, 0, 1);\n' +
  '  float intensity = dot(light, norm);\n' +
  '  gl_FragColor = vec4(mycolor * intensity, 1);\n' +
  '}\n';

function main() {
    // Retrieve <canvas> element
  var canvas = document.getElementById('webgl');

  // Get the rendering context for WebGL
  //var gl = getWebGLContext(canvas);
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
    for (var line = 1; line < lines.length; line++) {
      pgons[line] = lines[line].split(' ');
      pgons[line].shift();
      // each element in line
      for (var i = 0; i < pgons[line].length; i++) {
        pgons[line][i] = parseInt(pgons[line][i]);
        //console.log(pgons[line][i]);
      };
      for (var j = pgons[line].length; j >= 1; j--) {
        triarr.append(vertarr[pgons[line][j]]);
        triarr.append(vertarr[pgons[line][j + 1]]);
        triarr.append(vertarr[pgons[line][0]]);
      };
    };
    // do everything here inside of .poly onload
    getpolynorms()
    //console.log(polynorms);

    get_translate_mat();
    //console.log(translation_mat);


    console.log("this is vertex array", vertarr);
    console.log("this is polygon array", pgons);

    //visit each polygon, then visit each vertex in each polygon
    for (var polygon = 1; polygon < pgons.length - 1; polygon++) {
      for (var j = 0; j < pgons[polygon].length; j++) {
        // do all the webgl stuff for each vertex

        var vertexBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);

        console.log("vertarr[j] is", vertarr[pgons[polygon][j]]);

        //make sure arr is typed before passing to bufferData
        var typedarr = new Float32Array(vertarr[pgons[polygon][j]]);
        console.log("typedarr is", typedarr);
        gl.bufferData(gl.ARRAY_BUFFER, typedarr, gl.STATIC_DRAW);

        var a_Position = gl.getAttribLocation(gl.program, 'a_Position');
        gl.vertexAttribPointer(a_Position, 2, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(a_Position);

        var location = gl.getUniformLocation(gl.program, "mycolor");
        gl.uniform4fv(location, [0, 0, 1, 1]);
        gl.drawArrays(gl.TRIANGLES, 0, 1);
      };
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
  var xmin = 0;
  var ymin = 0;
  var zmin = 0;
  var xmax = 0;
  var ymax = 0;
  var zmax = 0;

  for (var vert = 1; vert < vertarr.length - 1; vert++) {
    //console.log("vert[0] is", vertarr[vert][0]);
    if (vertarr[vert][0] < xmin) xmin = vertarr[vert][0];
    if (vertarr[vert][0] > xmax) xmax = vertarr[vert][0];
    if (vertarr[vert][1] < ymin) ymin = vertarr[vert][1];
    if (vertarr[vert][1] > ymax) ymax = vertarr[vert][1];
    if (vertarr[vert][2] < zmin) zmin = vertarr[vert][2];
    if (vertarr[vert][2] > zmax) zmax = vertarr[vert][2];
  };

  var cent = [(xmax + xmin) / 2, (ymax + ymin) / 2, (zmax + zmin) / 2 ];
  translation_mat.translate(cent[0], cent[1], cent[2]);
};
