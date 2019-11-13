// Hunt_Status_02
// 2019.11.05
// Bill B
// IoT Scavenger Hunt 2019
// Used to create HTML file with leader board info
// (May need to put focus on window before entering session no.)
// (Press Enter/Return after entering session no.)
// ToDO: add Try/Catch for errors.

// Read-in data file
JSONArray values;

int userID;
String nickName;
int numCorrect;
int numIncorrect;

PrintWriter output;

String enterSessionText = "Enter Session: ";
String sessionNo = "";
boolean gotSession = false;

int updateSeconds = 20000;


//===========================================================================
void setup() {
//===========================================================================
  size(400, 100);
  fill(0);
  textSize(20);
}

//===========================================================================
void draw() {
//===========================================================================
  // Get session number before leader board info
  if (!(gotSession)) {
       fill(250, 0, 0);
       text(enterSessionText + sessionNo, 20, 30);
       fill(0, 0, 200);
       text("File will be 'ResultsHTML.html'", 20, 60);
       text(" ( Updated every " + updateSeconds/1000 + " seconds.)", 20, 90);
  } else {
     values = loadJSONArray("http://167.99.118.99:3000/leaderBoard/" + sessionNo);
     
     output = createWriter("./ResultsHTML.html");
     //output = createWriter("../../Power Point Stuff/ResultsHTML.html");
     
     output.println("<!DOCTYPE html>");
     output.println("<html>");
     output.println("<head>");
     output.println("<link rel='stylesheet' type='text/css' href='style.css'>");
     output.println("<META HTTP-EQUIV=\"refresh\" CONTENT=\"15\" >");
     output.println("</head>");
     output.println("<body>");
     
     for (int i = 0; i < values.size(); i++) {
       
       JSONObject ans = values.getJSONObject(i);
       
       userID = ans.getInt("userID");
       nickName = ans.getString("nickName");
       numCorrect = ans.getInt("numCorrect");
       numIncorrect = ans.getInt("numIncorrect");
       
       output.println ("<p>"+nickName+" ("+userID+") </p>");
       //output.println ("<p>"+nickName+" ("+userID+") Correct: "+numCorrect+"  InCorrect: "+numIncorrect+"</p>");
     }
     output.println("</body>");
     output.println("</html>");
    
     output.flush();
     output.close();
     
     delay(updateSeconds);
  }
}

//===========================================================================
//     Additional Functions
//===========================================================================

void keyPressed() {
  
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
