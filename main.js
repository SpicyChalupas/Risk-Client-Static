// ==== Configure API base ====
// For local dev:  const API_BASE = "http://localhost:3000";
// For Azure:      const API_BASE = "https://<your-azure-appservice>.azurewebsites.net";
const API_BASE = (window.API_BASE_OVERRIDE || "https://risk-server-app-guegc2fng6dza0a6.centralus-01.azurewebsites.net/");

const els = {
  status: document.getElementById("status"),
  pingBtn: document.getElementById("ping"),
  name: document.getElementById("name"),
  age: document.getElementById("age"),
  feet: document.getElementById("feet"),
  inches: document.getElementById("inches"),
  pounds: document.getElementById("pounds"),
  bloodPressure: document.getElementById("bloodPressure"),
  family: document.getElementById("family"),
  message: document.getElementById("message"),
  errors: document.getElementById("errors"),
  submit: document.getElementById("calculate"),
  result: document.getElementById("result"),
};

function setStatus(html) { els.status.innerHTML = html; }

async function ping() {
  setStatus("checking…");
  try {
    const res = await fetch(`${API_BASE}/api/ping`, { cache: "no-store" });
    const data = await res.json();
    setStatus(`<span class="ok">ok</span> — ${new Date(data.now).toLocaleString()} (uptime ${data.uptimeSeconds}s)`);
  } catch (e) {
    console.error(e);
    setStatus(`<span class="bad">server not reachable</span>`);
  }
}

function clearErrors() {
  els.errors.innerHTML = "";
  [els.name, els.age, els.feet, els.inches, els.pounds, els.bloodPressure, els.family]
    .forEach(el => el.classList.remove("error"));
}

function showErrors(map) {
  const first = Object.keys(map)[0];
  els.errors.innerHTML = `<ul>${Object.entries(map).map(([k,v]) => `<li><b>${k}:</b> ${v}</li>`).join("")}</ul>`;
  Object.keys(map).forEach((k) => {
    const field = els[k];
    if (field) field.classList.add("error");
  });
  if (first && els[first]) els[first].focus();
}

async function onSubmit() {
  clearErrors();
  els.result.textContent = "Calculating…";

  // Raw strings so empty fields are truly caught
  const nameRaw = els.name.value.trim();
  const ageRaw = els.age.value.trim();
  const feetRaw = els.feet.value.trim();
  const inchesRaw = els.inches.value.trim();
  const poundsRaw = els.pounds.value.trim();
  const bpRaw = els.bloodPressure.value.trim();
  const familyRaw = els.family.value.trim();

  const errs = {};
  // Required checks
  if (!nameRaw) errs.name = "Name is required.";
  if (!ageRaw) errs.age = "Age is required.";
  if (!feetRaw) errs.feet = "Height (feet) is required.";
  if (!inchesRaw) errs.inches = "Height (inches) is required.";
  if (!poundsRaw) errs.pounds = "Weight (lbs) is required.";
  if (!bpRaw) errs.bloodPressure = "Blood pressure is required.";
  if (!familyRaw) errs.family = "Family history is required.";

  // Parse numbers & formats after required checks
  const age = Number(ageRaw);
  const feet = Number(feetRaw);
  const inches = Number(inchesRaw);
  const pounds = Number(poundsRaw);

  if (!Number.isFinite(age) || age < 0) errs.age = errs.age || "Valid age is required.";
  if (!Number.isInteger(feet) || feet < 2) errs.feet = errs.feet || "Minimum height is 2 feet.";
  if (!Number.isInteger(inches) || inches < 0 || inches > 11)
    errs.inches = errs.inches || "Inches must be 0–11.";
  if (!Number.isFinite(pounds) || pounds <= 0)
    errs.pounds = errs.pounds || "Valid weight required.";

  if (!/^\s*\d{2,3}\s*\/\s*\d{2,3}\s*$/.test(bpRaw))
    errs.bloodPressure = errs.bloodPressure || "Use ###/## (e.g., 120/80).";

  if (Object.keys(errs).length) {
    els.result.textContent = "";
    showErrors(errs);
    return;
  }

  // Build payload only after all validations pass
  const payload = {
    name: nameRaw,
    age, feet, inches, pounds,
    bloodPressure: bpRaw,
    family: familyRaw,
  };

  els.submit.disabled = true;
  try {
    const res = await fetch(`${API_BASE}/api/risk`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      els.result.textContent = "";
      showErrors(err.errors || { general: "Server error." });
      return;
    }

    const data = await res.json();
    const { input, details, points, total, category } = data;

    // Build a verification summary string
    const summaryLines = [
      `Please confirm the details below:\n`,
      `Name: ${input.name}`,
      `Age: ${input.age}`,
      `Height: ${input.height.feet}'${input.height.inches}"`,
      `Weight: ${input.pounds} lbs`,
      `Blood Pressure: ${input.bloodPressure} (${details.bloodPressureCategory})`,
      `Family History: ${input.family || "(none)"}`,
      ``,
      `Calculated BMI: ${details.bmi} (${details.bmiCategory})`,
      ``,
      `Is this information correct?`,
    ];
    const summaryText = summaryLines.join("\n");

    // Keep textarea filled for accessibility/history, but gate the result on a Yes/No popup.
    els.message.value = summaryLines.slice(0, -1).join("\n");

    // === YES / NO POPUP ===
    const confirmed = window.confirm(summaryText);
    if (!confirmed) {
      // User chose "No" -> show nothing in result area.
      els.result.textContent = "";
      return;
    }

    // User confirmed -> show the result
    els.result.innerHTML = `
      <div class="result-card">
        <div><b>Score:</b> ${total}</div>
        <div><b>Risk Category:</b> ${category}</div>
        <hr>
        <div><b>Points breakdown</b></div>
        <ul>
          <li>Age: ${points.age}</li>
          <li>BMI: ${points.bmi}</li>
          <li>Blood Pressure: ${points.bloodPressure}</li>
          <li>Family: ${points.family}</li>
        </ul>
      </div>`;
  } catch (e) {
    console.error(e);
    els.result.textContent = "Network error contacting server.";
  } finally {
    els.submit.disabled = false;
  }
}

// Wake server on load; allow manual ping
window.addEventListener("load", ping);
els.pingBtn.addEventListener("click", ping);
els.submit.addEventListener("click", onSubmit);