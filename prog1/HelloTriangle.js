// HelloTriangle.js (c) 2012 matsuda
// Vertex shader program
var VSHADER_SOURCE =
  'attribute vec4 a_Position;\n' +
  'void main() {\n' +
  '  gl_Position = a_Position;\n' +
  '}\n';

// Fragment shader program
var FSHADER_SOURCE =
  'precision mediump float;\n' +
  'uniform vec4 mycolor;\n' +
  'void main() {\n' +
  '  gl_FragColor = mycolor;\n' +
  '}\n';

function main() {

  // Retrieve <canvas> element
  var canvas = document.getElementById('webgl');

  // Get the rendering context for WebGL
  //var gl = getWebGLContext(canvas);
  var gl = WebGLUtils.setupWebGL(canvas, {preserveDrawingBuffer: true});
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
  gl.clearColor(.168, .168, .168, 1);

  // Clear <canvas>
  gl.clear(gl.COLOR_BUFFER_BIT);

  // Write the positions of vertices to a vertex shader
  var first_tri = new Float32Array([
    0, 0.5,   -0.5, -0.5,   0.5, -0.5
  ]);
  var n = initVertexBuffers(gl, first_tri);
  if (n < 0) {
    console.log('Failed to set the positions of the vertices');
    return;
  }

  // Draw the triangle
  var loc = gl.getUniformLocation(gl.program, "mycolor");
  gl.uniform4fv(loc, [0, 0, 1, 1]);
  gl.drawArrays(gl.TRIANGLES, 0, n);


  //call this function when user uploads a file
  document.getElementById('file').onchange = function(){

  var file = this.files[0];

  var reader = new FileReader();
  reader.onload = function(progressEvent){

    // line by line
    var lines = this.result.split('\n');
    for(var line = 1; line < lines.length; line++){
      lines[line] = lines[line].split(',').map(parseFloat);
      var m = initVertexBuffers(gl, lines[line]);
      var location = gl.getUniformLocation(gl.program, "mycolor");
      gl.uniform4fv(location, [lines[line][6], lines[line][7], lines[line][8], 1]);
      gl.drawArrays(gl.TRIANGLES, 0, m);
    };
  };
  reader.readAsText(file);
};

};

function initVertexBuffers(gl, vert_arr) {
  /*var vertices = new Float32Array([
    0, 0.5,   -0.5, -0.5,   0.5, -0.5
  ]);*/
  var vertices = new Float32Array([
    vert_arr[0], vert_arr[1], vert_arr[2], vert_arr[3], vert_arr[4], vert_arr[5]
  ]);
  var n = 3; // The number of vertices

  // Create a buffer object
  var vertexBuffer = gl.createBuffer();
  if (!vertexBuffer) {
    console.log('Failed to create the buffer object');
    return -1;
  }

  // Bind the buffer object to target
  gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
  // Write date into the buffer object
  gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

  var a_Position = gl.getAttribLocation(gl.program, 'a_Position');
  if (a_Position < 0) {
    console.log('Failed to get the storage location of a_Position');
    return -1;
  }
  // Assign the buffer object to a_Position variable
  gl.vertexAttribPointer(a_Position, 2, gl.FLOAT, false, 0, 0);

  // Enable the assignment to a_Position variable
  gl.enableVertexAttribArray(a_Position);

  return n;
}



