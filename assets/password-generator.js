// ----------------------------
// PASSWORD GENERATION FUNCTIONS
// ----------------------------

/**
 * Main function to generate passwords based on user settings
 */
function generatePasswords() {
  // Update saved settings (if "Save Settings" is enabled).
  const settings = updateSettingsCookie();
  
  const passwordList = document.getElementById("password-list");
  passwordList.innerHTML = ""; // Clear previous passwords

  // Define character sets.
  const numbersSet = "0123456789";
  const lowercaseSet = "abcdefghijklmnopqrstuvwxyz";
  const uppercaseSet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  // Use default symbols if custom symbols is empty
  const defaultSymbols = "!#%*+-=?@^_~";
  const symbolsSet = settings.includeSymbols
    ? settings.customSymbols && settings.customSymbols.length > 0
      ? settings.customSymbols
      : defaultSymbols
    : "";

  // Build the combined charset.
  let charset = "";
  if (settings.includeNumbers) charset += numbersSet;
  if (settings.includeLowercase) charset += lowercaseSet;
  if (settings.includeUppercase) charset += uppercaseSet;
  if (settings.includeSymbols) charset += symbolsSet;

  if (!charset) {
    showTooltip("Select at least one character type.", "error");
    return;
  }

  // Build the first-character pool.
  let firstCharPool = charset;
  if (settings.noStartNumber) {
    firstCharPool = firstCharPool.replace(/[0-9]/g, "");
  }
  if (settings.noStartSymbol && symbolsSet) {
    for (let sym of symbolsSet) {
      firstCharPool = firstCharPool.split(sym).join("");
    }
  }
  if (firstCharPool.length === 0) {
    showTooltip(
      "No valid starting characters available. Please adjust the options.",
      "error"
    );
    return;
  }

  // Define similar characters for the noSimilar option
  const similarChars = "iIl1oO0";

  // Generate each password.
  for (let i = 0; i < settings.amount; i++) {
    try {
      const password = generateSinglePassword(
        settings.length,
        charset,
        firstCharPool,
        settings.noSimilar ? similarChars : "",
        settings.noDuplicate,
        settings.noSequential,
        symbolsSet
      );
      const passwordElement = document.createElement("div");
      passwordElement.classList.add("password-item");
      // Add class based on password length
      let lengthClass = "";
      if (password.length > 32) lengthClass = "length-large";
      if (password.length > 48) lengthClass = "length-xl";
      if (password.length > 56) lengthClass = "length-xxl";
      passwordElement.innerHTML = `<span class="row-number">${String(
        i + 1
      ).padStart(2, "0")}:</span> <span class="password-text ${lengthClass}">${password}</span> <span class="copy-icon" onclick="handleCopyClick(this, '${password}')"><i class="fas fa-copy"></i></span>`;
      passwordList.appendChild(passwordElement);
    } catch (error) {
      showTooltip(error.message, "error");
      return;
    }
  }
}

/**
 * Generates a single password based on the given constraints
 * @param {number} length - Password length
 * @param {string} charset - Full character set to use
 * @param {string} firstCharPool - Character set for first character
 * @param {string} similarChars - Characters to avoid if noSimilar is enabled
 * @param {boolean} noDuplicate - Whether to allow duplicate characters
 * @param {boolean} noSequential - Whether to allow sequential characters
 * @param {string} symbolsSet - The set of symbols being used
 * @returns {string} - Generated password
 */
function generateSinglePassword(
  length,
  charset,
  firstCharPool,
  similarChars,
  noDuplicate,
  noSequential,
  symbolsSet
) {
  //
  // Pre-calculate max symbols and create lookup maps for faster checking
  const maxSymbols = Math.ceil(length * 0.1);
  const similarCharsMap = similarChars ? new Set([...similarChars]) : null;
  const symbolsMap = symbolsSet ? new Set([...symbolsSet]) : null;
  // Use array instead of string concatenation for better performance
  const passwordArray = new Array(length);
  const usedChars = noDuplicate ? new Set() : null;
  let symbolCount = 0;
  // Generate first character
  for (let attempt = 0; attempt < 100; attempt++) {
    const char = firstCharPool[Math.floor(Math.random() * firstCharPool.length)];
    if (similarCharsMap && similarCharsMap.has(char)) continue;

    passwordArray[0] = char;
    if (noDuplicate) usedChars.add(char);
    if (symbolsMap && symbolsMap.has(char)) symbolCount++;
    break;
  }

  if (!passwordArray[0]) {
    throw new Error("Failed to generate a valid starting character");
  }

  // Fill rest of password
  for (let i = 1; i < length; i++) {
    for (let attempt = 0; attempt < 100; attempt++) {
      const char = charset[Math.floor(Math.random() * charset.length)];
      // Apply constraints
      if (similarCharsMap && similarCharsMap.has(char)) continue;
      if (noDuplicate && usedChars.has(char)) continue;
      if (
        noSequential &&
        Math.abs(char.charCodeAt(0) - passwordArray[i - 1].charCodeAt(0)) === 1
      )
        continue;
      if (symbolsMap && symbolsMap.has(char) && symbolCount >= maxSymbols)
        continue;

      // Accept this character
      passwordArray[i] = char;
      if (noDuplicate) usedChars.add(char);
      if (symbolsMap && symbolsMap.has(char)) symbolCount++;
      break;
    }

    if (!passwordArray[i]) {
      throw new Error("Failed to generate password with current constraints");
    }
  }

  return passwordArray.join("");
}


// ----------------------------
// UI RELATED FUNCTIONS
// ----------------------------

/**
 * Copies all generated passwords (excluding copy icons) to the clipboard.
 */
function copyAllPasswords() {
  const passwordList = document.getElementById("password-list");

  // Check if there are any passwords to copy
  if (!passwordList || passwordList.children.length === 0) {
    showTooltip("No passwords to copy", "error");
    return;
  }

  const passwords = [...passwordList.children]
    .map((item) => {
      // Extract just the password text, not the row number or copy icon
      const passwordElement = item.querySelector(".password-text");
      return passwordElement ? passwordElement.textContent.trim() : "";
    })
    .filter((password) => password) // Remove any empty strings
    .join("\n");
  if (!passwords) {
    showTooltip("No valid passwords found", "error");
    return;
  }

  navigator.clipboard
    .writeText(passwords)
    .then(() => showTooltip("All passwords are copied", "success"))
    .catch(() => showTooltip("Failed to copy passwords.", "error"));
}

/**
 * Copies a single password to the clipboard.
 * @param {string} password - The password to copy.
 */
function copyToClipboard(password) {
  navigator.clipboard
    .writeText(password)
    .then(() => showTooltip("The password is copied", "success"))
    .catch(() => showTooltip("Failed to copy password.", "error"));
}

/**
 * Displays a custom tooltip with the specified message and type.
 * @param {string} message - The message to show.
 * @param {string} type - "error", "success", or "info".
 * @param {number} duration - Duration in milliseconds (default is 3000).
 */
function showTooltip(message, type = "info", duration = 1000) {
  // Remove any existing tooltips first
  const existingTooltips = document.querySelectorAll(".custom-tooltip");
  existingTooltips.forEach((tooltip) => tooltip.remove());
  const tooltip = document.createElement("div");
  tooltip.className = "custom-tooltip " + type;
  tooltip.innerText = message;
  // Basic inline styling (customize via your CSS).
  tooltip.style.position = "fixed";
  tooltip.style.top = "20px";
  tooltip.style.left = "50%";
  tooltip.style.transform = "translateX(-50%)";
  tooltip.style.padding = "10px 20px";
  tooltip.style.background =
    type === "error" ? "#e74c3c" : type === "success" ? "#2ecc71" : "#3498db";
  tooltip.style.color = "#fff";
  tooltip.style.borderRadius = "5px";
  tooltip.style.boxShadow = "0 2px 10px rgba(0,0,0,0.2)";
  tooltip.style.zIndex = "9999";
  tooltip.style.opacity = "1";
  tooltip.style.transition = "opacity 1s ease";

  document.body.appendChild(tooltip);

  setTimeout(() => {
    tooltip.style.opacity = "0";
    tooltip.addEventListener("transitionend", () => {
      if (tooltip && tooltip.parentNode) {
        tooltip.parentNode.removeChild(tooltip);
      }
    });
  }, duration);
}

/**
 * Handles click on copy icon with visual feedback
 * @param {HTMLElement} element - The clicked element
 * @param {string} password - The password to copy
 */
function handleCopyClick(element, password) {
  // Add visual feedback
  element.classList.add("clicked");
  // Remove the class after animation completes
  setTimeout(() => {
    element.classList.remove("clicked");
  }, 200);

  // Copy the password
  copyToClipboard(password);
}

// Make function available in global scope
window.handleCopyClick = handleCopyClick;

// ----------------------------
// EVENT LISTENERS
// ----------------------------
// ----------------------------
// EVENT LISTENERS
// ----------------------------

// Initialize the page when DOM content is loaded
document.addEventListener("DOMContentLoaded", () => {
  // Load saved settings from cookie (if any) and update form.
  loadSettings();

  const generateButton = document.getElementById("generate-button");
  const copyAllButton = document.getElementById("copy-all");

  generateButton.addEventListener("click", generatePasswords);
  copyAllButton.addEventListener("click", copyAllPasswords);

  // Get references to the checkboxes
  const includeNumbersCheckbox = document.getElementById("include-numbers");
  const noStartNumberCheckbox = document.getElementById("no-start-number");
  const includeSymbolsCheckbox = document.getElementById("include-symbols");
  const noStartSymbolCheckbox = document.getElementById("no-start-symbol");
  const includeLowercaseCheckbox = document.getElementById("include-lowercase");
  const includeUppercaseCheckbox = document.getElementById("include-uppercase");
  // Add event listeners to update when corresponding options change
  includeNumbersCheckbox.addEventListener("change", updateAllOptions);
  includeLowercaseCheckbox.addEventListener("change", updateAllOptions);
  includeUppercaseCheckbox.addEventListener("change", updateAllOptions);
  includeSymbolsCheckbox.addEventListener("change", updateAllOptions);
  // Add event listeners to update when corresponding options change
  document
    .getElementById("include-numbers")
    .addEventListener("change", function () {
      updateNoStartNumber();
      updateNoSimilar();
    });
  document
    .getElementById("include-lowercase")
    .addEventListener("change", function () {
      updateNoStartNumber();
      updateNoSimilar();
    });
  document
    .getElementById("include-uppercase")
    .addEventListener("change", function () {
      updateNoStartNumber();
      updateNoSimilar();
    });
  document
    .getElementById("include-symbols")
    .addEventListener("change", function () {
      updateNoStartNumber();
      updateNoSimilar();
    });

  // Run all functions on page load
  updateAllOptions();

  // List of all option element IDs that affect settings.
  const optionIds = [
    "password-length",
    "password-amount",
    "include-numbers",
    "include-lowercase",
    "include-uppercase",
    "no-start-number",
    "no-start-symbol",
    "include-symbols",
    "custom-symbols",
    "no-similar",
    "no-duplicate",
    "no-sequential",
    "save-settings",
  ];
  optionIds.forEach((id) => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener("change", updateSettingsCookie);
    }
  });

  // Trigger password generation with the Enter key.
  document.addEventListener("keydown", function (evt) {
    if (evt.key === "Enter") {
      generatePasswords();
    }
  });

  // Generate passwords on startup using the saved or default settings.
  generatePasswords();
});

// Function to toggle availability of "Don't Start with Number" option
function updateNoStartNumber() {
  // Get references to all checkboxes we need
  const includeNumbersCheckbox = document.getElementById("include-numbers");
  const includeLowercaseCheckbox = document.getElementById("include-lowercase");
  const includeUppercaseCheckbox = document.getElementById("include-uppercase");
  const includeSymbolsCheckbox = document.getElementById("include-symbols");
  const noStartNumberCheckbox = document.getElementById("no-start-number");
  // Check if numbers are included
  if (!includeNumbersCheckbox.checked) {
    // If numbers aren't included, disable the option
    noStartNumberCheckbox.checked = false;
    noStartNumberCheckbox.disabled = true;
  } else {
    // If numbers are included, we need to check if there are other character types
    const hasOtherChars =
      includeLowercaseCheckbox.checked ||
      includeUppercaseCheckbox.checked ||
      includeSymbolsCheckbox.checked;

    // Only enable "Don't Start with Number" if other character types are available
    if (hasOtherChars) {
      noStartNumberCheckbox.disabled = false;
    } else {
      // If only numbers are selected, disable and uncheck
      noStartNumberCheckbox.checked = false;
      noStartNumberCheckbox.disabled = true;
    }
  }
}

// Function to toggle availability of "Don't Start with Symbol" option
function updateNoStartSymbol() {
  // Get references to all checkboxes we need
  const includeNumbersCheckbox = document.getElementById("include-numbers");
  const includeLowercaseCheckbox = document.getElementById("include-lowercase");
  const includeUppercaseCheckbox = document.getElementById("include-uppercase");
  const includeSymbolsCheckbox = document.getElementById("include-symbols");
  const noStartSymbolCheckbox = document.getElementById("no-start-symbol");
  // Check if symbols are included
  if (!includeSymbolsCheckbox.checked) {
    // If symbols aren't included, disable the option
    noStartSymbolCheckbox.checked = false;
    noStartSymbolCheckbox.disabled = true;
  } else {
    // If symbols are included, we need to check if there are other character types
    const hasOtherChars =
      includeLowercaseCheckbox.checked ||
      includeUppercaseCheckbox.checked ||
      includeNumbersCheckbox.checked;

    // Only enable "Don't Start with Symbol" if other character types are available
    if (hasOtherChars) {
      noStartSymbolCheckbox.disabled = false;
    } else {
      // If only symbols are selected, disable and uncheck
      noStartSymbolCheckbox.checked = false;
      noStartSymbolCheckbox.disabled = true;
    }
  }
}

// Function to toggle availability of "No Similar Characters" option
function updateNoSimilar() {
  const includeNumbersCheckbox = document.getElementById("include-numbers");
  const includeLowercaseCheckbox = document.getElementById("include-lowercase");
  const includeUppercaseCheckbox = document.getElementById("include-uppercase");
  const includeSymbolsCheckbox = document.getElementById("include-symbols");
  const noSimilarCheckbox = document.getElementById("no-similar");
  // Check if multiple character types are included
  const numbersOnly =
    includeNumbersCheckbox.checked &&
    !includeLowercaseCheckbox.checked &&
    !includeUppercaseCheckbox.checked &&
    !includeSymbolsCheckbox.checked;
  // If only numbers are selected, disable "No Similar Characters"
  if (numbersOnly) {
    noSimilarCheckbox.checked = false;
    noSimilarCheckbox.disabled = true;
  } else {
    // Re-enable if multiple character types are available
    noSimilarCheckbox.disabled = false;
  }
}

// Update all option states when a checkbox changes
function updateAllOptions() {
  updateNoStartNumber();
  updateNoStartSymbol();
  updateNoSimilar();
}

// Checking the status of the Save-Setting option
document.getElementById("save-settings").addEventListener("change", function () {
  // Update cookie immediately when checkbox state changes
  const saveChecked = this.checked;

  if (saveChecked) {
    // Save current settings
    const settings = getSettingsFromForm();
    setCookie("passwordGenSettings", JSON.stringify(settings), 180);
  } else {
    // Remove cookie when save-settings is unchecked
    setCookie("passwordGenSettings", "", -1);
  }
});

// Make functions available in the global scope for the HTML onclick handlers
window.copyToClipboard = copyToClipboard;
window.copyAllPasswords = copyAllPasswords;
window.generatePasswords = generatePasswords;

// ----------------------------
// COOKIE UTILS AND SETTINGS
// ----------------------------

/**
 * Retrieves the cookie value for the given name.
 * @param {string} name - Cookie name.
 * @returns {string|null} - Cookie value or null if not found.
 */
function getCookie(name) {
  const nameEQ = name + "=";
  const ca = document.cookie.split(";");
  for (let i = 0; i < ca.length; i++) {
    let c = ca[i].trim();
    if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length);
  }
  return null;
}

/**
 * Sets a cookie with the given name, value, and expiry (in days).
 * @param {string} name - Cookie name.
 * @param {string} value - Cookie value.
 * @param {number} days - Expiration in days.
 */
function setCookie(name, value, days) {
  let expires = "";
  if (days) {
    const date = new Date();
    date.setTime(date.getTime() + days * 24 * 60 * 60 * 1000);
    expires = "; expires=" + date.toUTCString();
  }
  document.cookie = name + "=" + (value || "") + expires + "; path=/";
}

/**
 * Settings object structure that represents all password generator settings
 * @typedef {Object} PasswordSettings
 * @property {number} length - Password length
 * @property {number} amount - Number of passwords to generate
 * @property {boolean} includeNumbers - Whether to include numbers
 * @property {boolean} includeLowercase - Whether to include lowercase letters
 * @property {boolean} includeUppercase - Whether to include uppercase letters
 * @property {boolean} noStartNumber - Whether to prevent starting with a number
 * @property {boolean} noStartSymbol - Whether to prevent starting with a symbol
 * @property {boolean} includeSymbols - Whether to include symbols
 * @property {string} customSymbols - Which
 * symbols to include
 * @property {boolean} noSimilar - Whether to exclude similar characters
 * @property {boolean} noDuplicate - Whether to prevent duplicate characters
 * @property {boolean} noSequential - Whether to prevent sequential characters
 * @property {boolean} saveSettings - Whether to save settings in cookies
 */

/**
 * Gets the current settings from the form inputs
 * @returns {PasswordSettings} - Current password settings
 */
function getSettingsFromForm() {
  return {
    length: parseInt(document.getElementById("password-length").value) || 32,
    amount: parseInt(document.getElementById("password-amount").value) || 15,
    includeNumbers: document.getElementById("include-numbers").checked,
    includeLowercase: document.getElementById("include-lowercase").checked,
    includeUppercase: document.getElementById("include-uppercase").checked,
    noStartNumber: document.getElementById("no-start-number").checked,
    noStartSymbol: document.getElementById("no-start-symbol").checked,
    includeSymbols: document.getElementById("include-symbols").checked,
    customSymbols:
      document.getElementById("custom-symbols").value || "!#%*+-=?@^_~",
    noSimilar: document.getElementById("no-similar").checked,
    noDuplicate: document.getElementById("no-duplicate").checked,
    noSequential: document.getElementById("no-sequential").checked,
    saveSettings: document.getElementById("save-settings").checked,
  };
}

/**
 * Updates form inputs with the provided settings
 * @param {PasswordSettings} settings - Settings to apply to the form
 */
function applySettingsToForm(settings) {
  // Add validation with fallback values
  document.getElementById("password-length").value = settings.length || 32;
  document.getElementById("password-amount").value = settings.amount || 15;
  document.getElementById("include-numbers").checked =
    settings.includeNumbers !== undefined ? settings.includeNumbers : true;
  document.getElementById("include-lowercase").checked =
    settings.includeLowercase !== undefined ? settings.includeLowercase : true;
  document.getElementById("include-uppercase").checked =
    settings.includeUppercase !== undefined ? settings.includeUppercase : true;
  document.getElementById("no-start-number").checked =
    settings.noStartNumber !== undefined ? settings.noStartNumber : false;
  document.getElementById("no-start-symbol").checked =
    settings.noStartSymbol !== undefined ? settings.noStartSymbol : false;
  document.getElementById("include-symbols").checked =
    settings.includeSymbols !== undefined ? settings.includeSymbols : false;
  document.getElementById("custom-symbols").value =
    settings.customSymbols || "!#%*+-=?@^_~";
  document.getElementById("no-similar").checked =
    settings.noSimilar !== undefined ? settings.noSimilar : false;
  document.getElementById("no-duplicate").checked =
    settings.noDuplicate !== undefined ? settings.noDuplicate : false;
  document.getElementById("no-sequential").checked =
    settings.noSequential !== undefined ? settings.noSequential : false;
  document.getElementById("save-settings").checked =
    settings.saveSettings !== undefined ? settings.saveSettings : true;
}

/**
 * Reads the current options from the form and saves them in a cookie for 180 days,
 * if "Save Settings" is enabled.
 */
function updateSettingsCookie() {
  const settings = getSettingsFromForm();

  // Make sure we're reading the actual checkbox state
  settings.saveSettings = document.getElementById("save-settings").checked;
  if (settings.saveSettings) {
    // Save all settings including the saveSettings flag itself
    setCookie("passwordGenSettings", JSON.stringify(settings), 180);
  } else {
    // Remove cookie if save-settings is not checked
    setCookie("passwordGenSettings", "", -1);
  }
  return settings;
}

/**
 * Loads saved settings from the cookie and updates the form inputs.
 * @returns {PasswordSettings|null} - The loaded settings or null if none found
 */
function loadSettings() {
  const settingsStr = getCookie("passwordGenSettings");
  if (settingsStr) {
    try {
      const settings = JSON.parse(settingsStr);

      // Apply all settings from cookie to form
      applySettingsToForm(settings);

      // Explicitly set save-settings checkbox to match what's in the cookie
      const saveSettingsCheckbox = document.getElementById("save-settings");
      saveSettingsCheckbox.checked = settings.saveSettings === true;

      return settings;
    } catch (e) {
      console.error("Error parsing settings cookie:", e);
      return null;
    }
  }
  // No cookie found, don't change the default state of save-settings checkbox
  return null;
}

// Export functions for use in other modules
window.getCookie = getCookie;
window.setCookie = setCookie;
window.updateSettingsCookie = updateSettingsCookie;
window.loadSettings = loadSettings;
window.getSettingsFromForm = getSettingsFromForm;
window.applySettingsToForm = applySettingsToForm;
