var hintImage, stars, mouseIn; 

function preload() {  // preload() runs once
  hintImage = loadImage("processing/1.jpg"); 
}

function setup() {
  
  init();
  noCursor();   
  noStroke();
  
}

function draw() {
  //background(13,26,129); 
  background(13,26,10); 

  //if (mouseIsPressed) addStar();
  //canvas.mouseOver(addStar);
  mouseIn = false;
  if (mouseX > 0 && mouseX < width && mouseY>0 && mouseY<height) {
    mouseIn = true;
    addStar();
  }

  for (var i = 0; i < stars.length; i++) {
    stars[i].update();
    stars[i].draw();
  }

}

function addStar(){
  //console.log("draw that star@");
  var position = createVector(mouseX, mouseY);
  var target = findPixel();    
  target.x = target.x *(width/hintImage.width);
  target.y = target.y *(height/hintImage.height);
  var star = new Star(position, target);

  stars.push(star);
  if (stars.length > 2000) stars.shift();    
  
  
}

function windowResized() {
  init();
}

function init(){
  var widthNow = $("#p5-example").width();
  canvas = createCanvas(widthNow, widthNow*hintImage.height/hintImage.width);
  console.log(width, height,hintImage.width,hintImage.height);
  canvas.parent('p5-example');
  colorMode(HSB,widthNow)
  //background(200);
  stars = []
}


function findPixel() {
  var x, y;
  for (var i = 0; i < 15; i++) {
    x = floor(random(hintImage.width));
    y = floor(random(hintImage.height));  
    //console.log("r: "+red(hintImage.get(x,y))+" g: "+green(hintImage.get(x,y))+ " b: "+blue(hintImage.get(x,y))+" x "+x + " y "+y);
    //if (red(hintImage.get(x,y)) <255) {
    // console.log("b: "+brightness(hintImage.get(x,y)));
    if (brightness(hintImage.get(x,y)) <255) {
      
      break;  
    }
  }
  return createVector(x,y);
}
///----- STAR ------
function Star(position, target) {
  this.position = position;
  this.target = target;
  this.diameter = random(5, 10);

}

Star.prototype.update = function() {   
  this.position = p5.Vector.lerp(
    this.position,    	
    this.target,
    0.04
  );
};

Star.prototype.draw = function() { 
  var alpha = noise(
    this.target.x,
    this.target.y,
    millis()/1000.0
  );
  if(mouseIn)
    fill(width, alpha * width);
  else
    //fill((millis()/10-this.position.x)%width, width, width, alpha * width);
    fill((millis()/10-this.position.x/10)%width, width, width, alpha * width);
  
  ellipse(
    this.position.x, this.position.y,
    this.diameter, this.diameter
  );
};