var FSHADER_SOURCE =
  'precision mediump float;\n' +
  'uniform vec4 mycolor;\n' +
  'uniform vec3 norm;\n' +
  'varying vec4 varycolor;\n' +
  'bool flatshade = true;\n' +
  'void main() {\n' +
  '  vec3 light = vec3(0, 0, 1);\n' +
  '  float intensity = dot(light, normalize(norm));\n' +
  '  if (flatshade) {\n' +
  '    gl_FragColor = mycolor * intensity;\n' +
  '  } else {\n' +
  '      gl_FragColor = varycolor;\n' +
  '}\n';