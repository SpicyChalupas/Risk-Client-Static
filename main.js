// As a user, I want to enter my age, height (in feet and inches), weight (lbs), 
// blood pressure, and family history so that I can receive a personalized risk calculation.

// replace this after the server is deployed - Lines from 4 to 24 was copied from index.html
  const API_BASE = "https://risk-server-app-guegc2fng6dza0a6.centralus-01.azurewebsites.net/";

  const statusEl = document.getElementById("status");
  const pingBtn = document.getElementById("ping");
  
  const calcBtn = document.getElementById("calculate");
  const resultEl = document.getElementById("result");
  const messageBox = document.getElementById("message");

  async function ping() {
  statusEl.textContent = "checking...";
  try {
    const res = await fetch(`${API_BASE}/api/ping`, { cache: "no-store" });
    const data = await res.json();
    statusEl.innerHTML = `<span class="ok">ok</span> — ${new Date(data.now).toLocaleString()} (uptime ${data.uptimeSeconds}s)`;
  } catch (e) {
    statusEl.innerHTML = `<span class="bad">server not reachable</span>`;
    console.error(e);
  }
}
// wake server on load, and allow manual ping
  window.addEventListener("load", ping);
  pingBtn.addEventListener("click", ping);

calcBtn.addEventListener("click", () => {
  let riskScore = 0;

// Get users information and calculate risk score
  const name = document.getElementById("name").value.trim();
  const age = parseInt(document.getElementById("age").value);
  const heightFeet = parseInt(document.getElementById("feet").value);
  const heightInches = parseInt(document.getElementById("inches").value);
  const weight = parseInt(document.getElementById("pounds").value);
  const bloodPressure = document.getElementById("bloodPressure").value.trim();
  const family = document.getElementById("family").value.trim();

// Make sure all fields are filled out
  if (!name || isNaN(age) || isNaN(heightFeet) || isNaN(heightInches) || isNaN(weight) || !bloodPressure || !family) {
    resultEl.innerHTML = "<p>Please fill all required info.</p>";
    return;
  }

// Print this while user confirms their info
  resultEl.innerHTML = `We're calculating your results...`;

// Age risk factor
  if (age < 30) {
    riskScore = 0;
  } else if (age <= 45) {
    riskScore += 10;
  } else if (age <= 60) {
    riskScore += 20;
  } else {
    riskScore += 30;
  }
 
// Height and weight risk factor (BMI)
  const heightInInches = (heightFeet * 12) + heightInches;
  const weightInKg = weight * 0.453592;
  const heightInMeters = heightInInches * 0.0254;
  const bmi = weightInKg / (heightInMeters * heightInMeters);
  if (bmi >= 18.5 && bmi <= 24.9) { // normal
    riskScore += 0;
  } else if (bmi >= 25 && bmi <= 29.9) { // overweight
    riskScore += 30;
  } else if (bmi >= 30 && bmi <= 34.9) { // obese
    riskScore += 75;
  } else if (bmi >= 35) { // very obese
    riskScore += 100;
  }

// Blood pressure risk factor
  const [systolic, diastolic] = bloodPressure.split("/").map(Number);
  if (systolic < 120 && diastolic < 80) { // normal
    riskScore += 0;
  } else if (systolic >= 120 && systolic <= 129 && diastolic < 80) { // elevated
    riskScore += 15;
  } else if (systolic >= 130 && systolic < 139 || diastolic >= 80 && diastolic <= 89) { // High blood pressure stage 1
    riskScore += 30;
  } else if (systolic >= 140 || diastolic >= 90) { // High blood pressure stage 2
    riskScore += 75;
  } else if (systolic >= 180 || diastolic > 120) { // Hypertensive crisis
    riskScore += 100;
  }

// Family history risk factor
  const familyHistory = family.toLowerCase(); // Each listed condition adds 10 points to the risk score
  if (familyHistory.toLowerCase().includes("diabetes")) {
    riskScore += 10;
  } 
  if (familyHistory.toLowerCase().includes("cancer")) {
    riskScore += 10;
  } 
  if (familyHistory.toLowerCase().includes("alzheimers")) {
    riskScore += 10;
  } 
  if (familyHistory.toLowerCase().includes("none") || familyHistory.toLowerCase().includes("no")) {
    riskScore += 0;
  }

// Results from the risk score calculation
  let message = "";
  if (riskScore <= 20) {
    message = "Seems like we can offer the best coverage plan for you, " + name + "!";
  } else if (riskScore <= 50) {
    message = "We can offer you a standard coverage plan, " + name + ".";
  } else if (riskScore <= 75) {
    message = "The best we can offer you " + name + " is our basic coverage plan.";
  } else if (riskScore > 75) {
    message = "Unfortunately, we cannot offer you any coverage at this time, " + name + ". Hopefully in the future we can!";
  }
const reviewSummary = 
`Please confirm your answers below:

Name: ${name}
Age: ${age}
Height: ${heightFeet}'${heightInches}"
Weight: ${weight} lbs
Blood Pressure: ${bloodPressure}
Family History: ${family}

Your BMI: ${bmi}
Are these answers correct (yes/no)? `;

  messageBox.value = reviewSummary;

  function handleConfirmation() {
  const confirmation = messageBox.value.trim().toLowerCase(); // Get lowercase version of whatever is users input
    if (confirmation.endsWith("yes")) {
      resultEl.innerHTML = `Score: <b>${riskScore}</b><br>${message}`; // Display risk score and message
    } else if (confirmation.endsWith("no")) {
      resultEl.innerHTML = `<p>Review and update your answers, then click Submit again.</p>`;
    }
  }
  messageBox.addEventListener("input", handleConfirmation); // Confirms user's response to yes/no
});
 