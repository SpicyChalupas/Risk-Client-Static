// ==== Configure your API base ====
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

  const payload = {
    name: els.name.value.trim(),
    age: Number(els.age.value),
    feet: Number(els.feet.value),
    inches: Number(els.inches.value),
    pounds: Number(els.pounds.value),
    bloodPressure: els.bloodPressure.value.trim(),
    family: els.family.value.trim(),
  };

  // Light client validation (NO calculations here)
  const errs = {};
  if (!payload.name) errs.name = "Name is required.";
  if (!Number.isFinite(payload.age) || payload.age < 0) errs.age = "Valid age is required.";
  if (!Number.isInteger(payload.feet) || payload.feet < 2) errs.feet = "Minimum height is 2 feet.";
  if (!Number.isInteger(payload.inches) || payload.inches < 0 || payload.inches > 11) errs.inches = "0–11 inches.";
  if (!Number.isFinite(payload.pounds) || payload.pounds <= 0) errs.pounds = "Valid weight required.";
  if (!/^\s*\d{2,3}\s*\/\s*\d{2,3}\s*$/.test(payload.bloodPressure)) errs.bloodPressure = "Use ###/## (e.g., 120/80).";

  if (Object.keys(errs).length) {
    els.result.textContent = "";
    showErrors(errs);
    return;
  }

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

    // Summarize inputs + (server) calculated details
    els.message.value = [
      `Please confirm your answers below:`,
      `Name: ${input.name}`,
      `Age: ${input.age}`,
      `Height: ${input.height.feet}'${input.height.inches}"`,
      `Weight: ${input.pounds} lbs`,
      `Blood Pressure: ${input.bloodPressure} (${details.bloodPressureCategory})`,
      `Family History: ${input.family || "(none)"}`,
      ``,
      `Calculated BMI: ${details.bmi} (${details.bmiCategory})`,
    ].join("\n");

    // Final results (no client math)
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

// Wake server on load; manual ping as well
window.addEventListener("load", ping);
els.pingBtn.addEventListener("click", ping);
els.submit.addEventListener("click", onSubmit);
