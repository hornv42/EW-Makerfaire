// Hunt_Detail
// 2019.11.05
// Bill B
// IoT Scavenger Hunt 2019
// Used to create map of the user's travels.
// Need to enter session numer and user ID.
// May need to put focus on screen before entering value.
// Map will be created with user name and ID value.
// Will need to run program for each user.
// 
// Read-in data file
//===========================================================================
// Variables
//===========================================================================

PFont f;
JSONObject  json;

// Input Info ------------
boolean gotInput = false;

String enterSessionText = "Enter Session: ";
String sessionNo = "";
boolean gotSession = false;

String enterIDText = "Enter User ID: ";
String enterNo = "";
boolean gotID = false;

int userID;
String sUserID = "";

// Graphic Info ----------
String nickName = "ERROR";
int staID = 0;
int x, gx, px, sx;  // x=grid no., gx=graph no., px=previous no., sx=start no.
int y, gy, py, sy;  // y=grid no., gy=graph no., py=previous no., sy=start no.
int bn, pbn, sb;        // bn==building no., pbn=previous building no., start build no.
int b1X, b1Y, b2X, b2Y, b3X, b3Y; // building enterence / exits
int bbX, bbY;       // between builds point
int tmpX, tmpY;
boolean cor;
boolean firstSta = true;
float lineWt = 5;
int R = 0, G = 0, B = 250;        // color variables
boolean done = false;    // map complete

//===========================================================================
void setup() {
//===========================================================================
  f = createFont("Arial", 16);
  
 // Buildings exit info
 b1X = 118; b1Y = 101;
 b2X = 203; b2Y = 211;
 b3X = 315; b3Y = 308;
 bbX = 118; bbY = 105;
 
  // Setup background picture
  //size (608, 1080);
  size (812, 933);
  textFont(f);
 
 PImage image = loadImage("Buildings.png"); // create image picture object
 image(image,0,0,812,933);                 // Draws image to window
 
 textSize(20);
} 

//===========================================================================
void draw() {
//===========================================================================
 
   // -------------------------------------------------------
   // ----- Get Session and User ID before drawing info -----
   //        (see keyPressed() method below)
   // -------------------------------------------------------
 if (!(gotInput)) {
     fill(0);
     println("Entering Info ...");
     
     // Get Session No.: sessionNo
     if (!(gotSession)) {
       println("Session no: " + sessionNo);
       fill(250, 0, 0);
       text(enterSessionText + sessionNo, 20, 30);
     } else {
       println("Got Session");
       fill(230, 230, 230);
       text(enterSessionText + sessionNo, 20, 30);
     }
     
     // Get User ID No.: enterNo
     if (!(gotID)) {
       if (gotSession) {
         println("Enter ID: " + enterNo);
         fill(250, 0, 0);
         text(enterIDText + enterNo, 20, 50);
       }
     }
     
     // Got info, create map
     if (gotSession && gotID) {
       gotInput = true;
       fill(230, 230, 230);
       text(enterIDText + enterNo, 20, 50);
       println("... GOT Info ...\n");
     }
     delay(100);
   
 } else if (!done) {
   // -------------------------------------------------------
   // ----- Have Session and User ID, now draw info ---------
   // -------------------------------------------------------
   println("Creating map ...");
   // Remove input info
   enterSessionText = "";
   enterIDText = "";
   
   println("http://167.99.118.99:3000/userDetail/" + sessionNo + "/" + enterNo); 
   delay(1000);
   
   try {
     json = loadJSONObject("http://167.99.118.99:3000/userDetail/" + sessionNo + "/" + enterNo); 
     //json = loadJSONObject("./Test.json"); 
     //println(json);
     
     userID = json.getInt("userID");
     println(userID);
     
     nickName = json.getString("nickName");
     println(nickName);
     
     JSONArray stations = json.getJSONArray("stations");
     
     // --------------------------------------------------------------
     // Loop thru stations  ------------------------------------------
     // --------------------------------------------------------------
     for (int i = 0; i < stations.size(); i++) {
       
       JSONObject sta = stations.getJSONObject(i);
       
       staID = sta.getInt("stationID");
       x = sta.getInt("x_val");
       y = sta.getInt("y_val");
       
       if (sta.isNull("answer") == true){ //---- Did not find the station
         // Just draw circle at station's location
         println (staID + ", " + x + ", " + y);
         strokeWeight(3);
         stroke(245, 190, 60);
         graph_x(x);
         graph_y(y);
         circle(gx, gy, 10);
         
       } else {                          //---- Found the station
         // Draw color circle and connecting line
         JSONObject answer = sta.getJSONObject("answer");
         cor = answer.getBoolean("correct");
         println (staID + ", " + x + ", " + y + ", " + cor);
       
         // Get screen location from building locations
         graph_x(x);
         graph_y(y);
         println(gx + " - " + gy);
           
         // Set up the initial previous starting point
         if (firstSta) {
           firstSta = false;
           px = gx; py = gy;
           sx = gx; sy = gy;
           pbn = bn; sb = bn;
         }
       
         //---- Graphic stuff
         strokeWeight(3);
         if (cor) {
           stroke(0, 255, 0);
         } else {
           stroke(255, 0, 0);
         }
         circle(gx, gy, 10);
        
        // Change line color and weight over travel
         lineWt = lineWt - 0.3;     // vary line size
         strokeWeight(lineWt);
         R += 5; G += 5; B -= 5; // vary line color
         stroke(R, G, B);
         
         // Draw line between station, check if between buildings
         // ( p is for previous, bn is building number)
         if ( bn == pbn ) {  // ---- within same building
           line(px, py, gx, gy);
         } else {            
           tmpX = gx;  tmpY = gy;
           // ---- going between buildings
           betweenBuildings();
           gx = tmpX;  gy = tmpY;
         } // END drawing lines between buildings
           
         // Set previous value points
         px = gx;    py = gy;
         pbn = bn;
       
         // Label station 
         fill(50);
         textSize(16);
         text(str(staID), gx+10, gy);
       } // END Found the station
       
     } // End For loop of stations size
     // --------------------------------------------------------------
     
     // Back to the begining station
     if (sb == bn) {
       line(px, py, sx, sy);
     } else {
       println(" >> Back to Start Building <<");
       pbn = bn;
       bn = sb;
       gx = sx; gy = sy;
       betweenBuildings();
     }
     
     // Display name
     fill(204, 102, 0);
     textSize(64);
     text(nickName, 455, 550);
     
     // Save to file
     save(nickName+"_"+str(userID)+".png");
     
     // Catch TRY before looking for JSON info
     } catch (Exception e) {
       // catch (IOException e){
       // e.printStackTrace();
       println(">>>>>>>> ERROR <<<<<<<<<<");
       // Reset user input info
       //gotInput = false;
       //sUserID = "";
     }
     done = true; // end looping
     delay(1000);
   } // END gotInput ELSE section
   
} // END Draw

//===========================================================================
//     Additional Functions
//===========================================================================

void keyPressed() {
  
  // Type in ID number and then enter / return
  if (!gotID && gotSession) {
     if (key >= '0' && key <= '9') {
       enterNo += key;
       println("ID: " + enterNo + "  " + gotID);
     } else if (key == RETURN || key == ENTER) {
       println("............Got ID " + key);
       gotID = true;
      println("ID is " + enterNo + "  Got ID: " + gotID);
     }
  }

  // Type in Session number and then enter / return
  if (!gotSession) {
     if (key >= '0' && key <= '9') {
       sessionNo += key;
       println(sessionNo + "  " + gotSession);
     } else if (key == RETURN || key == ENTER) {
       println(".....Got Session " + key);
       gotSession = true;
       println("Session is: " + sessionNo + "  Got Session: " + gotSession);
       delay(500);
     }
  }
  
}

// --------------------------------------------------------------
void graph_x(int val){
  // Determine screen value X value
  
  int offset_x = 0;
  int grid_x = 0;
  int grid_no = 0;
  
  if (val > 300) {  
    // Building 300
    bn = 3;
    offset_x = 103;
    grid_x = 18;
    grid_no = val - 300;
    
  } else if (val > 200) {
    // Building 200
    bn = 2;
    offset_x = 213;
    grid_x = 19;
    grid_no = val - 200;
    
  } else if (val > 100) {
    // Building 100
    bn = 1;
    offset_x = 67;
    grid_x = 17;
    grid_no = val - 100;
  }
  gx = offset_x + (grid_no * grid_x);
}

// --------------------------------------------------------------
void graph_y(int val){
  // Determine screen value Y value
  
  int offset_y = 0;
  int grid_y = 0;
  int grid_no = 0;
  
  if (val > 300) {  
    // Building 300
    offset_y = 70;
    grid_y = 18;
    grid_no = val - 300;
    
  } else if (val > 200) {
    // Building 200
    offset_y = 300;
    grid_y = 18;
    grid_no = val - 200;
    
  } else if (val > 100) {
    // Building 100
    offset_y = 653;
    grid_y = 18;
    grid_no = val - 100;
  }
  gy = offset_y + (grid_no * grid_y);
}

// --------------------------------------------------------------
void betweenBuildings(){
     // Check and draw lines between buildings
     int gx1 = gx;
     int gy1 = gy;
     
       //------ Building ! to Building 2
       if ( pbn == 1 && bn == 2 ) { 
         println(" 1 to 2");
         graph_x(b1X); graph_y(b1Y);
         line(px, py, gx, gy); // to the door 1
         px = gx; py = gy;
         
         graph_x(bbX); graph_y(bbY);
         gy = gy - 150;
         line(px, py, gx, gy); // between building
         px = gx; py = gy;
         
         graph_x(b2X); graph_y(b2Y);
         line(px, py, gx, gy); // to the door 2
         px = gx; py = gy;
         
         line(px, py, gx1, gy1); // to the next point
         px = gx1; py = gy1;     // save previous values
       }
       
       //------ Building ! to Building 3
       if ( pbn == 1 && bn == 3 ) {
         println(" 1 to 3");
         graph_x(b1X); graph_y(b1Y);
         line(px, py, gx, gy); // to the door 1
         px = gx; py = gy;
         
         graph_x(bbX); graph_y(bbY);
         gy = gy - 150;
         line(px, py, gx, gy); // between building
         px = gx; py = gy;
         
         graph_x(b3X); graph_y(b3Y);
         line(px, py, gx, gy); // to the door 3
         px = gx; py = gy;
         
         line(px, py, gx1, gy1); // to the next point
         px = gx1; py = gy1;
       }
       
       //------ Building 2 to Building 1
       if ( pbn == 2 && bn == 1 ) {
         println(" 2 to 1");
         graph_x(b2X); graph_y(b2Y);
         line(px, py, gx, gy); // to the door 2
         px = gx; py = gy;
         
         graph_x(bbX); graph_y(bbY);
         gy = gy - 150;
         line(px, py, gx, gy); // between building
         px = gx; py = gy;
         
         graph_x(b1X); graph_y(b1Y);
         line(px, py, gx, gy); // to the door 1
         px = gx; py = gy;
         
         line(px, py, gx1, gy1); // to the next point
         px = gx1; py = gy1;
       }
       
       //------ Building 2 to Building 3
       if ( pbn == 2 && bn == 3 ) {
         println(" 2 to 3");
         graph_x(b2X); graph_y(b2Y);
         line(px, py, gx, gy); // to the door 2
         px = gx; py = gy;
         
         graph_x(bbX); graph_y(bbY);
         gy = gy - 150;
         line(px, py, gx, gy); // between building
         px = gx; py = gy;
         
         graph_x(b3X); graph_y(b3Y);
         line(px, py, gx, gy); // to the door 3
         px = gx; py = gy;
         
         line(px, py, gx1, gy1); // to the next point
         px = gx1; py = gy1;
       }
       
       //------ Building 3 to Building 1
       if ( pbn == 3 && bn == 1 ) {
         println(" 3 to 1");
         graph_x(b3X); graph_y(b3Y);
         line(px, py, gx, gy); // to the door 3
         px = gx; py = gy;
         
         graph_x(bbX); graph_y(bbY);
         gy = gy - 150;
         line(px, py, gx, gy); // between building
         px = gx; py = gy;
         
         graph_x(b1X); graph_y(b1Y);
         line(px, py, gx, gy); // to the door 1
         px = gx; py = gy;
         
         line(px, py, gx1, gy1); // to the next point
         px = gx1; py = gy1;
       }
       
       //------ Building 3 to Building 2
       if ( pbn == 3 && bn == 2 ) {
         println(" 3 to 2");
         graph_x(b3X); graph_y(b3Y);
         line(px, py, gx, gy); // to the door 3
         px = gx; py = gy;
         
         graph_x(bbX); graph_y(bbY);
         gy = gy - 150;
         line(px, py, gx, gy); // between building
         px = gx; py = gy;
         
         graph_x(b2X); graph_y(b2Y);
         line(px, py, gx, gy); // to the door 2
         px = gx; py = gy;
         
         line(px, py, gx1, gy1); // to the next point
         px = gx1; py = gy1;
       }
}
  
  
  
