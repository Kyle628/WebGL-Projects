/*
Kyle O'Connor
kyjoconn@ucsc.edu
4/23/2016

                                      Program Description:
This program is an extension of the previous programs, for which there is a description of
how files are being read in, and how shading was accomplished. This program adds on additional
functionality:

toggle between an orthographic or perspective view.

toggle between flat or smooth shading.

left click object change its color

left click background to change its color

hold right click on object and move mouse right or left to rotate positively or negatively
around the y axis

hold middle click on the object and scroll up or down to scale the object

                                Notes to grader:
Rotation works best with frame, because the other objects are slow to render. Otherwise,
Enterprise works probably the best, but is slow to rotate.
*/

//define globals

//all my arrays
var vertarr = [];
var pgons = [];
var polynorms = [];
var triarr = [];
var cent = [];
var vertnorms = [];
var trinorms = [];
var stridedtri = [];
var vertices = [];
var indicesarr = [];

//my matrices
var transform_mat = new Matrix4();
var view_mat = new Matrix4();
var normal_rotation_mat = new Matrix4();

// calculating centroid
var xmin = 0;
var ymin = 0;
var zmin = 0;
var xmax = 0;
var ymax = 0;
var zmax = 0;
var cent;

// calculate mouse movement
var init_x;

// switches to true on mousedown
var isRightDown = false;
var isMidDown = false;

// maintain a running sum of what our rotation/scale amounts will be
var rotation_angle = 0;
var scale_factor = 1;

// not using
var same_object = false;
var isFirst = true;

// booleans for our shading/color/camera options
var isBlue = 1;
var flatshade = 0;
var isOrtho = 0;

// starting colors
var obj_col = [0, 0, 1, 1];
var grey = Math.round(.75*255);

//shaders
var VSHADER_SOURCE =
  'attribute vec4 a_Position;\n' +
  'attribute vec4 a_normal;\n' +
  'uniform mat4 mymatrix;\n' +
  'uniform mat4 view_matrix;\n' +
  'uniform mat4 proj_matrix;\n' +
  'uniform mat4 norm_matrix;\n' +
  'uniform int is_ortho;\n' +
  'uniform int is_blue;\n' +
  'varying vec4 varycolor;\n' +
  'vec4 vertcolor;\n' +
  'void main() {\n' +
  '  vec4 copy_normal = a_normal;\n' +
  '  copy_normal = copy_normal * norm_matrix;\n' +
  '  vec4 light = vec4(0, 0, 1, 1);\n' +
  '  if (is_blue == 1) {\n' +
  '    vertcolor = vec4(0, 0, 1, 1);\n' +
  '  }\n' +
  '  else {\n' +
  '    vertcolor = vec4(0, 1, 0, 1);\n' +
  '  }\n'+
  '  if (is_ortho == 0) {\n' +
  '    gl_Position = mymatrix * a_Position ;\n' +
  '  }\n' +
  '  else {\n' +
  '    gl_Position = view_matrix * mymatrix * a_Position;\n'+
  '  }\n'+
  '  float intensity = dot(normalize(light), normalize(copy_normal));\n' +
  '  if (intensity < 0.0) {\n' +
  '    intensity = 0.0;\n' +
  '  }\n' +
  '  varycolor = vertcolor * intensity ;\n' +
  '  varycolor[3] = 1.0 ;\n' +
  '}\n';

var FSHADER_SOURCE =
  'precision mediump float;\n' +
  'uniform vec4 mycolor;\n' +
  'uniform vec3 norm;\n' +
  'uniform int flat_shade;\n' +
  'varying vec4 varycolor;\n' +
  'void main() {\n' +
  '  vec3 light = vec3(0, 0, 1);\n' +
  '  float intensity = dot(normalize(light), normalize(norm));\n' +
  '  if (intensity < 0.0) {\n' +
  '    intensity = 0.0;\n' +
  '  }\n' +
  '  if (flat_shade == 0) {\n' +
  '    gl_FragColor = mycolor * intensity;\n' +
  '  }\n' +
  '  else {\n' +
  '    gl_FragColor = varycolor;\n'+
  '  }\n'+
  '}\n';

var canvas, ctx;

function main() {

  // Retrieve <canvas> element

  canvas = document.getElementById('webgl');

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

  //possibly experiment with these later
  //gl.enable(gl.DEPTH_TEST);
  //gl.enable(gl.CULL_FACE);

  // Specify the color for clearing <canvas>
  gl.clearColor(.75, .75, .75, 1);

  // Clear <canvas>
  gl.clear(gl.COLOR_BUFFER_BIT);



  // call readcoor when user uploads files
  document.getElementById('file').addEventListener('change', function() {
    gl.clear(gl.COLOR_BUFFER_BIT);
    readcoor();
  }, false);

  // switch shading style
  document.getElementById('toggleshade').addEventListener('click', function() {
    switch_shade();
    readcoor();
  }, false);

  // switch ortho/perspective
  document.getElementById('togglecam').addEventListener('click', function() {
    switch_cam();
    readcoor();
  }, false);

  // listen for left click to change color of object or background
  document.getElementById('webgl').addEventListener('click', function() {
    if (event.button == 0) {
      switch_obj(event);
      if (document.getElementById('file').files[0] != null) {
        readcoor();
      };
    };
  }, false);

  // listen for mousedown
  document.getElementById('webgl').addEventListener('mousedown', function() {
    //right button is down
    if (event.button == 2) {
      // check pixel color (we only care if it is the object)
      var buf = new Uint8Array(gl.canvas.width * gl.canvas.height * 4);
      var x = event.layerX;
      var y = event.layerY;
      gl.readPixels(x, canvas.height - y, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, buf);
      if (buf[0] == grey && buf[1] == grey && buf[2] == grey && buf[3] == 255) {
        ;
      } else if (buf[0] == 255 && buf[1] == 0 && buf[2] == 0 && buf[3] == 255) {
        ;
      } else { // we know it is the object not the background
      init_x = event.clientX; // keep track of where mousedown started
      isRightDown = true; // start tracking mousemovement
      };
    };
  }, false);

  // stop rotating on mouseup
  document.getElementById('webgl').addEventListener('mouseup', function() {
    if (event.button == 2) {
      isRightDown = false;
    };
  }, false);

  document.getElementById('webgl').addEventListener('mousemove', function() {
    // only care about mouse movement on right mousedown
    if (isRightDown) {
      rotation_angle += (event.clientX - init_x); // rotate based on mouse movement
      readcoor();
    };
    init_x = event.clientX;
  }, false);

  document.getElementById('webgl').addEventListener('mousedown', function() {
    // check if middle mousedown is on the object
    if (event.button == 1) {
      var buf = new Uint8Array(gl.canvas.width * gl.canvas.height * 4);
      var x = event.layerX;
      var y = event.layerY;
      gl.readPixels(x, canvas.height - y, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, buf);
      if (buf[0] == grey && buf[1] == grey && buf[2] == grey && buf[3] == 255) {
        ;
      } else if (buf[0] == 255 && buf[1] == 0 && buf[2] == 0 && buf[3] == 255) {
        ;
      } else {
      isMidDown = true; // start tracking mousewheel
      }
    };
  }, false);

  document.getElementById('webgl').addEventListener('mousewheel', function() {
    // only care about mousewheel if middle mousedown
    if (isMidDown) {
      scale_factor += event.wheelDelta / 1200; // scale based on how much they wheel
      readcoor();
    };
  }, false);

  document.getElementById('webgl').addEventListener('mouseup', function() {
    if (event.button == 1) {
      isMidDown = false; // stop scaling
    };
  }, false);

}; // end of main




// this function changes color of background or object
function switch_obj(event) {
  // get pixel location
  var buf = new Uint8Array(gl.canvas.width * gl.canvas.height * 4);
  var x = event.layerX;
  var y = event.layerY;
  // get pixel color
  gl.readPixels(x, canvas.height - y, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, buf);
  var grey = Math.round(.75*255);
  //check if we've clicked the background
  if (buf[0] == grey && buf[1] == grey && buf[2] == grey && buf[3] == 255 ) {
    gl.clearColor(1, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);
  }
  else if (buf[0] == 255 && buf[1] == 0 && buf[2] == 0 && buf[3] == 255 ) {
    gl.clearColor(.75, .75, .75, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);
  }
  else { // must've clicked the object
    if (isBlue) {
      obj_col = [0, 1, 0, 1];
      isBlue = !isBlue;
    } else {
      obj_col = [0, 0, 1, 1];
      isBlue = !isBlue;
    }
  }
};

function switch_shade() {
  flatshade = !flatshade;
};

function switch_cam() {
  isOrtho = !isOrtho;
};

function switch_obj_col() {
  isBlue = !isBlue;
}

function readcoor() {
  //call this function when user uploads a file

  //get our files straight
  var file;
  var file1 = document.getElementById('file').files[0];
  var file2 = document.getElementById('file').files[1];

  var fileExt1 = file1.name.split('.').pop();
  var fileExt2 = file2.name.split('.').pop();

  if (fileExt1.charAt(0) == 'c') {
    var file = file1;
  } else {
    var file = file2;
  }

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


function readpoly() {

  //get files straight
  var file;
  var file1 = document.getElementById('file').files[0];
  var file2 = document.getElementById('file').files[1];

  var fileExt1 = file1.name.split('.').pop();
  var fileExt2 = file2.name.split('.').pop();

  if (fileExt1.charAt(0) == 'p') {
    var file = file1;
  } else {
    var file = file2;
  }

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
        //console.log(pgons[line]);
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

    //console.log(vertarr);
    //console.log(pgons);


    for (var pgon = 1; pgon < pgons.length - 1; pgon++) {
      for (var vertex = 0; vertex < pgons[pgon].length; vertex++) {
        //console.log(vertarr[vertex][component]);
        indicesarr.push(pgons[pgon][vertex]);
      };
    };
    console.log(indicesarr);

    //intialize vertnorms to be [0,0,0] to get the ready for vecadd()
    vertnorms = new Array(vertarr.length);
    vertnorms.fill([0,0,0]);

    // set our scaling limits
    scale_factor = Math.max(scale_factor, .1);
    scale_factor = Math.min(scale_factor, 2.0);

    //build up polygon normals and vertnorms
    getpolynorms();

    console.log(polynorms);

    get_trinorms();

    vertices.push(0.0);
    vertices.push(0.0);
    vertices.push(0.0);
    for (var vertex = 1; vertex < vertarr.length - 1; vertex ++) {
      //console.log(vertarr[vertex][component]);
      vertices.push(vertarr[vertex][0]);
      vertices.push(vertarr[vertex][1]);
      vertices.push(vertarr[vertex][2]);
    };
    console.log("vertices", vertices);

    //get min and max values to set up for translation
    get_centroid();

    var diffx = xmax - xmin;
    var diffy = ymax - ymin;
    var diffz = zmax - zmin;

    var maxdiff = Math.max(diffx, diffy, diffz);
    var maxdiffavg = maxdiff / 5;

    //set up camera to orthographic view
    if (isOrtho == 0) {
      //transform_mat.setOrtho(-maxdiffavg, maxdiffavg, -maxdiffavg, maxdiffavg, -maxdiffavg, maxdiffavg);
      transform_mat.setOrtho(-1, 1, -1, 1, -1, 1);
    }

    // set up perspective view
    view_mat.setPerspective(45, 1, 1, 200);
    view_mat.lookAt(1, 1, 3, 0, 0, 0, 0, 1, 0);

    //scale
    transform_mat.setScale(scale_factor / maxdiff, scale_factor / maxdiff, scale_factor /maxdiff);

    //rotate
    transform_mat.rotate(rotation_angle, 0, 1, 0);

    //translate
    transform_mat.translate(-cent[0]*scale_factor, -cent[1]*scale_factor, -cent[2]*scale_factor);

    //rotate normals
    normal_rotation_mat.setInverseOf(transform_mat).transpose();

    // send transformation matrix to shaders
    var matloc = gl.getUniformLocation(gl.program, "mymatrix");
    gl.uniformMatrix4fv(matloc, gl.FALSE, transform_mat.elements);

    // send normal rotation matrix to shaders
    var mat_norm_loc = gl.getUniformLocation(gl.program, "norm_matrix");
    gl.uniformMatrix4fv(mat_norm_loc, gl.FALSE, normal_rotation_mat.elements);

    //send perspective view matrix to shaders
    var view_loc = gl.getUniformLocation(gl.program, 'view_matrix');
    gl.uniformMatrix4fv(view_loc, gl.false, view_mat.elements);

    // are we flat shading or smooth shading?
    var boolloc = gl.getUniformLocation(gl.program, "flat_shade");
    gl.uniform1i(boolloc, flatshade);

    // is this ortho or perspective?
    var isOrtho_loc = gl.getUniformLocation(gl.program, "is_ortho");
    gl.uniform1i(isOrtho_loc, isOrtho);

    // what is the color of our object?
    var isBlue_loc = gl.getUniformLocation(gl.program, "is_blue");
    gl.uniform1i(isBlue_loc, isBlue);

    var colorloc = gl.getUniformLocation(gl.program, "mycolor");
    gl.uniform4fv(colorloc, obj_col);

    //clear drawings each time we render
    gl.clear(gl.COLOR_BUFFER_BIT);

    //console.log(polynorms);

    // pass one triangle at a time to shaders
    // AKA pass 9 vertices, and 3 normals

    for (var pgon = 1; pgon < pgons.length - 1; pgon++) {

      /*// [x, y, z, n1x, n1y, n1z...]
      var stridedarr = new Float32Array([
        triarr[i], triarr[i+1], triarr[i+2], // vert 1

        trinorms[i], trinorms[i+1], trinorms[i+2], // vertnorm 1

        triarr[i+3], triarr[i+4], triarr[i+5], // vert 2

        trinorms[i+3], trinorms[i+4], trinorms[i+5], // vertnorm 2

        triarr[i+6], triarr[i+7], triarr[i+8],

        trinorms[i+6], trinorms[i+7], trinorms[i+8]
      ]);*/

      var vertexBuffer = gl.createBuffer();

      var typedverts = new Float32Array(vertices);

      initArrayBuffer(gl, typedverts, 3, gl.FLOAT, 'a_Position');

      var indices = new Uint8Array(pgons[pgon]);

      //console.log(indices);


      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, vertexBuffer);
      gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW);

      /*   // Bind the buffer object to target
      gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
      // Write data into the buffer object
      gl.bufferData(gl.ARRAY_BUFFER, stridedarr, gl.DYNAMIC_DRAW);  */

      //pass uniforms and attributes to shaders

      //polygon normal for flat shading
      var normloc = gl.getUniformLocation(gl.program, "norm");

      //console.log(polynorms[pgon]);
      gl.uniform3fv(normloc, polynorms[pgon]);

      /*var a_Position = gl.getAttribLocation(gl.program, 'a_Position');

      // Assign the buffer object to a_Position variable
      gl.vertexAttribPointer(a_Position, 3, gl.FLOAT, false, 24, 0);

      // Enable the assignment to a_Position variable
      gl.enableVertexAttribArray(a_Position);

      var a_normal = gl.getAttribLocation(gl.program, 'a_normal');

      // Assign the buffer object to a_normal variable
      gl.vertexAttribPointer(a_normal, 3, gl.FLOAT, false, 24, 12);

      // Enable the assignment to a_normal variable
      gl.enableVertexAttribArray(a_normal); */

      // draw the triangle!
      //gl.drawArrays(gl.TRIANGLES, 0, 3);
      gl.drawElements(gl.TRIANGLE_FAN, indices.length, gl.UNSIGNED_BYTE, 0);
    };

  };
  reader.readAsText(file);
};

function initArrayBuffer(gl, data, num, type, attribute) {
  var buffer = gl.createBuffer();

  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);

  var a_attribute = gl.getAttribLocation(gl.program, attribute);

  gl.vertexAttribPointer(a_attribute, num, type, false, 0, 0);
  // Enable the assignment of the buffer object to the attribute variable
  gl.enableVertexAttribArray(a_attribute);
};

function getpolynorms() {
  //var polynorms = [];
  // each polygon in pgons
  polynorms.push([0.0, 0.0, 0.0]);
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
};

function vecadd(v1, v2) {
  //console.log('v1 is', v1);
  //console.log('v2 is', v2);
  var v3 = [];
  v3[0] = v1[0] + v2[0];
  v3[1] = v1[1] + v2[1];
  v3[2] = v1[2] + v2[2];
  return v3;
};

function get_centroid() {

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

