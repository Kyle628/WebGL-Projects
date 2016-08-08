/*
Kyle O'Connor
kyjoconn@ucsc.edu
4/23/2016

This program reads in two files, a .coor and a .poly file. The coordinates from .coor
are read into an array vertarr[]. The same is done for the .poly file into pgons[],
while also calculating the normal vector to each polygon and storing this info in a
new array polynorms[].

Then, for every polygon in Pgons, it is figured out what triangles will be drawn and
what vertices these triangles require. Then we grab the the appropriate vertices from
vertarr[] and append them to a new array triarr[]. From vertarr, we build up a 4x4
matrix of what transformations will need to be applied to each vertex. With all this
info set up properly, we make all the webgl calls, and display whatever object was
described in the files. The transformations are applied in the Vshader, and all of
the shading calculations happen in the Fshader.

Smooth shading was accomplished by building up an array of vertex normals, calculating
color per vertex within the vertex shader, and then passing these colors to the fragment
shader using a varying.

As of now, the program is not working perfectly, but works best with chair1 and couch
*/

//define globals
var vertarr = [];
var pgons = [];
var polynorms = [];
var transform_mat = new Matrix4();
var triarr = [];
var cent = [];
var vertnorms = [];
var trinorms = [];
var stridedtri = [];

var xmin = 0;
var ymin = 0;
var zmin = 0;
var xmax = 0;
var ymax = 0;
var zmax = 0;
var cent;

var flatshade = -1;

//shaders
var VSHADER_SOURCE =
  'attribute vec4 a_Position;\n' +
  'attribute vec4 a_normal;\n' +
  'uniform mat4 mymatrix;\n' +
  'varying vec4 varycolor;\n' +
  'void main() {\n' +
  '  vec4 light = vec4(1, 1, 1, 1);\n' +
  '  vec4 vertcolor = vec4(0, 0, 1, 1);\n' +
  '  gl_Position = mymatrix * a_Position ;\n' +
  '  float intensity = dot(normalize(light), normalize(a_normal));\n' +
  '  varycolor = vertcolor * intensity ;\n' +
  '}\n';

var FSHADER_SOURCE =
  'precision mediump float;\n' +
  'uniform vec4 mycolor;\n' +
  'uniform vec3 norm;\n' +
  'uniform int flat_shade;\n' +
  'varying vec4 varycolor;\n' +
  'void main() {\n' +
  '  vec3 light = vec3(0, 0, 1);\n' +
  '  float intensity = dot(light, normalize(norm));\n' +
  '  if (flat_shade == 0) {\n' +
  '    gl_FragColor = mycolor * intensity;\n' +
  '  }\n' +
  '  else {\n' +
  '    gl_FragColor = varycolor;\n'+
  '  }\n'+
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
  document.getElementById('toggleshade').addEventListener('click', readcoor, false);
};

function readcoor() {

  flatshade = !flatshade;
  //call this function when user uploads a file

  var file = document.getElementById('file').files[0];

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


function readpoly() {
  var file = document.getElementById('file').files[1];

  var reader = new FileReader();
  reader.onload = function(progressEvent) {

    // line by line
    var lines = this.result.split('\n');
    //make each line into an array of vertex indices
    var which_poly = 0;
    for (var line = 1; line < lines.length; line++) {
      pgons[line] = lines[line].split(' ');
      //get rid of label
      pgons[line].shift();
      // make each vertex index in each polygon an integer
      for (var i = 0; i < pgons[line].length; i++) {
        pgons[line][i] = parseInt(pgons[line][i]);
        //console.log(pgons[line][i]);
      };
      // break the polygon into triangles, and append them to triarr[]
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
      //keep track of which polygon this tri belongs to, so we know its normal
      which_poly++;
    };

    // do everything here inside of .poly onload
    vertnorms = new Array(vertarr.length);
    vertnorms.fill([0,0,0]);
    //build up polygon normals and vertnorms
    getpolynorms()

    get_trinorms();


    console.log("pgons", pgons);
    console.log("vertnorms", vertnorms);
    console.log("trinorms", trinorms);

    //get min and max values to set up for translation
    get_translate_mat();

    var diffx = xmax - xmin;
    var diffy = ymax - ymin;
    var diffz = zmax - zmin;

    var maxdiff = Math.max(diffx, diffy, diffz);
    var maxdiffavg = maxdiff / 2;

    //set up camera to orthographic view
    transform_mat.setOrtho(-maxdiffavg, maxdiffavg, -maxdiffavg, maxdiffavg, -maxdiffavg, maxdiffavg);
    //translate to world origin
    transform_mat.translate(-cent[0], -cent[1], -cent[2]);

    // pass info for each triangle into the shaders and draw the triangles
    for (var i = 0; i < triarr.length; i += 10 /*10 bcs polygon identifier*/) {

      //9 vertices to draw three points to make one triangle
      var vertices = new Float32Array([
        triarr[i], triarr[i+1], triarr[i+2], triarr[i+3], triarr[i+4], triarr[i+5],
        triarr[i+6], triarr[i+7], triarr[i+8]
      ]);

      var norms = new Float32Array([
        trinorms[i], trinorms[i+1], trinorms[i+2], trinorms[i+3], trinorms[i+4], trinorms[i+5],
        trinorms[i+6], trinorms[i+7], trinorms[i+8]
      ]);

      var stridedarr = new Float32Array([
        vertices[0], vertices[1], vertices[2],
        norms[0], norms[1], norms[2],
        vertices[3], vertices[4], vertices[5],
        norms[3], norms[4], norms[5],
        vertices[6], vertices[7], vertices[8],
        norms[6], norms[7], norms[8]
      ]);


      //console.log("vertices", vertices);
      //console.log("norms", norms);
      //console.log("stridedarr", stridedarr);

      var vertexBuffer = gl.createBuffer();

      // Bind the buffer object to target
      gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
      // Write date into the buffer object
      gl.bufferData(gl.ARRAY_BUFFER, stridedarr, gl.STATIC_DRAW);

      //pass uniforms and attributes to shaders
      var colorloc = gl.getUniformLocation(gl.program, "mycolor");
      gl.uniform4fv(colorloc, [0, 0, 1, 1]);

      var lightloc = gl.getUniformLocation(gl.program, "light");
      gl.uniform3fv(lightloc, [0, 0, 1]);

      var normloc = gl.getUniformLocation(gl.program, "norm");
      //console.log("accessing polynorms at index", i, triarr[i+9]);
      gl.uniform3fv(normloc, [polynorms[triarr[i+9]][0], polynorms[triarr[i+9]][1], polynorms[triarr[i+9]][2]]);

      var matloc = gl.getUniformLocation(gl.program, "mymatrix");
      gl.uniformMatrix4fv(matloc, gl.FALSE /*transpose?*/, transform_mat.elements);

      var boolloc = gl.getUniformLocation(gl.program, "flat_shade");
      gl.uniform1i(boolloc, flatshade);

      var a_Position = gl.getAttribLocation(gl.program, 'a_Position');

      // Assign the buffer object to a_Position variable
      gl.vertexAttribPointer(a_Position, 3, gl.FLOAT, false, 24, 0);

      // Enable the assignment to a_Position variable
      gl.enableVertexAttribArray(a_Position);

      var a_normal = gl.getAttribLocation(gl.program, 'a_normal');

      // Assign the buffer object to a_Position variable
      gl.vertexAttribPointer(a_normal, 3, gl.FLOAT, false, 24, 8);

      // Enable the assignment to a_Position variable
      gl.enableVertexAttribArray(a_normal);

      //draw the triangles!
      gl.drawArrays(gl.TRIANGLES, 0, 3);
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
  for (var i = 0; i < pgon.length; i++) {
    vertnorms[pgon[i]] = vecadd(vertnorms[pgon[i]], v3);
  };
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

function vecadd(v1, v2) {
  //console.log('v1 is', v1);
  //console.log('v2 is', v2);
  var v3 = [];
  v3[0] = v1[0] + v2[0];
  v3[1] = v1[1] + v2[1];
  v3[2] = v1[2] + v2[2];
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
};

function get_trinorms() {
  var which_poly = 1;
  for (var pgon = 1; pgon < pgons.length - 1; pgon++) {
    for (var vert = pgons[pgon].length - 2; vert >= 1; vert--) {
      trinorms.push(vertnorms[pgons[pgon][vert]][0]);
      trinorms.push(vertnorms[pgons[pgon][vert]][1]);
      trinorms.push(vertnorms[pgons[pgon][vert]][2]);

      //console.log("vertex", vert);
      trinorms.push(vertnorms[pgons[pgon][vert + 1]][0]);
      trinorms.push(vertnorms[pgons[pgon][vert + 1]][1]);
      trinorms.push(vertnorms[pgons[pgon][vert + 1]][2]);

      trinorms.push(vertnorms[pgons[pgon][0]][0]);
      trinorms.push(vertnorms[pgons[pgon][0]][1]);
      trinorms.push(vertnorms[pgons[pgon][0]][2]);

      trinorms.push(which_poly);
    };
    which_poly++;
  };
};

function get_strided_array() {


};

