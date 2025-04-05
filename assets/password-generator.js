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

  // Validate constraint combinations before attempting generation
  try {
    validateConstraints(
      settings.length,
      charset,
      firstCharPool,
      settings.noDuplicate
    );
  } catch (error) {
    showTooltip(error.message, "error");
    return;
  }

  // Generate each password.
  for (let i = 0; i < settings.amount; i++) {
    try {
      const password = generateSinglePassword(
        settings.length,
        charset,
        firstCharPool,
        settings.noSimilar,
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
 * Validate that the constraints are not contradictory
 * @param {number} length - Password length
 * @param {string} charset - Full character set to use
 * @param {string} firstCharPool - Character set for first character
 * @param {boolean} noDuplicate - Whether duplicates are allowed
 */
function validateConstraints(length, charset, firstCharPool, noDuplicate) {
  // Check if no-duplicates can be satisfied
  if (noDuplicate && charset.length < length) {
    throw new Error(
      `Not enough unique characters (${charset.length}) for the requested password length (${length}) with no duplicates.`
    );
  }
  
  // Check if first character pool is empty
  if (firstCharPool.length === 0) {
    throw new Error(
      "No valid characters available for the first position. Please adjust your constraints."
    );
  }
}

/**
 * Get a cryptographically secure random integer between 0 and max-1
 * @param {number} max - Maximum value (exclusive)
 * @returns {number} - Random integer
 */
function secureRandom(max) {
  // Use crypto API if available, otherwise fall back to Math.random
  if (window.crypto && window.crypto.getRandomValues) {
    const array = new Uint32Array(1);
    window.crypto.getRandomValues(array);
    return array[0] % max;
  } else {
    return Math.floor(Math.random() * max);
  }
}

/**
 * Filter out similar characters from charset
 * @param {string} charset - Character set to filter
 * @param {string} similarChars - Characters to consider similar
 * @returns {string} - Filtered character set
 */
function filterSimilarChars(charset, similarChars) {
  if (!similarChars) return charset;
  
  let filteredCharset = "";
  const similarSet = new Set([...similarChars]);
  
  for (let i = 0; i < charset.length; i++) {
    if (!similarSet.has(charset[i])) {
      filteredCharset += charset[i];
    }
  }
  
  return filteredCharset;
}

/**
 * Generates a single password based on the given constraints
 * @param {number} length - Password length
 * @param {string} charset - Full character set to use
 * @param {string} firstCharPool - Character set for first character
 * @param {boolean} noSimilar - Whether to avoid similar characters
 * @param {boolean} noDuplicate - Whether to allow duplicate characters
 * @param {boolean} noSequential - Whether to allow sequential characters
 * @param {string} symbolsSet - The set of symbols being used
 * @returns {string} - Generated password
 */
function generateSinglePassword(
  length,
  charset,
  firstCharPool,
  noSimilar,
  noDuplicate,
  noSequential,
  symbolsSet
) {
  // Define similar characters for the noSimilar option
  const similarChars = "iIl1oO0";
  
  // Pre-process character sets according to constraints
  if (noSimilar) {
    charset = filterSimilarChars(charset, similarChars);
    firstCharPool = filterSimilarChars(firstCharPool, similarChars);
    
    if (charset.length === 0) {
      throw new Error("No characters available after removing similar characters.");
    }
    
    if (firstCharPool.length === 0) {
      throw new Error("No valid starting characters available after removing similar characters.");
    }
  }

  // Generate with no duplicates - use efficient algorithm if possible
  if (noDuplicate && !noSequential && !symbolsSet) {
    return generateNoDuplicatePassword(length, charset, firstCharPool);
  }

  // Pre-calculate max symbols and create lookup maps for faster checking
  const maxSymbols = symbolsSet ? Math.ceil(length * 0.1) : Infinity;
  const symbolsSet2 = symbolsSet ? new Set([...symbolsSet]) : null;
  
  // Use Uint8Array for better performance with longer passwords
  const passwordArray = new Array(length);
  const usedChars = noDuplicate ? new Set() : null;
  let symbolCount = 0;
  
  // Generate first character with reduced constraints
  const firstChar = getValidChar(
    firstCharPool,
    null, // No previous char for first position
    usedChars,
    symbolsSet2,
    symbolCount,
    maxSymbols,
    noSequential
  );
  
  if (firstChar === null) {
    throw new Error("Failed to generate a valid starting character after multiple attempts.");
  }
  
  passwordArray[0] = firstChar;
  
  if (noDuplicate) usedChars.add(firstChar);
  if (symbolsSet2 && symbolsSet2.has(firstChar)) symbolCount++;
  
  // Fill rest of password
  for (let i = 1; i < length; i++) {
    const prevChar = passwordArray[i-1];
    const nextChar = getValidChar(
      charset,
      prevChar,
      usedChars,
      symbolsSet2,
      symbolCount,
      maxSymbols,
      noSequential
    );
    
    if (nextChar === null) {
      throw new Error(`Failed to generate character at position ${i+1}. Try relaxing some constraints.`);
    }
    
    passwordArray[i] = nextChar;
    
    if (noDuplicate) usedChars.add(nextChar);
    if (symbolsSet2 && symbolsSet2.has(nextChar)) symbolCount++;
  }

  return passwordArray.join("");
}

/**
 * Efficiently generates a password with no duplicates using a shuffle algorithm
 * @param {number} length - Password length
 * @param {string} charset - Character set to use
 * @param {string} firstCharPool - Characters allowed for first position
 * @returns {string} - Generated password
 */
function generateNoDuplicatePassword(length, charset, firstCharPool) {
  // Pick first character from the first character pool
  const firstChar = firstCharPool[secureRandom(firstCharPool.length)];
  
  // Create array from charset and filter out the first character
  const chars = [...charset].filter(c => c !== firstChar);
  
  // Fisher-Yates shuffle for the rest of the chars
  for (let i = chars.length - 1; i > 0; i--) {
    const j = secureRandom(i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  
  // Take first 'length-1' characters and add the first char
  return firstChar + chars.slice(0, length - 1).join('');
}

/**
 * Gets a valid character that meets all constraints
 * @param {string} charset - Character set to choose from
 * @param {string|null} prevChar - Previous character (for sequential check)
 * @param {Set|null} usedChars - Set of already used characters
 * @param {Set|null} symbolsSet - Set of symbols
 * @param {number} symbolCount - Current count of symbols
 * @param {number} maxSymbols - Maximum allowed symbols
 * @param {boolean} noSequential - Whether to avoid sequential characters
 * @returns {string|null} - A valid character or null if none found
 */
function getValidChar(
  charset,
  prevChar,
  usedChars,
  symbolsSet,
  symbolCount,
  maxSymbols,
  noSequential
) {
  // For performance, first check if a simple random selection is likely to work
  const hasStrictConstraints = 
    (usedChars && usedChars.size > charset.length * 0.5) || 
    (symbolsSet && symbolCount >= maxSymbols * 0.9) ||
    noSequential;
  
  if (!hasStrictConstraints) {
    // Try the fast path first - random selection without filtering
    // This will work most of the time and is much faster
    const attempts = 5; // A few quick attempts before falling back
    for (let i = 0; i < attempts; i++) {
      const char = charset[secureRandom(charset.length)];
      if (isValidChar(char, prevChar, usedChars, symbolsSet, symbolCount, maxSymbols, noSequential)) {
        return char;
      }
    }
  }
  
  // Fallback to slower but guaranteed approach - build valid charset first
  let validChars = "";
  
  for (let i = 0; i < charset.length; i++) {
    const char = charset[i];
    if (isValidChar(char, prevChar, usedChars, symbolsSet, symbolCount, maxSymbols, noSequential)) {
      validChars += char;
    }
  }
  
  if (validChars.length === 0) {
    return null; // No valid characters found
  }
  
  return validChars[secureRandom(validChars.length)];
}

/**
 * Checks if a character meets all constraints
 * @param {string} char - Character to check
 * @param {string|null} prevChar - Previous character
 * @param {Set|null} usedChars - Set of used characters
 * @param {Set|null} symbolsSet - Set of symbols
 * @param {number} symbolCount - Current symbol count
 * @param {number} maxSymbols - Maximum allowed symbols
 * @param {boolean} noSequential - Whether to avoid sequential characters
 * @returns {boolean} - Whether the character is valid
 */
function isValidChar(
  char,
  prevChar,
  usedChars,
  symbolsSet,
  symbolCount,
  maxSymbols,
  noSequential
) {
  // Check duplicate constraint
  if (usedChars && usedChars.has(char)) {
    return false;
  }
  
  // Check sequential constraint
  if (noSequential && prevChar && 
      Math.abs(char.charCodeAt(0) - prevChar.charCodeAt(0)) === 1) {
    return false;
  }
  
  // Check symbol constraint
  if (symbolsSet && symbolsSet.has(char) && symbolCount >= maxSymbols) {
    return false;
  }
  
  return true;
}

// ----------------------------
// UI RELATED FUNCTIONS
// ----------------------------

/**
 * Copies all generated passwords (excluding copy icons) to the clipboard.
 * Uses modern Promise-based clipboard API with fallbacks.
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

  // Use clipboard API with fallback
  copyToClipboard(passwords)
    .then(() => showTooltip("All passwords are copied", "success"))
    .catch(() => showTooltip("Failed to copy passwords", "error"));
}

/**
 * Copies text to the clipboard using modern async clipboard API with fallbacks
 * @param {string} text - The text to copy
 * @returns {Promise} - Promise that resolves when copy is successful
 */
function copyToClipboard(text) {
  // Try the modern async clipboard API first
  if (navigator.clipboard && navigator.clipboard.writeText) {
    return navigator.clipboard.writeText(text);
  }
  
  // Fall back to the deprecated execCommand method if clipboard API is not available
  return new Promise((resolve, reject) => {
    try {
      // Create temporary element
      const textArea = document.createElement("textarea");
      textArea.value = text;
      
      // Make the textarea out of viewport
      textArea.style.position = "fixed";
      textArea.style.left = "-999999px";
      textArea.style.top = "-999999px";
      document.body.appendChild(textArea);
      
      // Select and copy
      textArea.focus();
      textArea.select();
      
      const successful = document.execCommand('copy');
      document.body.removeChild(textArea);
      
      if (successful) {
        resolve();
      } else {
        reject(new Error("execCommand copy failed"));
      }
    } catch (err) {
      reject(err);
    }
  });
}

/**
 * Displays a custom tooltip with the specified message and type.
 * Uses requestAnimationFrame for smoother animations and removes
 * existing tooltips properly.
 * 
 * @param {string} message - The message to show.
 * @param {string} type - "error", "success", or "info".
 * @param {number} duration - Duration in milliseconds (default is 1000).
 */
function showTooltip(message, type = "info", duration = 1500) {
  // Store tooltip references for potential cleanup
  if (!window.activeTooltips) {
    window.activeTooltips = [];
  }

  // Remove existing tooltips
  const existingTooltips = document.querySelectorAll(".custom-tooltip");
  existingTooltips.forEach((tooltip) => {
    const index = window.activeTooltips.indexOf(tooltip);
    if (index > -1) {
      window.activeTooltips.splice(index, 1);
    }
    tooltip.remove();
  });
  
  // Create tooltip element with improved styling
  const tooltip = document.createElement("div");
  tooltip.className = `custom-tooltip ${type}`;
  tooltip.innerText = message;
  
  // Improved styling with better accessibility
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
  tooltip.style.opacity = "0";
  tooltip.style.transition = "opacity 0.3s ease";
  
  // Add accessibility attributes
  tooltip.setAttribute("role", "alert");
  tooltip.setAttribute("aria-live", "assertive");
  
  document.body.appendChild(tooltip);
  window.activeTooltips.push(tooltip);
  
  // Use requestAnimationFrame for smoother animations
  requestAnimationFrame(() => {
    tooltip.style.opacity = "1";
    
    // Set a timeout to fade out and remove the tooltip
    setTimeout(() => {
      tooltip.style.opacity = "0";
      
      // Remove the tooltip after the transition
      tooltip.addEventListener("transitionend", () => {
        const index = window.activeTooltips.indexOf(tooltip);
        if (index > -1) {
          window.activeTooltips.splice(index, 1);
        }
        if (tooltip.parentNode) {
          tooltip.parentNode.removeChild(tooltip);
        }
      });
    }, duration);
  });
}

/**
 * Handles click on copy icon with visual feedback and debounce protection
 * @param {HTMLElement} element - The clicked element
 * @param {string} password - The password to copy
 */
function handleCopyClick(element, password) {
  // Prevent multiple rapid clicks
  if (element.dataset.copying === "true") {
    return;
  }
  
  // Set copying flag
  element.dataset.copying = "true";
  
  // Add visual feedback
  element.classList.add("clicked");
  
  // Copy the password
  copyToClipboard(password)
    .then(() => showTooltip("Password copied", "success"))
    .catch(() => showTooltip("Failed to copy password", "error"))
    .finally(() => {
      // Remove the class after animation completes
      setTimeout(() => {
        element.classList.remove("clicked");
        // Reset copying flag
        delete element.dataset.copying;
      }, 300);
    });
}

/**
 * Creates a new password item element
 * @param {number} index - The index of the password (for numbering)
 * @param {string} password - The generated password
 * @returns {HTMLElement} - Password item element
 */
function createPasswordElement(index, password) {
  const passwordElement = document.createElement("div");
  passwordElement.classList.add("password-item");
  
  // Add class based on password length for responsive styling
  let lengthClass = "";
  if (password.length > 32) lengthClass = "length-large";
  if (password.length > 48) lengthClass = "length-xl";
  if (password.length > 56) lengthClass = "length-xxl";
  
  // Use safer HTML construction to avoid XSS risks
  const rowNumber = document.createElement("span");
  rowNumber.className = "row-number";
  rowNumber.textContent = String(index + 1).padStart(2, "0") + ":";
  
  const passwordText = document.createElement("span");
  passwordText.className = `password-text ${lengthClass}`;
  passwordText.textContent = password;
  
  const copyIcon = document.createElement("span");
  copyIcon.className = "copy-icon";
  copyIcon.innerHTML = '<i class="fas fa-copy"></i>';
  copyIcon.addEventListener("click", () => handleCopyClick(copyIcon, password));
  
  passwordElement.appendChild(rowNumber);
  passwordElement.appendChild(passwordText);
  passwordElement.appendChild(copyIcon);
  
  return passwordElement;
}

// Make function available in global scope
window.handleCopyClick = handleCopyClick;
window.copyToClipboard = copyToClipboard;
window.copyAllPasswords = copyAllPasswords;
window.showTooltip = showTooltip;
window.createPasswordElement = createPasswordElement;

// ----------------------------
// EVENT LISTENERS
// ----------------------------

// Initialize the page when DOM content is loaded
document.addEventListener("DOMContentLoaded", () => {
    // Load saved settings from cookie (if any) and update form.
    loadSettings();

    // Collect all relevant form elements
    const generateButton = document.getElementById("generate-button");
    const copyAllButton = document.getElementById("copy-all");
    const optionCheckboxesToUpdateAll = [
        "include-numbers",
        "include-lowercase",
        "include-uppercase",
        "include-symbols"
    ];
    
    const settingOptionIds = [
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
    const saveSettingsCheckbox = document.getElementById("save-settings");

    // Debounced version of the generate function
    const debouncedGenerate = debounce(generatePasswords, 300);

    // Set up event listeners with improved error handling
    safeAddEventListener(generateButton, "click", generatePasswords);
    safeAddEventListener(copyAllButton, "click", copyAllPasswords);

    // Add listeners to all option checkboxes that need to update UI state
    optionCheckboxesToUpdateAll.forEach(id => {
        safeAddEventListener(
            document.getElementById(id), 
            "change", 
            updateAllOptions
        );
    });

    // Add event listeners to all settings fields for auto-saving
    settingOptionIds.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            // For number inputs, add validation
            if (el.type === "number") {
                safeAddEventListener(el, "input", () => {
                    validateNumericInput(el);
                    updateSettingsCookie();
                });
            } else {
                safeAddEventListener(el, "change", updateSettingsCookie);
            }
        }
    });

    // Special handler for the save settings checkbox
    if (saveSettingsCheckbox) {
        safeAddEventListener(saveSettingsCheckbox, "change", function() {
            const saveChecked = this.checked;
            const settings = getSettingsFromForm();
            
            if (saveChecked) {
                setCookie("passwordGenSettings", JSON.stringify(settings), 180);
            } else {
                // Remove cookie when save-settings is unchecked
                setCookie("passwordGenSettings", "", -1);
            }
        });
    }

    // Add keyboard shortcuts
    document.addEventListener("keydown", function(evt) {
        // Generate passwords with Enter key
        if (evt.key === "Enter") {
            generatePasswords();
        }
        
        // Ctrl+C to copy all passwords
        if (evt.key === "c" && (evt.ctrlKey || evt.metaKey) && evt.altKey) {
            evt.preventDefault();
            copyAllPasswords();
        }
    });

    // Generate passwords on startup using the saved or default settings.
    generatePasswords();
    
    // Set up responsive behavior for UI elements
    setupResponsiveUI();
});

/**
 * Safely adds an event listener with error handling
 * @param {HTMLElement} element - The element to attach the listener to
 * @param {string} eventType - The event type (click, change, etc.)
 * @param {Function} handler - The event handler function
 */
function safeAddEventListener(element, eventType, handler) {
    if (!element) return;
    
    element.addEventListener(eventType, function(event) {
        try {
            handler.call(this, event);
        } catch (error) {
            console.error(`Error in ${eventType} handler:`, error);
            showTooltip("An error occurred. Please try again.", "error");
        }
    });
}

/**
 * Sets up responsive behavior for UI elements
 */
function setupResponsiveUI() {
    // Add responsive behavior for the custom symbols field
    const customSymbolsField = document.getElementById("custom-symbols");
    const includeSymbolsCheckbox = document.getElementById("include-symbols");
    
    if (customSymbolsField && includeSymbolsCheckbox) {
        // Show/hide custom symbols field based on checkbox
        function updateCustomSymbolsVisibility() {
            customSymbolsField.style.opacity = includeSymbolsCheckbox.checked ? "1" : "0.5";
            customSymbolsField.disabled = !includeSymbolsCheckbox.checked;
        }
        
        safeAddEventListener(includeSymbolsCheckbox, "change", updateCustomSymbolsVisibility);
        
        // Initialize visibility
        updateCustomSymbolsVisibility();
    }
}

/**
 * Validates numeric input fields
 * @param {HTMLInputElement} input - The input element to validate
 */
function validateNumericInput(input) {
    const value = parseInt(input.value);
    const min = parseInt(input.getAttribute("min") || 0);
    const max = parseInt(input.getAttribute("max") || Infinity);
    
    if (isNaN(value)) {
        input.value = input.getAttribute("min") || "1";
    } else if (value < min) {
        input.value = min;
    } else if (value > max) {
        input.value = max;
    }
}

/**
 * Creates a debounced version of a function
 * @param {Function} func - The function to debounce
 * @param {number} wait - The time to wait in milliseconds
 * @returns {Function} - Debounced function
 */
function debounce(func, wait) {
    let timeout;
    return function(...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), wait);
    };
}

// Function to toggle availability of "Don't Start with Number" option
function updateNoStartNumber() {
  // Get references to all checkboxes we need
  const includeNumbersCheckbox = document.getElementById("include-numbers");
  const includeLowercaseCheckbox = document.getElementById("include-lowercase");
  const includeUppercaseCheckbox = document.getElementById("include-uppercase");
  const includeSymbolsCheckbox = document.getElementById("include-symbols");
  const noStartNumberCheckbox = document.getElementById("no-start-number");
  
  if (!includeNumbersCheckbox || !noStartNumberCheckbox) return;
  
  // Check if numbers are included
  if (!includeNumbersCheckbox.checked) {
    // If numbers aren't included, disable the option
    noStartNumberCheckbox.checked = false;
    noStartNumberCheckbox.disabled = true;
  } else {
    // If numbers are included, we need to check if there are other character types
    const hasOtherChars =
      (includeLowercaseCheckbox && includeLowercaseCheckbox.checked) ||
      (includeUppercaseCheckbox && includeUppercaseCheckbox.checked) ||
      (includeSymbolsCheckbox && includeSymbolsCheckbox.checked);

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
  
  if (!includeSymbolsCheckbox || !noStartSymbolCheckbox) return;
  
  // Check if symbols are included
  if (!includeSymbolsCheckbox.checked) {
    // If symbols aren't included, disable the option
    noStartSymbolCheckbox.checked = false;
    noStartSymbolCheckbox.disabled = true;
  } else {
    // If symbols are included, we need to check if there are other character types
    const hasOtherChars =
      (includeLowercaseCheckbox && includeLowercaseCheckbox.checked) ||
      (includeUppercaseCheckbox && includeUppercaseCheckbox.checked) ||
      (includeNumbersCheckbox && includeNumbersCheckbox.checked);

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
  
  if (!noSimilarCheckbox) return;
  
  // Check if multiple character types are included
  const numbersOnly =
    (includeNumbersCheckbox && includeNumbersCheckbox.checked) &&
    (!includeLowercaseCheckbox || !includeLowercaseCheckbox.checked) &&
    (!includeUppercaseCheckbox || !includeUppercaseCheckbox.checked) &&
    (!includeSymbolsCheckbox || !includeSymbolsCheckbox.checked);
    
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

// Make functions available in the global scope for the HTML onclick handlers
window.updateAllOptions = updateAllOptions;
window.updateNoStartNumber = updateNoStartNumber;
window.updateNoStartSymbol = updateNoStartSymbol;
window.updateNoSimilar = updateNoSimilar;
window.generatePasswords = generatePasswords;

// ----------------------------
// COOKIE UTILS AND SETTINGS
// ----------------------------

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
 * @property {string} customSymbols - Which symbols to include
 * @property {boolean} noSimilar - Whether to exclude similar characters
 * @property {boolean} noDuplicate - Whether to prevent duplicate characters
 * @property {boolean} noSequential - Whether to prevent sequential characters
 * @property {boolean} saveSettings - Whether to save settings in cookies
 */

/**
 * Retrieves the cookie value for the given name with improved parsing.
 * @param {string} name - Cookie name.
 * @returns {string|null} - Cookie value or null if not found.
 */
function getCookie(name) {
  // Try to get cookie using modern API if available
  if (typeof document.cookie === 'string') {
    const cookies = document.cookie.split(';');
    const nameEQ = name + '=';
    
    for (let i = 0; i < cookies.length; i++) {
      let cookie = cookies[i].trim();
      if (cookie.indexOf(nameEQ) === 0) {
        return decodeURIComponent(cookie.substring(nameEQ.length));
      }
    }
  }
  
  return null;
}

/**
 * Sets a cookie with the given name, value, and expiry (in days).
 * Includes improved security options and encoding.
 * 
 * @param {string} name - Cookie name.
 * @param {string} value - Cookie value.
 * @param {number} days - Expiration in days.
 */
function setCookie(name, value, days) {
  let expires = '';
  let path = '; path=/';
  let sameSite = '; SameSite=Lax';
  
  if (days) {
    const date = new Date();
    date.setTime(date.getTime() + days * 24 * 60 * 60 * 1000);
    expires = '; expires=' + date.toUTCString();
  } else if (days === 0) {
    // Session cookie
    expires = '';
  } else if (days < 0) {
    // Delete cookie
    expires = '; expires=Thu, 01 Jan 1970 00:00:00 UTC';
  }
  
  // Encode the value to handle special characters
  const encodedValue = encodeURIComponent(value);
  
  // Set the cookie with security attributes
  document.cookie = name + '=' + encodedValue + expires + path + sameSite;
}

/**
 * Gets the current settings from the form inputs with validation
 * @returns {PasswordSettings} - Current password settings
 */
function getSettingsFromForm() {
  // Helper function to safely parse integers with fallbacks
  const safeParseInt = (value, defaultValue) => {
    const parsed = parseInt(value);
    return isNaN(parsed) ? defaultValue : parsed;
  };
  
  // Helper function to safely get checkbox state
  const getCheckboxState = (id, defaultValue = false) => {
    const checkbox = document.getElementById(id);
    return checkbox ? checkbox.checked : defaultValue;
  };
  
  // Helper function to safely get input value
  const getInputValue = (id, defaultValue = '') => {
    const input = document.getElementById(id);
    return input ? input.value : defaultValue;
  };
  
  return {
    length: safeParseInt(getInputValue("password-length"), 32),
    amount: safeParseInt(getInputValue("password-amount"), 15),
    includeNumbers: getCheckboxState("include-numbers", true),
    includeLowercase: getCheckboxState("include-lowercase", true),
    includeUppercase: getCheckboxState("include-uppercase", true),
    noStartNumber: getCheckboxState("no-start-number", false),
    noStartSymbol: getCheckboxState("no-start-symbol", false),
    includeSymbols: getCheckboxState("include-symbols", false),
    customSymbols: getInputValue("custom-symbols", "!#%*+-=?@^_~"),
    noSimilar: getCheckboxState("no-similar", false),
    noDuplicate: getCheckboxState("no-duplicate", false),
    noSequential: getCheckboxState("no-sequential", false),
    saveSettings: getCheckboxState("save-settings", true),
  };
}

/**
 * Updates form inputs with the provided settings
 * @param {PasswordSettings} settings - Settings to apply to the form
 */
function applySettingsToForm(settings) {
  // Helper function to safely set input value
  const setInputValue = (id, value) => {
    const input = document.getElementById(id);
    if (input) input.value = value;
  };
  
  // Helper function to safely set checkbox state
  const setCheckboxState = (id, checked, defaultValue = false) => {
    const checkbox = document.getElementById(id);
    if (checkbox) checkbox.checked = checked !== undefined ? checked : defaultValue;
  };
  
  // Apply each setting with validation and fallbacks
  setInputValue("password-length", settings.length || 32);
  setInputValue("password-amount", settings.amount || 15);
  setCheckboxState("include-numbers", settings.includeNumbers, true);
  setCheckboxState("include-lowercase", settings.includeLowercase, true);
  setCheckboxState("include-uppercase", settings.includeUppercase, true);
  setCheckboxState("no-start-number", settings.noStartNumber, false);
  setCheckboxState("no-start-symbol", settings.noStartSymbol, false);
  setCheckboxState("include-symbols", settings.includeSymbols, false);
  setInputValue("custom-symbols", settings.customSymbols || "!#%*+-=?@^_~");
  setCheckboxState("no-similar", settings.noSimilar, false);
  setCheckboxState("no-duplicate", settings.noDuplicate, false);
  setCheckboxState("no-sequential", settings.noSequential, false);
  setCheckboxState("save-settings", settings.saveSettings, true);
  
  // Update dependent UI elements
  updateAllOptions();
}

/**
 * Reads the current options from the form and saves them in a cookie for 180 days,
 * if "Save Settings" is enabled.
 * @returns {PasswordSettings} The current settings
 */
function updateSettingsCookie() {
  const settings = getSettingsFromForm();

  // Make sure we're reading the actual checkbox state
  const saveSettingsCheckbox = document.getElementById("save-settings");
  settings.saveSettings = saveSettingsCheckbox ? saveSettingsCheckbox.checked : false;
  
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
 * Includes error handling for corrupted cookies.
 * 
 * @returns {PasswordSettings|null} - The loaded settings or null if none found
 */
function loadSettings() {
  const settingsStr = getCookie("passwordGenSettings");
  
  if (!settingsStr) {
    return null;
  }
  
  try {
    const settings = JSON.parse(settingsStr);
    
    // Basic validation to ensure we have a valid settings object
    if (typeof settings !== 'object' || settings === null) {
      console.error("Invalid settings format in cookie");
      return null;
    }

    // Apply all settings from cookie to form
    applySettingsToForm(settings);

    // Explicitly set save-settings checkbox to match what's in the cookie
    const saveSettingsCheckbox = document.getElementById("save-settings");
    if (saveSettingsCheckbox) {
      saveSettingsCheckbox.checked = settings.saveSettings === true;
    }

    return settings;
  } catch (e) {
    console.error("Error parsing settings cookie:", e);
    // If cookie is corrupted, remove it
    setCookie("passwordGenSettings", "", -1);
    return null;
  }
}

// Export functions for use in other modules
window.getCookie = getCookie;
window.setCookie = setCookie;
window.updateSettingsCookie = updateSettingsCookie;
window.loadSettings = loadSettings;
window.getSettingsFromForm = getSettingsFromForm;
window.applySettingsToForm = applySettingsToForm;
