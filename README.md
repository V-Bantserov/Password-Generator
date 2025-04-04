# Free Password Generator

This project is a free and open-source password generator web application that allows users to create 
secure and random passwords based on various criteria.</br>
Built with HTML, CSS, and JavaScript, it offers an intuitive interface for easy password generation and copying.

<img src="https://raw.githubusercontent.com/V-Bantserov/Password-Generator/refs/heads/main/images/screenshot.gif" width="800"/>

## Features

* **Customizable Password Length:** Users can specify the desired length of their passwords.
* **Adjustable Password Amount:** Generate multiple passwords at once by setting the desired quantity.
* **Inclusion of Different Character Types:**
    * Numbers (0-9)
    * Symbols (with a default set and the option for custom symbols)
    * Uppercase Letters (A-Z)
    * Lowercase Letters (a-z)
* **Options to Exclude:**
    * Starting with a Number
    * Starting with a Symbol
    * Similar Characters (i, I, l, 1, o, O, 0)
    * Duplicate Characters within a single password
    * Sequential Characters (e.g., 123, abc)
* **"Copy All" Functionality:** Quickly copy all generated passwords to the clipboard.
* **Individual Password Copying:** Option to copy each generated password separately.
* **Settings Persistence:** Ability to save preferred settings in browser cookies for future sessions.
* **Responsive Design:** The application is optimized for various screen sizes.

## Technologies

* HTML
* CSS
* JavaScript

## How to Use

1.  Open the `password-generator.html` file in your web browser.
2.  Configure the desired password generation options in the "Password Generator Options" section.
    * Set the "Password Length" and "Amount of Passwords".
    * Check the boxes for the character types you want to include (Numbers, Symbols, Uppercase, Lowercase).
    * Enable the options to exclude unwanted characters or sequences.
    * If you want to use specific symbols, you can (in the current version, the symbols are predefined).
    * If you wish your settings to be saved for future visits, check "Save Settings".
3.  Click the "Generate" button.
4.  The generated passwords will appear in the "Generated Passwords" section.
5.  Use the "Copy All" button to copy all passwords, or the copy icon next to each password to copy it individually.

## License
[![License: GPL v3](https://img.shields.io/badge/License:-GPLv3-important.svg)](https://www.gnu.org/licenses/gpl-3.0)
