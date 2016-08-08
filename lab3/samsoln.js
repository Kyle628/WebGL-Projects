var gl;
var transUniform ;
var viewMatLoc;
var projectMatLoc;
var newVertices; // this will contain only the vertices(indices discarded)
var uniformNormalLoc;
var amountOfLightLoc;
var extractedVerticesAndColor;
var noVertices;
var dynamic_index;
var noIndices;
var normalForFlat;
var isFlatLoc;
var cosThetaFlatLoc;
var cosPhiFlatLoc;
var makeFlat = 1;
var diffuseOnly = true;
var makeOrtho = true;
var verticesAndIntensity;
var normalMat;

//specular
var halfReflectH = new Float32Array([0,0,1]);
var shininess =0;

//view
var eyeX = 0.0;
var eyeY = 0.0;
var eyeZ = 0.0; //update this based on the object z size
var centerX = 0.0;
var centerY = 0.0;
var centerZ = 0.0;
var upX = 0.0;
var upY = 1.0;
var upZ = 0.0;
var pushDownZ = 4;

//perspective
var	fovy = 70; //degrees
var aspect = 1;
var near =0;
var far = 1000;




//write shader code

var V_SHADER =
'attribute vec3 a_position; \n' +
'uniform mat4 model; \n '+
'uniform mat4 projectMat; \n' +
'uniform mat4 viewMat; \n' +
'attribute float  a_cosTheta; \n' +
'attribute float  a_cosPhi; \n' +
'varying float cosTheta; \n'+
'varying float cosPhi; \n'+
'void main(){  \n' +
'cosTheta = a_cosTheta; \n' +
'cosPhi = a_cosPhi; \n' +
'vec4 mPosition = vec4(a_position ,1.0);'+
'mPosition = projectMat * viewMat * model *  mPosition; '+
'gl_Position =  mPosition;\n' +
'}\n'

var F_SHADER =
'precision mediump float; \n' +
'uniform vec3 specLightReflec; \n' +
'uniform vec3 objColor; \n' +
'uniform float I_d; \n' +
'uniform float k_d; \n' +
'uniform float amountOfLight; \n' +
'uniform float isFlat; \n' +
'uniform float cosThetaFlat; \n' +
'uniform float cosPhiFlat; \n' +
'varying float cosTheta; \n'+
'varying float cosPhi; \n'+
'void main() { \n' +
'vec3 specular; \n'+
'vec3 diffuse ; \n' +
'if(isFlat > 0.5) { \n'+
'specular = cosPhiFlat * specLightReflec; \n'+
'diffuse = I_d * k_d * cosThetaFlat * objColor; \n' +
'} \n' +
'else{ \n'+
' specular = cosPhi * specLightReflec; \n'+
' diffuse = I_d * k_d * cosTheta * objColor; \n' +
'} \n'+
'gl_FragColor = vec4((specular + diffuse) , 1.0); \n'+
'} \n'


//compile and link shader code
function compileShader(gl, shaderSource ,shaderType){

	//create the shader object
	var shaderObj = gl.createShader(shaderType);

	//link the shader object with the source
	gl.shaderSource(shaderObj, shaderSource);

	//compile the shader
	gl.compileShader(shaderObj);


	if(!(gl.getShaderParameter(shaderObj, gl.COMPILE_STATUS))){

		 throw (" could not compile shader: " + gl.getShaderInfoLog(shaderObj));

	}


	return shaderObj;

}


function createProgram( gl, vertexShader, fragmentShader){

	//create program
	var program = gl.createProgram();

	//attach program
	gl.attachShader(program, vertexShader);
	gl.attachShader(program, fragmentShader);


	//link the programs
	gl.linkProgram(program);

	if(!gl.getProgramParameter(program, gl.LINK_STATUS)){

		throw ("issue with linking programs: " + gl.getProgramInfoLog(program));
	}

	return program;

}

function main(){

//obtain canvas and webgl context
var canvas = document.getElementById('canvas');
 gl =  canvas.getContext("webgl");

//alow depth sensing
  gl.enable(gl.DEPTH_TEST);
  gl.depthFunc(gl.LESS);
//get shaders and program

//create shader
var vShader = compileShader(gl, V_SHADER, gl.VERTEX_SHADER);
var fShader = compileShader(gl, F_SHADER, gl.FRAGMENT_SHADER);

//create program
program = createProgram(gl, vShader, fShader);

//must set use program
gl.useProgram(program );

var testTriangle = new Float32Array([ 0, 0, 0  , 10, 50 ,0 ,  50, 0 ,0]);

//create buffer
var vertexBuffer = gl.createBuffer(); // this is just a buffer objecr

//bind the buffer to be used for vertices
gl.bindBuffer(gl.ARRAY_BUFFER , vertexBuffer);

//also create index buffer and bind


var indexBuffer= gl.createBuffer();

//bind it to index buffer
gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
//now we can send indices to this buffer. The only thing left now is to call the appropriate draw function

//now tell the a_position in vertex shader to know where to get vertices
var a_position = gl.getAttribLocation(program , "a_position");

if (a_position < 0) {
    console.log('Failed to get the storage location of a_Position');
    return -1;
  }
//must enable this location before using it... Yes the vertex attribute can be thought of as an array
gl.enableVertexAttribArray(a_position);
gl.vertexAttribPointer(a_position, 3, gl.FLOAT, false, 20, 0); // This simply says we want 3 components

//set color attribute
var a_cosTheta = gl.getAttribLocation(program , "a_cosTheta");
var a_cosPhi = gl.getAttribLocation(program , "a_cosPhi");

if (a_cosTheta < 0) {
    console.log('Failed to get the storage location of a_Position');
    return -1;
  }

if (a_cosPhi < 0) {
    console.log('Failed to get the storage location of a_Position');
    return -1;
  }
//must enable this location before using it... Yes the vertex attribute can be thought of as an array
gl.enableVertexAttribArray(a_cosTheta);
gl.vertexAttribPointer(a_cosTheta, 1, gl.FLOAT, false, 20, 12); // This simply says we want 1 component

gl.enableVertexAttribArray(a_cosPhi);
gl.vertexAttribPointer(a_cosPhi, 1, gl.FLOAT, false, 20, 16); // This simply says we want 1 component

//obtain my new uniform
modelUniform  = gl.getUniformLocation(program, 'model');

projectMatLoc = gl.getUniformLocation(program, 'projectMat');

viewMatLoc = gl.getUniformLocation(program, 'viewMat');

//uniformNormalLoc = gl.getUniformLocation(program, 'faceNormal');

colorLocation = gl.getUniformLocation(program, 'objColor');
gl.uniform3f(colorLocation, 0.0,0.0,1.0);

//get and set specular light
var specLightReflecLoc = gl.getUniformLocation(program, 'specLightReflec');

var specLight = new Float32Array([1.0,0.0,0.0]);
var specCoeff = new Float32Array([0.5,0.5,0.5]);



gl.uniform3f(specLightReflecLoc, specLight[0]*specCoeff[0] ,specLight[1] * specCoeff[1],specLight[1] * specCoeff[1]);


var I_d = gl.getUniformLocation(program,'I_d');
gl.uniform1f(I_d, 1.0);


var k_d = gl.getUniformLocation(program,'k_d');
gl.uniform1f(k_d, 1.0);

//setup info for flat shading
cosThetaFlatLoc = gl.getUniformLocation(program, 'cosThetaFlat');
cosPhiFlatLoc = gl.getUniformLocation(program, 'cosPhiFlat');
isFlatLoc = gl.getUniformLocation(program, 'isFlat');


//get location of light and set the value... we know the light direction
amountOfLightLoc = gl.getUniformLocation(program, 'amountOfLight');

//set the value to 0,0,1.. since we'll be working with the reverse of this direction for the purpose of the calculation, we send this in
//gl.uniform3f(lightDirLoc , 0,0,1);

gl.clearColor(0.5,0.5, 0.0, 1);
gl.clearDepth(1.0);
gl.clear(gl.COLOR_BUFFER_BIT | gl.COLOR_BUFFER_BIT);

//gl.drawArrays(gl.TRIANGLES, 0, 3); // now using the vertex attribute array created... draw chunks as specified from the vertex buffer object

}


function setShininess(shininessVal){

	shininess = +shininessVal.value;
	render(makeFlat);
}


function setProjection(myRadio){

var projectionVal = +myRadio.value;

	if(projectionVal == 0 && makeOrtho){
	return;
	}
	if(projectionVal == 1 && !(makeOrtho)){
	return;
	}
	if(projectionVal == 0 && !(makeOrtho)){
	makeOrtho = true;
	render(makeFlat);
	return;
	}
	if(projectionVal == 1 && makeOrtho){
	makeOrtho = false;
	render(makeFlat);
	return;
	}

}

function setDiffuse(diffuseVal){

var diffusseVal = diffuseVal.checked;

	if(diffusseVal && diffuseOnly){
	return;
	}
	if(diffusseVal  && !(diffuseOnly)){
		diffuseOnly = true;
		render(makeFlat);
	return;
	}
	if(!(diffusseVal)  && !(diffuseOnly)){
	return;
	}
	if(!(diffusseVal)  && diffuseOnly){
		diffuseOnly = false;
		render(makeFlat);
	return;
	}
}

function setShaderAlgo(shaderType){

	var shaderVal = +shaderType.value;

	if(shaderVal == 0 && makeFlat ==1 ){
	return;
	}
	if(shaderVal == 1 && makeFlat == 0){
	return;
	}
	if(shaderVal == 0 && makeFlat == 0){
	makeFlat = 1;
	render(makeFlat);
	return;
	}
	if(shaderVal == 1 && makeFlat == 1){
	makeFlat = 0;
	render(makeFlat);
	return;
	}
}

function createModel(minMaxXYZ){

		minX = minMaxXYZ[0];
		maxX = minMaxXYZ[1];
		minY = minMaxXYZ[2];
		maxY = minMaxXYZ[3];
		minZ = minMaxXYZ[4];
		maxZ = minMaxXYZ[5];
	    translationMat = new Matrix4();

	    translationMat.setTranslate(-(minMaxXYZ[1] + minMaxXYZ[0])/2  , -(minMaxXYZ[3] + minMaxXYZ[2])/2 , -(minMaxXYZ[5] + minMaxXYZ[4])/2 );

		return translationMat;

}


function getDivisor(minMaxXYZ){


	diffX = minMaxXYZ[1] - minMaxXYZ[0];
	diffY = minMaxXYZ[3] - minMaxXYZ[2];
	diffZ = minMaxXYZ[5] - minMaxXYZ[4];


	var divisor = Math.max(Math.max(diffX, diffY), diffZ);

	return divisor;
}


function getFrustrum(minMaxXYZ){

	//to preserve aspect Ratio we use the maximum


	diffX = minMaxXYZ[1] - minMaxXYZ[0];
	diffY = minMaxXYZ[3] - minMaxXYZ[2];
	diffZ = minMaxXYZ[5] - minMaxXYZ[4];

	var maxDiff =  Math.max(Math.max(diffX, diffY), diffZ);
	var minVol =0;
	var maxVol =0;

	switch(maxDiff){

		case diffX:
			minVol = -diffX / 2 ;
			maxVol =  diffX / 2 ;
		break;

		case diffY:
			minVol = -diffY / 2 ;
			maxVol =  diffY / 2 ;

			break;

		case diffZ:
			minVol = -diffZ / 2 ;
			maxVol =  diffZ / 2 ;

			break;

	}

	//we define the bounding box based on the maximum difference and then translate it

	return new Float32Array([minVol, maxVol]);
}


//we use the javascript for each function

function fileReadFunc(){
			var polyFile;
			var coorFile;
			var file1 = document.getElementById("fileReadInput").files[0];
			var file2 = document.getElementById("fileReadInput").files[1];

		//check for undefined
			if(!file2 || !file1){

				throw "two files required";
			}

			var fileExt1 = file1.name.split('.').pop();
			var fileExt2 = file2.name.split('.').pop();

		//quick validity check
			if(fileExt1.charAt(0) == 'c' && fileExt2.charAt(0) != 'p') throw "we need file with poly and coor extension"
			if(fileExt1.charAt(0) == 'p' && fileExt2.charAt(0) != 'c') throw "we need file with poly and coor extension"
			if(fileExt1.charAt(0) != 'c' && fileExt2.charAt(0) != 'c') throw "we need file with poly and coor extension"
			if(fileExt1.charAt(0) != 'p' && fileExt2.charAt(0) != 'p') throw "we need file with poly and coor extension"

			//assume ccor file is file 1 and polyfile is file 2
			coorFile = file1;
			polyFile = file2;

			//swap assumption
			if(fileExt1.charAt(0) == 'p') {

				polyFile = file1;
				coorFile = file2;
		}

/*********************************** COOR FILE ************************************/
			cReader = new FileReader();

				//after the read is complete we need to call the onload function.. ensure it has finished loading before trying to use it
				cReader.onload = function(){
				//get all lines and store in array
				var dynamic_vertex = cReader.result.match(/[+-]?\d+(\.\d+)?/g);


				noVertices = dynamic_vertex.shift();

				//wait and ensure prevous file has been read

				extractedVerticesAndColor = Float32Array.from(dynamic_vertex);

				minMaxXYZ = getMinMaxXYZ(extractedVerticesAndColor, noVertices);
				//send for translation
				translationMat = createModel(minMaxXYZ);
				gl.uniformMatrix4fv(modelUniform, false, translationMat.elements);

/*********************************** POLY FILE --Contained in onload of .COOR file, as it needs data from it ************************************/

			pReader = new FileReader();

			//after the read is complete we need to call the onload function.. ensure it has finished loading before trying to use it
			pReader.onload = function(){
				//get all lines and store in array

			 dynamic_index = pReader.result.split('\n');

			 noIndices = dynamic_index[0];

			//declare and initialize normal matrix
			normalMat = new Float32Array(newVertices.length);
			normalMat.fill(0.0);

			//initialize array for flat shading normals
			normalForFlat = new Float32Array(noIndices * 3);

			//new implementation
		for(var j = 1; j <=noIndices; j++){


			//get the extracted inidices
			var extractedSplit = dynamic_index[j].match(/\s\d+/g);//.split(" ");

			var greaterThan3 = false;

			if(extractedSplit.length > 3){
			greaterThan3 =  true;
			extractedSplit.push("0");

		}
			var extractedIndices = Uint16Array.from(extractedSplit);

			//do the shift
			for(var i =0; i < extractedIndices.length ; i++){

				extractedIndices[i] = extractedIndices[i]-1;

			}

			if(greaterThan3){
			extractedIndices[extractedIndices.length - 1] = extractedIndices[0];
		}

				faceNormal = getFaceNormal(extractedIndices, newVertices);
				var actInd = (j-1)*3;
				//store this normal for the face
				normalForFlat[actInd] = faceNormal[0];
				normalForFlat[actInd + 1] = faceNormal[1];
				normalForFlat[actInd + 2] = faceNormal[2];

				//for each of the faces of the polygon add up the normals correspoding to the vertices
				for(var p = 0; p< extractedIndices.length; p++){

					var p3 = extractedIndices[p]*3;

					normalMat[p3] 	+= faceNormal[0];
					normalMat[p3+1] += faceNormal[1];
					normalMat[p3+2] += faceNormal[2];

				}

		}

		//create new array to have the correct information
		 verticesAndIntensity = new Float32Array(newVertices.length + 2 * (newVertices.length/3) );

		var m =0;
		for(var p = 0; p < verticesAndIntensity.length; p+=5 ){

			verticesAndIntensity[p] = 	newVertices[m];
			verticesAndIntensity[p+1] = newVertices[m+1];
			verticesAndIntensity[p+2] = newVertices[m+2];

			var normalizedVecParameter = normalizeVec3(normalMat[m],normalMat[m+1],normalMat[m+2]);
			var NdotH = normalizedVecParameter[0]* halfReflectH[0] + normalizedVecParameter[1]*halfReflectH[1] + normalizedVecParameter[2]*halfReflectH[2];

			verticesAndIntensity[p+3] = Math.max(normalizedVecParameter[2], 0); // the dot product leads to only the z

			if(!diffuseOnly){
			verticesAndIntensity[p+4] = Math.max(Math.pow(NdotH, shininess) , 0);
			}
			else{

				verticesAndIntensity[p+4] = 0;
			}

			m+=3;
		}

		//send into out buffer
		gl.bufferData(gl.ARRAY_BUFFER, verticesAndIntensity, gl.STATIC_DRAW);

		render(makeFlat);

	}

			//read the text file
			pReader.readAsText(polyFile);


}

			//read the text file
			cReader.readAsText(coorFile);

}


function render(isFlat){

	//initialize isFlat to false
	gl.uniform1f(isFlatLoc, makeFlat);

	//ortho
	var authoParameter = getFrustrum(minMaxXYZ);

	//set projection
		if(makeOrtho){

			//set identity for the view matrix
			var viewMat = new Matrix4();
			viewMat.setIdentity();
			gl.uniformMatrix4fv(viewMatLoc, false, viewMat.elements);

			var orthoMat = new Matrix4();
			orthoMat.setOrtho(authoParameter[0], authoParameter[1], authoParameter[0], authoParameter[1], authoParameter[0], authoParameter[1]);
		    gl.uniformMatrix4fv(projectMatLoc, false, orthoMat.elements);

		}else{

			//view
			//update eyeZ based on the object's new max Z after translation------------ Correct this for Perspective to work...//
			//eyeZ = ??;
			var viewMat = new Matrix4();
			viewMat.setLookAt(eyeX, eyeY, eyeZ, centerX, centerY, centerZ, upX, upY, upZ);
			gl.uniformMatrix4fv(viewMatLoc, false, viewMat.elements);


			//perspective
			var  persMat = new Matrix4();
			//we have to determine near and far based on where the user is
			persMat.setPerspective(fovy, aspect, 1, far)

			gl.uniformMatrix4fv(projectMatLoc, false, persMat.elements);
		}


	//flat shading
	if(isFlat > 0.5){


	var m;
	var normalizedVecParameter;
	var cosThetaUniformVal;
	var cosPhiUniformVal;

			for(var j = 1; j <=noIndices; j++){


			//get the extracted inidices
			var extractedSplit = dynamic_index[j].match(/\s\d+/g);//.split(" ");

			var greaterThan3 = false;

			if(extractedSplit.length > 3){
			greaterThan3 =  true;
			extractedSplit.push("0");

		}
			var extractedIndices = Uint16Array.from(extractedSplit);

			//do the shift
			for(var i =0; i < extractedIndices.length ; i++){

				extractedIndices[i] = extractedIndices[i]-1;

			}

			if(greaterThan3){
			extractedIndices[extractedIndices.length - 1] = extractedIndices[0];
		}
				 m = (j-1)*3;

				 normalizedVecParameter = new Float32Array([normalForFlat[m],normalForFlat[m+1],normalForFlat[m+2]]);
				 NdotH = normalizedVecParameter[0]* halfReflectH[0] + normalizedVecParameter[1]*halfReflectH[1] + normalizedVecParameter[2]*halfReflectH[2];


				 cosThetaUniformVal = Math.max(normalizedVecParameter[2], 0); // the dot product leads to only the z

				 if(!diffuseOnly){
				 cosPhiUniformVal = Math.max(Math.pow(NdotH, shininess) , 0);
				}
				else{
					cosPhiUniformVal = 0;
				}

				//send color scale into uniform
				gl.uniform1f(cosThetaFlatLoc , Math.max(cosThetaUniformVal, 0)); // z component muliplied by 1, others are zer0
				gl.uniform1f(cosPhiFlatLoc , Math.max(cosPhiUniformVal, 0)); // z component muliplied by 1, others are zer0

				//Send vertex index to be drawn
				gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,extractedIndices, gl.STATIC_DRAW);

        console.log(extractedIndices);
				//draw data
			    gl.drawElements(gl.TRIANGLE_STRIP, extractedIndices.length, gl.UNSIGNED_SHORT, 0);



		}


	}else{//smooth shading

		var m =0;
		for(var p = 4; p < verticesAndIntensity.length; p+=5 ){

			var normalizedVecParameter = normalizeVec3(normalMat[m],normalMat[m+1],normalMat[m+2]);
			var NdotH = normalizedVecParameter[0]* halfReflectH[0] + normalizedVecParameter[1]*halfReflectH[1] + normalizedVecParameter[2]*halfReflectH[2];

			if(!diffuseOnly){
			verticesAndIntensity[p] = Math.max(Math.pow(NdotH, shininess) , 0);
			}
			else{

			verticesAndIntensity[p] = 0;

			}

			m+=3;
		}

		//send into out buffer
		gl.bufferData(gl.ARRAY_BUFFER, verticesAndIntensity, gl.STATIC_DRAW);

		//now reprocess for drawing per vertex
		for(var j = 1; j <=noIndices; j++){


			//get the extracted inidices
			var extractedSplit = dynamic_index[j].match(/\s\d+/g);//.split(" ");

			var greaterThan3 = false;

			if(extractedSplit.length > 3){
			greaterThan3 =  true;
			extractedSplit.push("0");

		}
			var extractedIndices = Uint16Array.from(extractedSplit);

			//do the shift
			for(var i =0; i < extractedIndices.length ; i++){

				extractedIndices[i] = extractedIndices[i]-1;

			}

			if(greaterThan3){
			extractedIndices[extractedIndices.length - 1] = extractedIndices[0];
		}


				//Send vertex index to be drawn
				gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,extractedIndices, gl.STATIC_DRAW);


				//draw data
			    gl.drawElements(gl.TRIANGLE_STRIP, extractedIndices.length, gl.UNSIGNED_SHORT, 0);



		}



	}



}

function getFaceNormal(tempIndexArray, extractedVertices){

	var vertexIndexXYZ1 = tempIndexArray[0] * 3;
    var vertexIndexXYZ2 = tempIndexArray[1] * 3;
    var vertexIndexXYZ3 = tempIndexArray[2] * 3;


	var Ax = extractedVertices[vertexIndexXYZ1];
	var Ay = extractedVertices[vertexIndexXYZ1 + 1];
	var Az = extractedVertices[vertexIndexXYZ1 + 2];

	var Bx = extractedVertices[vertexIndexXYZ2];
	var By = extractedVertices[vertexIndexXYZ2 + 1];
	var Bz = extractedVertices[vertexIndexXYZ2 + 2];


	var Cx = extractedVertices[vertexIndexXYZ3];
	var Cy = extractedVertices[vertexIndexXYZ3 + 1];
	var Cz = extractedVertices[vertexIndexXYZ3 + 2];


	//B-A
	var BAx = Bx - Ax;
	var BAy = By - Ay;
	var BAz = Bz - Az;

	//C-A
	var CAx = Cx - Ax;
	var CAy = Cy - Ay;
	var CAz = Cz - Az;



//A-B
	var ABx = Ax - Bx;
	var ABy = Ay - By;
	var ABz = Az - Bz;

	//C-B
	var CBx = Cx - Bx;
	var CBy = Cy - By;
	var CBz = Cz - Bz;

/*
	//(B-A)  X (C-A) => BA  X  CA

	var nX = BAy * CAz - BAz * CAy;
	var nY = BAz * CAx - BAx * CAz;
	var nZ = BAx * CAy - BAy * CAx;
	*
	* */
	//C-B X B-A

	var nX = CBy * ABz - CBz * ABy;
	var nY = CBz * ABx - CBx * ABz;
	var nZ = CBx * ABy - CBy * ABx;

	//console.log("^^" + BAx + "^^" + BAy + "^^" + BAz);
	//console.log("^^" + CAx + "^^" + CAy + "^^" + CAz);
	//console.log("^^" + nX + "^^" + nY + "^^" + nZ);

	//get magnitude of the normal
	var mag = Math.sqrt(nX*nX + nY*nY + nZ*nZ);


	//normalize
	nX = nX/mag;
	nY = nY/mag;
	nZ = nZ/mag;



	faceNormal = new Float32Array([nX, nY, nZ]);

	return faceNormal;


}

function normalizeVec3(nX, nY, nZ){

	var mag = Math.sqrt(nX*nX + nY*nY + nZ*nZ);

	//normalize
	nX = nX/mag;
	nY = nY/mag;
	nZ = nZ/mag;

	var normalized = new Float32Array([nX, nY, nZ]);

	return normalized;
}

function getMinMaxXYZ(verticesArray , noVertices){

	newVertices = new Float32Array(verticesArray.length - noVertices); // discard the preceding indices

	var minX;
	var maxX;
	var minY;
	var maxY;
	var minZ;
	var maxZ;

	minX = verticesArray[1];
	maxX = minX;
	minY = verticesArray[2];
	maxY = minY;
	minZ = verticesArray[3];
	maxZ = minZ;
	var i=3;

	newVertices[0] = minX;
	newVertices[1] = minY;
	newVertices[2] = minZ;



	var j=2;

	while( ++i< verticesArray.length){ //discard the vertex index number


		var xLocal = verticesArray[++i] //x
		var yLocal = verticesArray[++i] //y
		var zLocal = verticesArray[++i] //z

	//allocate values for the new vertices
	newVertices[++j] = xLocal;
	newVertices[++j] = yLocal;
	newVertices[++j] = zLocal;


	//check for minmx
	if(xLocal < minX) minX = xLocal;
	if(yLocal < minY) minY = yLocal;
	if(zLocal < minZ) minZ = zLocal;

	if(xLocal > maxX) maxX = xLocal;
	if(yLocal > maxY) maxY = yLocal;
	if(zLocal > maxZ) maxZ = zLocal;

	}

	var	minMaxXYZ = new Float32Array([ minX, maxX, minY, maxY, minZ, maxZ ]);

	return minMaxXYZ;

}
