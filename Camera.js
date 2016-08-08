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
var FOV = 45;

// calculate mouse movement
var init_x_right;
var init_y_left;
var init_x_left;
var init_y_left;
var cam_init_x_left;
var cam_init_y_left;
var cam_init_z_left;
var x_amt = 0;
var y_amt = 0;
var z_amt = 0;
var cam_x_amt = 1;
var cam_y_amt = 1;
var cam_z_amt = 3;
var pitch = 0;
var yaw = 0;

// switches to true on mousedown
var isRightDown = false;
var isMidDown = false;
var isLeftDown = false;
var isMidDown_cam = false;

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
var isBack;

// starting colors
var obj_col = [0, 0, 1, 1];
var grey = Math.round(.75*255);

// array of vertices to create our point light
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

// array of polygons to create our point light
var light_pgons = [
  [1, 2, 3, 4],
  [2, 6, 7, 3],
  [7, 6, 5, 8],
  [8, 5, 1, 4],
  [4, 3, 7, 8],
  [6, 2, 1, 5],
  []
];

// define some qualities of our point light
var light = {"vertarr":light_vertarr, "pgons":light_pgons, "scale_factor":.1, "rotation_angle":0, "x_amt":0, "y_amt":-12,
             "z_amt": 0, "color_id":Math.random(0, 1)*255};


// light will always be the first object in our list of objects
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

  // start things off with just our point light
  drawObject(listOfObjs[0]["vertarr"], listOfObjs[0]["pgons"], listOfObjs[0]["scale_factor"],
             listOfObjs[0]["rotation_angle"], listOfObjs[0]["x_amt"], listOfObjs[0]["y_amt"],
             listOfObjs[0]["z_amt"], listOfObjs[0]["color_id"], 0);



  // read in added files
  document.getElementById('file').addEventListener('change', function() {

    // initialize the object's array of vertices and array of polygons
    var vertarr = [];
    var pgons = [];

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

    // read .coor file using FileReader
    var coor_reader = new FileReader();
    coor_reader.onload = function(progressEvent){

      // array of lines (each line is one vertex)
      var lines = this.result.split('\n');
      // for each line split by commas, parse to floats, remove label, and add to vertarr
      for(var line = 1; line < lines.length; line++){
        vertarr[line] = lines[line].split(',').map(parseFloat);
        vertarr[line].shift();
      };
      // read .poly file inside of .coor onload()
      var polyreader = new FileReader();
      polyreader.onload = function(progressEvent) {

        // array of lines (each line is one polygon)
        var lines = this.result.split('\n');
        // make each line into an array of vertex indices
        var which_poly = 0;
        // for each line, remove the label, split indices by spaces, add to pgons
        for (var line = 1; line < lines.length; line++) {
          pgons[line] = lines[line].split(/\s+/);
          //get rid of label
          pgons[line].shift();
          // make each vertex index in each polygon an integer
          for (var i = 0; i < pgons[line].length; i++) {
            pgons[line][i] = parseInt(pgons[line][i]);
          };

        };

      };
      polyreader.readAsText(polyfile);

    };

    coor_reader.readAsText(coorfile);


    // make sure file is done reading before trying to draw
    setTimeout(function() {

      // store the information we just obtained in an object along with some drawing defaults
      var object = {"vertarr":vertarr, "pgons":pgons, "scale_factor":1, "rotation_angle":0, "x_amt":1, "y_amt":1,
                    "z_amt":0, "color_id":Math.random(0, 1)*255};

      // add object to our list of objects
      listOfObjs.push(object);

      // draw all the objects!
      for (var i = 0; i < listOfObjs.length; i++) {
        // false so that we don't only see the last object drawn
        shouldClear = false;
        drawObject(listOfObjs[i]["vertarr"], listOfObjs[i]["pgons"], listOfObjs[i]["scale_factor"],
                   listOfObjs[i]["rotation_angle"], listOfObjs[i]["x_amt"], listOfObjs[i]["y_amt"],
                   listOfObjs[i]["z_amt"]);
      };

      shouldClear = true;


    }, 200);

}, false);

  // switch shading style
  document.getElementById('toggleshade').addEventListener('click', function() {
    flatshade = !flatshade;
    gl.clearColor(.75, .75, .75, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);
    shouldClear = false;
    for (var i = 0; i < listOfObjs.length; i++) {
      shouldClear = false;
      drawObject(listOfObjs[i]["vertarr"], listOfObjs[i]["pgons"], listOfObjs[i]["scale_factor"],
                 listOfObjs[i]["rotation_angle"], listOfObjs[i]["x_amt"], listOfObjs[i]["y_amt"],
                 listOfObjs[i]["z_amt"]);
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
                 listOfObjs[i]["rotation_angle"], listOfObjs[i]["x_amt"], listOfObjs[i]["y_amt"],
                 listOfObjs[i]["z_amt"]);
    };
  }, false);

  //toggle specularity on\off
  document.getElementById('togglespec').addEventListener('click', function() {
    isShiny = !isShiny;
    gl.clearColor(.75, .75, .75, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);
    shouldClear = false;
    for (var i = 0; i < listOfObjs.length; i++) {
      drawObject(listOfObjs[i]["vertarr"], listOfObjs[i]["pgons"], listOfObjs[i]["scale_factor"],
                 listOfObjs[i]["rotation_angle"], listOfObjs[i]["x_amt"], listOfObjs[i]["y_amt"],
                 listOfObjs[i]["z_amt"]);
    };
  }, false);

  // adjust shininess
  document.getElementById('shinyslide').addEventListener('change', function() {
    shininess = document.getElementById("shinyslide").value;
    console.log(shininess);
    gl.clearColor(.75, .75, .75, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);
    shouldClear = false;
    for (var i = 0; i < listOfObjs.length; i++) {
      drawObject(listOfObjs[i]["vertarr"], listOfObjs[i]["pgons"], listOfObjs[i]["scale_factor"],
                 listOfObjs[i]["rotation_angle"], listOfObjs[i]["x_amt"], listOfObjs[i]["y_amt"],
                 listOfObjs[i]["z_amt"]);
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
        ; // left clicking background does nothing
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
                       listOfObjs[i]["z_amt"], listOfObjs[i]["color_id"], 1);
          };
          // figure out which object we clicked
          for (var j = 0; j < listOfObjs.length; j++) {
            // get pixel color
            gl.readPixels(x, canvas.height - y, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, buf);
            if (Math.ceil(listOfObjs[j]["color_id"]) == buf[2] || (Math.floor(listOfObjs[j]["color_id"]) == buf[2])) {
              bingo_obj = j;
            } else {
              //console.log("color_id", listOfObjs[j]["color_id"]);
              //console.log("buf[2]", buf[2]);
            };
          };
          // draw back in not picking mode
          for (var i = 0; i < listOfObjs.length; i++) {
            shouldClear = false;
            drawObject(listOfObjs[i]["vertarr"], listOfObjs[i]["pgons"], listOfObjs[i]["scale_factor"],
                       listOfObjs[i]["rotation_angle"], listOfObjs[i]["x_amt"], listOfObjs[i]["y_amt"],
                       listOfObjs[i]["z_amt"]);
          };
        };
      }

    };
  }, false);

  // listen for right mousedown
  document.getElementById('webgl').addEventListener('mousedown', function() {
    //right button is down
    if (event.button == 2) {
      isRightDown = true; // start tracking mouse movement for either object or cam rotation
      // check pixel color (we only care if it is the object)
      var buf = new Uint8Array(gl.canvas.width * gl.canvas.height * 4);
      var x = event.layerX;
      var y = event.layerY;
      gl.readPixels(x, canvas.height - y, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, buf);
      if (buf[0] == grey && buf[1] == grey && buf[2] == grey && buf[3] == 255) { // clicked the background
        isBack = true;
      } else { // we know it is the object not the background
        isBack = false;
        init_x_right = event.clientX; // keep track of where mousedown started
        init_y_right = event.clientY;
      };
    };
  }, false);

  // mousemove with right mousedown
  document.getElementById('webgl').addEventListener('mousemove', function() {
    // only care about mouse movement on right mousedown
    if (isRightDown) {
      console.log("isBack", isBack);
      if (!isBack) { // holding right click on an object, start rotating selected object
        shouldClear = true;
        listOfObjs[bingo_obj]["rotation_angle"] += (event.clientX - init_x_right); // rotate based on mouse movement
        // draw the selected object while clearing the old versions of itself
        drawObject(listOfObjs[bingo_obj]["vertarr"], listOfObjs[bingo_obj]["pgons"], listOfObjs[bingo_obj]["scale_factor"],
                   listOfObjs[bingo_obj]["rotation_angle"], listOfObjs[bingo_obj]["x_amt"], listOfObjs[bingo_obj]["y_amt"],
                   listOfObjs[bingo_obj]["z_amt"]);
        // since we are clearing every time we need to draw back
        // the other unselected objects where they were
        for (var i = 0; i < listOfObjs.length; i++) {
          if (i != bingo_obj) {
            shouldClear = false;
            drawObject(listOfObjs[i]["vertarr"], listOfObjs[i]["pgons"], listOfObjs[i]["scale_factor"],
                       listOfObjs[i]["rotation_angle"], listOfObjs[i]["x_amt"], listOfObjs[i]["y_amt"],
                       listOfObjs[i]["z_amt"]);
          };
        };
      } else { // holding right click on the background, yaw, pitch, yaw!
        gl.clearColor(.75, .75, .75, 1); // clear before rotating camera
        gl.clear(gl.COLOR_BUFFER_BIT);
        yaw += (event.clientX - init_x_right) / 100; // rotate camera
        pitch += (event.clientY - init_y_right) / 100;
        shouldClear = false; // draw all the objects with our newly rotated camera
        for (var i = 0; i < listOfObjs.length; i++) {
          drawObject(listOfObjs[i]["vertarr"], listOfObjs[i]["pgons"], listOfObjs[i]["scale_factor"],
                     listOfObjs[i]["rotation_angle"], listOfObjs[i]["x_amt"], listOfObjs[i]["y_amt"],
                     listOfObjs[i]["z_amt"]);
        };
      };
    };
    init_x_right = event.clientX;
    init_y_right = event.clientY;
  }, false);

  // stop rotating on mouseup
  document.getElementById('webgl').addEventListener('mouseup', function() {
    if (event.button == 2) {
      isRightDown = false;
      shouldClear = false;
      for (var i = 0; i < listOfObjs.length; i++) {
        drawObject(listOfObjs[i]["vertarr"], listOfObjs[i]["pgons"], listOfObjs[i]["scale_factor"],
                   listOfObjs[i]["rotation_angle"], listOfObjs[i]["x_amt"], listOfObjs[i]["y_amt"],
                   listOfObjs[i]["z_amt"]);
      };
    };
  }, false);


  // middle mousedown for either moving object along z or moving camera along z
  document.getElementById('webgl').addEventListener('mousedown', function() {
    // check if middle mousedown is on the object
    if (event.button == 1) {
      var buf = new Uint8Array(gl.canvas.width * gl.canvas.height * 4);
      var x = event.layerX;
      var y = event.layerY;
      gl.readPixels(x, canvas.height - y, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, buf);
      if (buf[0] == grey && buf[1] == grey && buf[2] == grey && buf[3] == 255) {
        isMidDown_cam = true; // we'll be moving the camera
      } else {
      isMidDown = true; // we'll be moving the object
      }
    };
  }, false);

  // either moving object or camera along z, or zooming in
  document.getElementById('webgl').addEventListener('mousewheel', function() {

    if (isMidDown) { // moving object along z
      shouldClear = true;
      //listOfObjs[bingo_obj]["scale_factor"] += event.wheelDelta / 1200; // scale based on how much they wheel
      listOfObjs[bingo_obj]["z_amt"] += event.wheelDelta / 1200;
      drawObject(listOfObjs[bingo_obj]["vertarr"], listOfObjs[bingo_obj]["pgons"], listOfObjs[bingo_obj]["scale_factor"],
                 listOfObjs[bingo_obj]["rotation_angle"], listOfObjs[bingo_obj]["x_amt"], listOfObjs[bingo_obj]["y_amt"],
                 listOfObjs[bingo_obj]["z_amt"]);
      for (var i = 0; i < listOfObjs.length; i++) {
        if (i != bingo_obj) {
          shouldClear = false;
          drawObject(listOfObjs[i]["vertarr"], listOfObjs[i]["pgons"], listOfObjs[i]["scale_factor"],
                     listOfObjs[i]["rotation_angle"], listOfObjs[i]["x_amt"], listOfObjs[i]["y_amt"],
                     listOfObjs[i]["z_amt"]);
        };
      };

    } else if (isMidDown_cam) { // moving camera along z
      shouldClear = true;
      cam_z_amt += event.wheelDelta / 1200;
      drawObject(listOfObjs[bingo_obj]["vertarr"], listOfObjs[bingo_obj]["pgons"], listOfObjs[bingo_obj]["scale_factor"],
                 listOfObjs[bingo_obj]["rotation_angle"], listOfObjs[bingo_obj]["x_amt"], listOfObjs[bingo_obj]["y_amt"],
                 listOfObjs[bingo_obj]["z_amt"]);
      for (var i = 0; i < listOfObjs.length; i++) {
        if (i != bingo_obj) {
          shouldClear = false;
          drawObject(listOfObjs[i]["vertarr"], listOfObjs[i]["pgons"], listOfObjs[i]["scale_factor"],
                     listOfObjs[i]["rotation_angle"], listOfObjs[i]["x_amt"], listOfObjs[i]["y_amt"],
                     listOfObjs[i]["z_amt"]);
        };
      };

    } else { // zooming

      FOV += event.wheelDelta / 120; // zoom based on how much they wheel
      gl.clearColor(.75, .75, .75, 1);
      gl.clear(gl.COLOR_BUFFER_BIT);
      shouldClear = false;
      for (var i = 0; i < listOfObjs.length; i++) {
        drawObject(listOfObjs[i]["vertarr"], listOfObjs[i]["pgons"], listOfObjs[i]["scale_factor"],
                   listOfObjs[i]["rotation_angle"], listOfObjs[i]["x_amt"], listOfObjs[i]["y_amt"],
                   listOfObjs[i]["z_amt"]);
      };
    };
  }, false);

  // stop moving along z, or zooming
  document.getElementById('webgl').addEventListener('mouseup', function() {
    if (event.button == 1) {
      isMidDown = false; // stop moving along z
      isMidDown_cam = false;
      shouldClear = false;
      for (var i = 0; i < listOfObjs.length; i++) {
        drawObject(listOfObjs[i]["vertarr"], listOfObjs[i]["pgons"], listOfObjs[i]["scale_factor"],
                   listOfObjs[i]["rotation_angle"], listOfObjs[i]["x_amt"], listOfObjs[i]["y_amt"],
                   listOfObjs[i]["z_amt"]);
      };
    };
  }, false);

  //left click down for translation
  document.getElementById('webgl').addEventListener('mousedown', function() {
    if (event.button == 0) {
      isLeftDown = true;
      init_x_left = event.clientX; // take down location of mousedown
      init_y_left = event.clientY;
      cam_init_x_left = event.clientX; // take down location of mousedown
      cam_init_y_left = event.clientY;
      // get pixel location
      var buf = new Uint8Array(gl.canvas.width * gl.canvas.height * 4);
      var x = event.layerX;
      var y = event.layerY;
      // get pixel color
      gl.readPixels(x, canvas.height - y, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, buf);
      var grey = Math.round(.75*255);
      //check if we've clicked the background
      if (buf[0] == grey && buf[1] == grey && buf[2] == grey && buf[3] == 255 ) {
        isBack = true;
      }
      else { // must've clicked the object
        isBack = false;
    };
  };

  }, false);

  document.getElementById('webgl').addEventListener('mousemove', function() {
    if (isLeftDown) {
      if (!isBack) { // translating
        shouldClear = true;
        listOfObjs[bingo_obj]["x_amt"] += event.clientX - init_x_left;
        listOfObjs[bingo_obj]["y_amt"] += event.clientY - init_y_left;
        drawObject(listOfObjs[bingo_obj]["vertarr"], listOfObjs[bingo_obj]["pgons"], listOfObjs[bingo_obj]["scale_factor"],
                   listOfObjs[bingo_obj]["rotation_angle"], listOfObjs[bingo_obj]["x_amt"], listOfObjs[bingo_obj]["y_amt"],
                   listOfObjs[bingo_obj]["z_amt"]);
        for (var i = 0; i < listOfObjs.length; i++) {
          if (i != bingo_obj) {
            shouldClear = false;
            drawObject(listOfObjs[i]["vertarr"], listOfObjs[i]["pgons"], listOfObjs[i]["scale_factor"],
                       listOfObjs[i]["rotation_angle"], listOfObjs[i]["x_amt"], listOfObjs[i]["y_amt"],
                       listOfObjs[i]["z_amt"]);
          };
        };
      } else { // panning
        gl.clearColor(.75, .75, .75, 1);
        gl.clear(gl.COLOR_BUFFER_BIT);
        cam_x_amt += event.clientX - cam_init_x_left;
        cam_y_amt += event.clientY - cam_init_y_left;
        for (var i = 0; i < listOfObjs.length; i++) {
          drawObject(listOfObjs[i]["vertarr"], listOfObjs[i]["pgons"], listOfObjs[i]["scale_factor"],
                     listOfObjs[i]["rotation_angle"], listOfObjs[i]["x_amt"], listOfObjs[i]["y_amt"],
                     listOfObjs[i]["z_amt"]);
        };
      };
    };
    cam_init_x_left = event.clientX;
    cam_init_y_left = event.clientY;
  }, false);

  // stop translating/panning
  document.getElementById('webgl').addEventListener('mouseup', function() {
    if (event.button == 0) {
      isLeftDown = false; // stop translating
      shouldClear = false;
      for (var i = 0; i < listOfObjs.length; i++) {
        drawObject(listOfObjs[i]["vertarr"], listOfObjs[i]["pgons"], listOfObjs[i]["scale_factor"],
                   listOfObjs[i]["rotation_angle"], listOfObjs[i]["x_amt"], listOfObjs[i]["y_amt"],
                   listOfObjs[i]["z_amt"]);
      };
    };
  }, false);


}; // end of main

/*
DrawObject()

vertarr: 2d array of vertices
pgons: 2d array of polygons
scale_factor: Some number to scale the object by
rotation_angle: Angle to rotate by (degrees)
x_amt: Amount to translate in the x direction
y_amt: Amount to translate in the y direction
z_amt: Amount to translate in the z direction
color_id: The color that the object appears in picking mode (randomly assigned when object is read in)
color_mode: Whether or not we are drawing in picking mode (if yes, give 1)

*/




function drawObject(vertarr, pgons, scale_factor, rotation_angle, x_amt, y_amt, z_amt,
                     color_id=255, color_mode=0) {

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
  console.log(triarr);
  console.log(triarr.length);

  console.log(pgons);



  var polynorms = getpolynorms(vertarr, pgons);
  console.log(polynorms);

  var vertnorms = getvertnorms(vertarr, pgons);

  var trinorms = get_trinorms(pgons, vertnorms);

  //console.log("pnorms", polynorms);
  //console.log("vnorms", vertnorms);
  //console.log("trinorms", trinorms);


  //get_trinorms();

  var cent = get_centroid(vertarr);
  //console.log("cent", cent);

  transform_mat.setOrtho(-1, 1, -1, 1, -1, 1);


  view_mat.setPerspective(FOV, 1, 1, 200);

  view_mat.lookAt(cam_x_amt / 50, cam_y_amt / 50, cam_z_amt, // LookFrom
                  cam_x_amt / 50 + yaw, cam_y_amt / 50 - pitch, cam_z_amt - 3, // LookAt
                  0, 1, 0); // Up Vector


  var maxdiff = get_maxdiff(vertarr);
  //console.log(maxdiff);

  transform_mat.setScale(scale_factor / maxdiff, scale_factor / maxdiff, scale_factor /maxdiff);

  transform_mat.rotate(rotation_angle, 0, 1, 0);

  // try putting this before scale
  transform_mat.translate(-cent[0]*scale_factor, -cent[1]*scale_factor, -cent[2]*scale_factor);

  transform_mat.translate(x_amt, -y_amt, z_amt * 50);


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
    console.log("passing", [polynorms[triarr[i+9]][0], polynorms[triarr[i+9]][1], polynorms[triarr[i+9]][2]]);
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
  var v3 = [];
  v3[0] = v1[0] - v2[0];
  v3[1] = v1[1] - v2[1];
  v3[2] = v1[2] - v2[2];
  return v3;
};

function vecadd(v1, v2) {
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


