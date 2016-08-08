function main() {
  document.getElementById('file').addEventListener('change', readfiles, false);
};

function readfiles(event) {
  //call this function when user uploads a file

  var file1 = event.target.files[0];

  var reader = new FileReader();
  reader.onload = function(progressEvent){

    // line by line
    var vertarr = this.result.split('\n');

    for(var line = 1; line < vertarr.length; line++){
      vertarr[line] = vertarr[line].split(',').map(parseFloat);
    };

    var file2 = event.target.files[1];

    var preader = new FileReader();

    preader.onload = function(progressEvent) {

      // line by line
      var pgons = this.result.split('\n');
      //each line in lines
      for (var pgon = 1; pgon < pgons.length; line++) {
        pgons[pgon] = pgons[pgon].split(' ');
        pgons[pgon].shift();
        // each element in line
        for (var i = 0; i < pgons[pgon].length; i++) {
          pgons[pgon][i] = parseFloat(pgons[pgon][i]);
          //console.log(pgons[pgon][i]);
        };
      };
      console.log(pgons[0][0]);
      console.log(vertarr[0][0]);

    };
    preader.readAsText(file2);

    //console.log(vertarr[0][0]);
  };

  reader.readAsText(file1);
};


