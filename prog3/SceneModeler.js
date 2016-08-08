/*
Kyle O'Connor
kyjoconn@ucsc.edu
4/23/2016

                                      Program Description:
This program is an extension of the previous programs, for which there is a description of
how files are being read in, how shading was done, and how various transformations were accomplished.
This program adds on additional functionality:

Read in multiple objects and fit them all in the canvas

Left click to select an object

Translate with left click down + drag

Rotate with right click + drag

Scale with middle click + scroll

Maneuverable point light source added by default, select it with left click,
move it with left click down + drag

Specular Lighting toggle, and shininess slider


                                Notes to grader:
-Probably only works in google chrome

-Works best with frame and enterprise.

-Specular light is very overpowering for some reason, implemented slider bar but specular lighting
 is strong even at shininess = 1, so it is hard to tell

-Careful scrolling the point light source, it moves quickly


*/

//define globals

var listOfObjs = [];
var bingo_obj = 0;

// calculate mouse movement
var init_x_left;
var init_y_left;
var x_amt = 0;
var y_amt = 0;

// switches to true on mousedown
var isRightDown = false;
var isMidDown = false;
var isLeftDown = false;

var shouldClear = true;

// starting values for rotation and scale
var rotation_angle = 0;
var scale_factor = 1;
document.getElementById("shinyslide").defaultValue=1;
var shininess = document.getElementById("shinyslide").value;
//console.log("shininess", shininess);

// booleans for our shading/color/camera options
var isBlue = 1;
var flatshade = 1;
var isOrtho = 1;
var isShiny = 0;

// starting colors
var obj_col = [0, 0, 1, 1];
var grey = Math.round(.75*255);

var light_vertarr = [
  [],
  [-1, -1,  1],
  [1, -1,  1],
  [1,  1,  1],
  [-1,  1,  1],
  [-1, -1, -1],
  [1, -1, -1],
  [1,  1, -1],
  [-1,  1, -1],
  []
];


var light_pgons = [
  [1, 2, 3, 4],
  [2, 6, 7, 3],
  [7, 6, 5, 8],
  [8, 5, 1, 4],
  [4, 3, 7, 8],
  [6, 2, 1, 5],
  []
];

var light = {"vertarr":light_vertarr, "pgons":light_pgons, "scale_factor":.1, "rotation_angle":0, "x_amt":0, "y_amt":-12,
               "color_id":Math.random(0, 1)*255};


listOfObjs.push(light);

//shaders
var VSHADER_SOURCE =
  'attribute vec4 a_Position;\n' +
  'attribute vec4 a_normal;\n' +
  'uniform mat4 mymatrix;\n' +
  'uniform mat4 view_matrix;\n' +
  'uniform mat4 proj_matrix;\n' +
  'uniform mat4 norm_matrix;\n' +
  'uniform vec4 light_position;\n' +
  'uniform int is_ortho;\n' +
  'uniform int is_blue;\n' +
  'uniform int is_vert_shiny;\n' +
  'uniform float glossiness;\n' +
  'varying vec4 varycolor;\n' +
  'varying vec4 vert_pos;\n' +
  'vec4 vertcolor;\n' +
  'void main() {\n' +
  '  vert_pos = mymatrix * a_Position;\n' +
  '  vec4 copy_normal = a_normal;\n' +
  '  copy_normal = copy_normal * norm_matrix;\n' +
  '  vec4 light = vec4(0, 0, 1, 1);\n' +
  '  vec4 point_light = light_position - (mymatrix * a_Position);\n' +
  '  vec4 shine_color = vec4(1, 0, 0, 1);\n' +
  '  vec4 halfway = light + copy_normal;\n' +
  '  if (is_blue == 1) {\n' +
  '    vertcolor = vec4(0, 0, 1, 1);\n' +
  '  }\n' +
  '  else {\n' +
  '    vertcolor = vec4(0, 1, 0, 1);\n' +
  '  }\n'+
  '  if (is_ortho == 1) {\n' +
  '    gl_Position = mymatrix * a_Position;\n' +
  '  }\n' +
  '  else {\n' +
  '    gl_Position = view_matrix * mymatrix * a_Position;\n'+
  '  }\n'+
  '  float intensity = dot(normalize(light), normalize(copy_normal));\n' +
  '  float intensity2 = dot(normalize(point_light), normalize(copy_normal));\n' +
  '  vertcolor = (vertcolor * intensity) + (vertcolor * intensity2);\n' +
  '  float shine_intensity = pow(dot(normalize(halfway), normalize(copy_normal)), glossiness);\n' +
  '  shine_color = shine_color * shine_intensity;\n' +
  '  if (intensity < 0.0) {\n' +
  '    intensity = 0.0;\n' +
  '  }\n' +
  '  if (is_vert_shiny == 1) {\n' +
  '    varycolor = vertcolor + shine_color;\n' +
  '    varycolor.w = 1.0;\n' +
  '  }\n' +
  '  else {\n' +
  '    varycolor = vertcolor;\n'+
  '    varycolor.w = 1.0;\n' +
  '  }\n'+
  '}\n';

var FSHADER_SOURCE =
  'precision mediump float;\n' +
  'uniform vec4 mycolor;\n' +
  'uniform vec4 light_pos;\n' +
  'uniform float gloss;\n' +
  'uniform vec3 norm;\n' +
  'uniform int flat_shade;\n' +
  'uniform int is_shiny;\n' +
  'uniform int color_mode;\n' +
  'varying vec4 varycolor;\n' +
  'varying vec4 vert_pos;\n' +
  'void main() {\n' +
  '  if (color_mode == 1) {\n' +
  '    gl_FragColor = mycolor;\n' +
  '  }\n'+
  '  else {\n' +
  '    vec3 light = vec3(0, 0, 1);\n' +
  '    vec4 pt_light = light_pos - vert_pos;\n' +
  '    vec3 point_light = pt_light.xyz;\n' +
  '    vec4 diffuse_color = mycolor;\n' +
  '    vec4 diffuse_color2 = mycolor;\n' +
  '    vec4 shine_color = vec4(1, 0, 0, 1);\n' +
  '    vec3 halfway = light + norm;\n' +
  '    float shine_intensity = pow(dot(normalize(halfway), normalize(norm)), gloss);\n' +
  '    shine_color = shine_color * shine_intensity;\n' +
  '    float intensity = dot(normalize(light), normalize(norm));\n' +
  '    float intensity2 = dot(normalize(point_light), normalize(norm));\n' +
  '    diffuse_color = diffuse_color * intensity;\n' +
  '    diffuse_color2 = diffuse_color2 * intensity2;\n' +
  '    if (intensity < 0.0) {\n' +
  '      intensity = 0.0;\n' +
  '    }\n' +
  '    if (flat_shade == 1) {\n' +
  '      if (is_shiny == 1) {\n' +
  '        gl_FragColor = diffuse_color + shine_color;\n' +
  '      }\n' +
  '      else {\n' +
  '        gl_FragColor = diffuse_color + diffuse_color2;\n'+
  '      }\n'+
  '    }\n' +
  '    else {\n' +
  '      gl_FragColor = varycolor;\n'+
  '    }\n'+
  '  }\n' +
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


  drawObject(listOfObjs[0]["vertarr"], listOfObjs[0]["pgons"], listOfObjs[0]["scale_factor"],
             listOfObjs[0]["rotation_angle"], listOfObjs[0]["x_amt"], listOfObjs[0]["y_amt"],
             listOfObjs[0]["color_id"], 0);



  // call readcoor when user uploads files
  document.getElementById('file').addEventListener('change', function() {
  var vertarr = [];
  var pgons = [];
  //call this function when user uploads a file

  //get our files straight
  var coorfile;
  var polyfile;
  var file1 = document.getElementById('file').files[0];
  var file2 = document.getElementById('file').files[1];

  var fileExt1 = file1.name.split('.').pop();
  var fileExt2 = file2.name.split('.').pop();

  if (fileExt1.charAt(0) == 'c') {
    coorfile = file1;
    polyfile = file2;
  } else {
    coorfile = file2;
    polyfile = file1
  }

  var reader = new FileReader();
  reader.onload = function(progressEvent){

    // line by line
    var lines = this.result.split('\n');
    for(var line = 1; line < lines.length; line++){
      vertarr[line] = lines[line].split(',').map(parseFloat);
      vertarr[line].shift();
    };
    //readpoly
    var reader2 = new FileReader();
    reader2.onload = function(progressEvent) {

      // line by line
      var lines = this.result.split('\n');
      //make each line into an array of vertex indices
      var which_poly = 0;
      for (var line = 1; line < lines.length; line++) {
        pgons[line] = lines[line].split(/\s+/);
        //console.log(pgons[line]);
        //get rid of label
        pgons[line].shift();
        //console.log(pgons[line]);
        // make each vertex index in each polygon an integer
        for (var i = 0; i < pgons[line].length; i++) {
          pgons[line][i] = parseInt(pgons[line][i]);
          //console.log(pgons[line][i]);
        };

      };

    };
    reader2.readAsText(polyfile);

  };

  reader.readAsText(coorfile);


  setTimeout(function() {
  var object = {"vertarr":vertarr, "pgons":pgons, "scale_factor":1, "rotation_angle":0, "x_amt":1, "y_amt":1,
               "color_id":Math.random(0, 1)*255};

  listOfObjs.push(object);

    for (var i = 0; i < listOfObjs.length; i++) {
      shouldClear = false;
      drawObject(listOfObjs[i]["vertarr"], listOfObjs[i]["pgons"], listOfObjs[i]["scale_factor"],
                 listOfObjs[i]["rotation_angle"], listOfObjs[i]["x_amt"], listOfObjs[i]["y_amt"]);
    };

  shouldClear = true;


  }, 200);

}, false);

  // switch shading style
  document.getElementById('toggleshade').addEventListener('click', function() {
    flatshade = !flatshade;
    shouldClear = false;
    for (var i = 0; i < listOfObjs.length; i++) {
      shouldClear = false;
      drawObject(listOfObjs[i]["vertarr"], listOfObjs[i]["pgons"], listOfObjs[i]["scale_factor"],
                 listOfObjs[i]["rotation_angle"], listOfObjs[i]["x_amt"], listOfObjs[i]["y_amt"]);
    };
  }, false);

  // switch ortho/perspective
  document.getElementById('togglecam').addEventListener('click', function() {
    isOrtho = !isOrtho;
    gl.clearColor(.75, .75, .75, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);
    shouldClear = false;
    for (var i = 0; i < listOfObjs.length; i++) {
      drawObject(listOfObjs[i]["vertarr"], listOfObjs[i]["pgons"], listOfObjs[i]["scale_factor"],
                 listOfObjs[i]["rotation_angle"], listOfObjs[i]["x_amt"], listOfObjs[i]["y_amt"]);
    };
  }, false);

  document.getElementById('togglespec').addEventListener('click', function() {
    isShiny = !isShiny;
    gl.clearColor(.75, .75, .75, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);
    shouldClear = false;
    for (var i = 0; i < listOfObjs.length; i++) {
      drawObject(listOfObjs[i]["vertarr"], listOfObjs[i]["pgons"], listOfObjs[i]["scale_factor"],
                 listOfObjs[i]["rotation_angle"], listOfObjs[i]["x_amt"], listOfObjs[i]["y_amt"]);
    };
  }, false);

  document.getElementById('shinyslide').addEventListener('change', function() {
    shininess = document.getElementById("shinyslide").value;
    console.log(shininess);
    gl.clearColor(.75, .75, .75, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);
    shouldClear = false;
    for (var i = 0; i < listOfObjs.length; i++) {
      drawObject(listOfObjs[i]["vertarr"], listOfObjs[i]["pgons"], listOfObjs[i]["scale_factor"],
                 listOfObjs[i]["rotation_angle"], listOfObjs[i]["x_amt"], listOfObjs[i]["y_amt"]);
    };
  }, false);

  // listen for left click to change color of object or background
  document.getElementById('webgl').addEventListener('click', function() {
    if (event.button == 0) {
      // get pixel location
      var buf = new Uint8Array(gl.canvas.width * gl.canvas.height * 4);
      var x = event.layerX;
      var y = event.layerY;
      // get pixel color
      gl.readPixels(x, canvas.height - y, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, buf);
      var grey = Math.round(.75*255);
      //check if we've clicked the background
      if (buf[0] == grey && buf[1] == grey && buf[2] == grey && buf[3] == 255 ) {
        ;
      }
      else if (buf[0] == 255 && buf[1] == 0 && buf[2] == 0 && buf[3] == 255 ) {
        ;
      }
      else { // must've clicked the object
        if (document.getElementById('file').files[0] != null) {
          gl.clearColor(.75, .75, .75, 1);
          gl.clear(gl.COLOR_BUFFER_BIT);
          // draw all the objects in picking mode
          for (var i = 0; i < listOfObjs.length; i++) {
            shouldClear = false;
            // draw all objects in picking mode
            drawObject(listOfObjs[i]["vertarr"], listOfObjs[i]["pgons"], listOfObjs[i]["scale_factor"],
                       listOfObjs[i]["rotation_angle"], listOfObjs[i]["x_amt"], listOfObjs[i]["y_amt"],
                       listOfObjs[i]["color_id"], 1);
          };
          // figure out which object we clicked
          for (var j = 0; j < listOfObjs.length; j++) {
            // get pixel color
            gl.readPixels(x, canvas.height - y, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, buf);
            if (Math.ceil(listOfObjs[j]["color_id"]) == buf[2] || (Math.floor(listOfObjs[j]["color_id"]) == buf[2])) {
              //console.log("color_id", listOfObjs[j]["color_id"]);
              //console.log("buf2[2]", buf2[2]);
              bingo_obj = j;
              //console.log(bingo_obj);
            } else {
              //console.log("color_id", listOfObjs[j]["color_id"]);
              //console.log("buf[2]", buf[2]);
            };
          };
          // draw back in not picking mode
          for (var i = 0; i < listOfObjs.length; i++) {
            shouldClear = false;
            drawObject(listOfObjs[i]["vertarr"], listOfObjs[i]["pgons"], listOfObjs[i]["scale_factor"],
                       listOfObjs[i]["rotation_angle"], listOfObjs[i]["x_amt"], listOfObjs[i]["y_amt"]);
          };
        };
      }

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

  document.getElementById('webgl').addEventListener('mousemove', function() {
    // only care about mouse movement on right mousedown
    if (isRightDown) {
      shouldClear = true;
      listOfObjs[bingo_obj]["rotation_angle"] += (event.clientX - init_x); // rotate based on mouse movement
      drawObject(listOfObjs[bingo_obj]["vertarr"], listOfObjs[bingo_obj]["pgons"], listOfObjs[bingo_obj]["scale_factor"],
                listOfObjs[bingo_obj]["rotation_angle"], listOfObjs[bingo_obj]["x_amt"], listOfObjs[bingo_obj]["y_amt"]);
      for (var i = 0; i < listOfObjs.length; i++) {
        if (i != bingo_obj) {
          shouldClear = false;
          drawObject(listOfObjs[i]["vertarr"], listOfObjs[i]["pgons"], listOfObjs[i]["scale_factor"],
                     listOfObjs[i]["rotation_angle"], listOfObjs[i]["x_amt"], listOfObjs[i]["y_amt"]);
        };
      };
    };
    init_x = event.clientX;
  }, false);

  // stop rotating on mouseup
  document.getElementById('webgl').addEventListener('mouseup', function() {
    if (event.button == 2) {
      isRightDown = false;
      shouldClear = false;
      for (var i = 0; i < listOfObjs.length; i++) {
        drawObject(listOfObjs[i]["vertarr"], listOfObjs[i]["pgons"], listOfObjs[i]["scale_factor"],
                   listOfObjs[i]["rotation_angle"], listOfObjs[i]["x_amt"], listOfObjs[i]["y_amt"]);
      };
    };
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
      } else {
      isMidDown = true; // start tracking mousewheel
      }
    };
  }, false);

  document.getElementById('webgl').addEventListener('mousewheel', function() {
    // only care about mousewheel if middle mousedown
    if (isMidDown) {
      shouldClear = true;
      listOfObjs[bingo_obj]["scale_factor"] += event.wheelDelta / 1200; // scale based on how much they wheel
      drawObject(listOfObjs[bingo_obj]["vertarr"], listOfObjs[bingo_obj]["pgons"], listOfObjs[bingo_obj]["scale_factor"],
                 listOfObjs[bingo_obj]["rotation_angle"], listOfObjs[bingo_obj]["x_amt"], listOfObjs[bingo_obj]["y_amt"]);
      for (var i = 0; i < listOfObjs.length; i++) {
        if (i != bingo_obj) {
          shouldClear = false;
          drawObject(listOfObjs[i]["vertarr"], listOfObjs[i]["pgons"], listOfObjs[i]["scale_factor"],
                     listOfObjs[i]["rotation_angle"], listOfObjs[i]["x_amt"], listOfObjs[i]["y_amt"]);
        };
      };
    };
  }, false);

  document.getElementById('webgl').addEventListener('mouseup', function() {
    if (event.button == 1) {
      isMidDown = false; // stop scaling
      shouldClear = false;
      for (var i = 0; i < listOfObjs.length; i++) {
        drawObject(listOfObjs[i]["vertarr"], listOfObjs[i]["pgons"], listOfObjs[i]["scale_factor"],
                   listOfObjs[i]["rotation_angle"], listOfObjs[i]["x_amt"], listOfObjs[i]["y_amt"]);
      };
    };
  }, false);

  //left click down for translation
  document.getElementById('webgl').addEventListener('mousedown', function() {
    if (event.button == 0) {
      isLeftDown = true;
      init_x_left = event.clientX; // take down location of mousedown
      init_y_left = event.clientY;
    };

  }, false);

  document.getElementById('webgl').addEventListener('mousemove', function() {
    if (isLeftDown) {
      shouldClear = true;
      listOfObjs[bingo_obj]["x_amt"] += event.clientX - init_x_left;
      listOfObjs[bingo_obj]["y_amt"] += event.clientY - init_y_left;
      drawObject(listOfObjs[bingo_obj]["vertarr"], listOfObjs[bingo_obj]["pgons"], listOfObjs[bingo_obj]["scale_factor"],
                listOfObjs[bingo_obj]["rotation_angle"], listOfObjs[bingo_obj]["x_amt"], listOfObjs[bingo_obj]["y_amt"]);
      for (var i = 0; i < listOfObjs.length; i++) {
        if (i != bingo_obj) {
          shouldClear = false;
          drawObject(listOfObjs[i]["vertarr"], listOfObjs[i]["pgons"], listOfObjs[i]["scale_factor"],
                     listOfObjs[i]["rotation_angle"], listOfObjs[i]["x_amt"], listOfObjs[i]["y_amt"]);
        };
      };
    };
    init_x_left = event.clientX;
    init_y_left = event.clientY;
  }, false);

  document.getElementById('webgl').addEventListener('mouseup', function() {
    if (event.button == 0) {
      isLeftDown = false; // stop translating
      shouldClear = false;
      for (var i = 0; i < listOfObjs.length; i++) {
        drawObject(listOfObjs[i]["vertarr"], listOfObjs[i]["pgons"], listOfObjs[i]["scale_factor"],
                   listOfObjs[i]["rotation_angle"], listOfObjs[i]["x_amt"], listOfObjs[i]["y_amt"]);
      };
    };
  }, false);


}; // end of main



function drawObject(vertarr, pgons, scale_factor, rotation_angle, x_amt, y_amt,
                     color_id=255, color_mode=0, offset=0) {

  //console.log(color_mode);
  //console.log(color_id);


  //console.log(vertarr);
  //console.log(pgons);
  //console.log(scale_factor);
  //console.log(rotation_angle);
  //console.log(x_amt);
  //console.log(y_amt);
  //console.log(offset);

  var triarr = [];
  var trinorms = [];
  var which_poly = 0;

  var transform_mat = new Matrix4();
  var view_mat = new Matrix4();
  var normal_rotation_mat = new Matrix4();



  // set our scaling limits
  scale_factor = Math.max(scale_factor, .1);
  scale_factor = Math.min(scale_factor, 2.0);

  // build up triarr
  for (var pgon = 1; pgon < pgons.length; pgon++) {
    for (var vert = pgons[pgon].length - 2; vert >= 1; vert--) {
      triarr.push(vertarr[pgons[pgon][vert]][0]);
      triarr.push(vertarr[pgons[pgon][vert]][1]);
      triarr.push(vertarr[pgons[pgon][vert]][2]);

      triarr.push(vertarr[pgons[pgon][vert + 1]][0]);
      triarr.push(vertarr[pgons[pgon][vert + 1]][1]);
      triarr.push(vertarr[pgons[pgon][vert + 1]][2]);

      triarr.push(vertarr[pgons[pgon][0]][0]);
      triarr.push(vertarr[pgons[pgon][0]][1]);
      triarr.push(vertarr[pgons[pgon][0]][2]);

      triarr.push(which_poly);
    };
    which_poly++;
  };
  //console.log(triarr);

  var polynorms = getpolynorms(vertarr, pgons);

  var vertnorms = getvertnorms(vertarr, pgons);

  var trinorms = get_trinorms(pgons, vertnorms);

  //console.log("pnorms", polynorms);
  //console.log("vnorms", vertnorms);
  //console.log("trinorms", trinorms);


  //get_trinorms();

  var cent = get_centroid(vertarr);
  //console.log("cent", cent);

  transform_mat.setOrtho(-1, 1, -1, 1, -1, 1);

  view_mat.setPerspective(45, 1, 1, 200);
  view_mat.lookAt(1, 1, 3, 0, 0, 0, 0, 1, 0);

  var maxdiff = get_maxdiff(vertarr);
  //console.log(maxdiff);

  transform_mat.setScale(scale_factor / maxdiff, scale_factor / maxdiff, scale_factor /maxdiff);

  transform_mat.rotate(rotation_angle, 0, 1, 0);

  // try putting this before scale
  transform_mat.translate(-cent[0]*scale_factor, -cent[1]*scale_factor, -cent[2]*scale_factor);

  transform_mat.translate(x_amt, -y_amt, 0);

  transform_mat.translate(offset - offset, offset, offset - offset);

  normal_rotation_mat.setInverseOf(transform_mat).transpose();

  // send everything to the shaders

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

  var isShinyLoc = gl.getUniformLocation(gl.program, "is_shiny");
  gl.uniform1i(isShinyLoc, isShiny);

  var isShinyVertLoc = gl.getUniformLocation(gl.program, "is_vert_shiny");
  gl.uniform1i(isShinyVertLoc, isShiny);

  // is this ortho or perspective?
  var isOrtho_loc = gl.getUniformLocation(gl.program, "is_ortho");
  gl.uniform1i(isOrtho_loc, isOrtho);

  // what is the color of our object?
  var isBlue_loc = gl.getUniformLocation(gl.program, "is_blue");
  gl.uniform1i(isBlue_loc, /*isBlue*/ 1);

  var color_mode_loc = gl.getUniformLocation(gl.program, "color_mode");
  gl.uniform1i(color_mode_loc, color_mode);

  var colorloc = gl.getUniformLocation(gl.program, "mycolor");
  gl.uniform4fv(colorloc, [0, 0, color_id / 255, 1]);

  //console.log([listOfObjs[0]["x_amt"], -listOfObjs[0]["y_amt"], 0, 1]);
  var light_pos_loc = gl.getUniformLocation(gl.program, "light_pos");
  gl.uniform4fv(light_pos_loc, [listOfObjs[0]["x_amt"], -listOfObjs[0]["y_amt"], 0, 1]);

  var light_position_loc = gl.getUniformLocation(gl.program, "light_position");
  gl.uniform4fv(light_position_loc, [listOfObjs[0]["x_amt"], -listOfObjs[0]["y_amt"], 0, 1]);

  var gloss_loc = gl.getUniformLocation(gl.program, "gloss");
  gl.uniform1f(gloss_loc, shininess);


  if (shouldClear) {
      //clear drawings each time we render
      gl.clear(gl.COLOR_BUFFER_BIT);
    };

  // pass one triangle at a time to shaders
  // AKA pass 9 vertices, and 3 normals
  for (var i = 0; i < triarr.length; i += 10 /*10 bcs polygon identifier*/) {

    // [x, y, z, n1x, n1y, n1z...]
    var stridedarr = new Float32Array([
      triarr[i], triarr[i+1], triarr[i+2], // vert 1

      trinorms[i], trinorms[i+1], trinorms[i+2], // vertnorm 1

      triarr[i+3], triarr[i+4], triarr[i+5], // vert 2

      trinorms[i+3], trinorms[i+4], trinorms[i+5], // vertnorm 2

      triarr[i+6], triarr[i+7], triarr[i+8],

      trinorms[i+6], trinorms[i+7], trinorms[i+8]
    ]);

    var vertexBuffer = gl.createBuffer();

    // Bind the buffer object to target
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
    // Write data into the buffer object
    gl.bufferData(gl.ARRAY_BUFFER, stridedarr, gl.DYNAMIC_DRAW);

    //pass uniforms and attributes to shaders

    //polygon normal for flat shading
    var normloc = gl.getUniformLocation(gl.program, "norm");
    //console.log("passing", [polynorms[triarr[i+9]][0], polynorms[triarr[i+9]][1], polynorms[triarr[i+9]][2]]);
    gl.uniform3fv(normloc, [polynorms[triarr[i+9]][0], polynorms[triarr[i+9]][1], polynorms[triarr[i+9]][2]]);

    var a_Position = gl.getAttribLocation(gl.program, 'a_Position');

    // Assign the buffer object to a_Position variable
    gl.vertexAttribPointer(a_Position, 3, gl.FLOAT, false, 24, 0);

    // Enable the assignment to a_Position variable
    gl.enableVertexAttribArray(a_Position);

    var a_normal = gl.getAttribLocation(gl.program, 'a_normal');

    // Assign the buffer object to a_normal variable
    gl.vertexAttribPointer(a_normal, 3, gl.FLOAT, false, 24, 12);

    // Enable the assignment to a_normal variable
    gl.enableVertexAttribArray(a_normal);

    // draw the triangle!
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  };

}; // end of drawObject()

function getpolynorms(vertarr, pgons) {
  var polynorms = [];
  // each polygon in pgons
  for (var pgon = 1; pgon < pgons.length - 1; pgon++) {
    // get normal to pgon
    // append to polynorms
    var norm = calcnorm(vertarr, pgons[pgon]);
    polynorms.push(norm);
  };
  return polynorms;
};

function calcnorm(vertarr, pgon) {
  var v1 = vecdiff(vertarr[pgon[1]], vertarr[pgon[0]]);
  var v2 = vecdiff(vertarr[pgon.length - 1], vertarr[pgon[0]]);
  var v3 = [];
  v3[0] = (v1[1] * v2[2]) - (v1[2] * v2[1])
  v3[1] = (v1[2] * v2[0]) - (v1[0] * v2[2])
  v3[2] = (v1[0] * v2[1]) - (v1[1] * v2[0])
  return v3;
};

function getvertnorms(vertarr, pgons) {

  //console.log(vertarr);
  //console.log(pgons);

  var vertnorms = new Array(vertarr.length);
  vertnorms.fill([0,0,0]);

  for (var pgon = 1; pgon < pgons.length - 1; pgon++) {
    //console.log(pgon);
    // get normal to pgon
    // append to polynorms
    //console.log(vertarr[pgons[pgon][1]]);
    var v1 = vecdiff(vertarr[pgons[pgon][1]], vertarr[pgons[pgon][0]]);
    var v2 = vecdiff(vertarr[pgons[pgon][pgons[pgon].length - 1]], vertarr[pgons[pgon][0]]);
    var v3 = [];
    //console.log(v3);
    v3[0] = (v1[1] * v2[2]) - (v1[2] * v2[1])
    v3[1] = (v1[2] * v2[0]) - (v1[0] * v2[2])
    v3[2] = (v1[0] * v2[1]) - (v1[1] * v2[0])
    for (var i = 0; i < pgons[pgon].length; i++) {
      vertnorms[pgons[pgon][i]] = vecadd(vertnorms[pgons[pgon][i]], v3);
    };
  };
  return vertnorms;
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

function get_centroid(vertarr) {
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
  return cent;
};

function get_maxdiff(vertarr) {
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

  var diffx = xmax - xmin;
  var diffy = ymax - ymin;
  var diffz = zmax - zmin;

  var maxdiff = Math.max(diffx, diffy, diffz);
  return maxdiff;
};

function get_trinorms(pgons, vertnorms) {
  var trinorms = [];
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
  return trinorms;
};


