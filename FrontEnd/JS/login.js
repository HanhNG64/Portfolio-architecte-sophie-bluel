const HOST = "http://localhost:5678/api";
const TOKEN_KEY = "sbtoken";
const EMAIL_PATTERN =/^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/; // Regex for email
const PW_PATTERN = /^(?=.*[A-z])(?=.*[A-Z])(?=.*[0-9])\S{6,12}$/; // Regex for password : At least one letter, with a capital letter, a number, between 6 and 12 characters.

const INPUT_NAME = {
  EMAIL:"email",
  PWD : "pwd",
  CONNECTION: "connection"
}

const MAP_PATTERN = new Map([
  [INPUT_NAME.EMAIL, EMAIL_PATTERN],
  [INPUT_NAME.PWD, PW_PATTERN]
]);

const MAP_LOGIN_ERROR = new Map([
  [INPUT_NAME.EMAIL, 'E-mail non valide.'],
  [INPUT_NAME.PWD, 'Mot de passe non valide.'],
  [INPUT_NAME.CONNECTION, 'Connexion impossible.'],
]);

const CAUSE_LOGIN_ERROR = new Map([
  [INPUT_NAME.EMAIL, "Le format d'e-mail non rescpecté."],
  [INPUT_NAME.PWD, "Le mot de passe doit avoir au moins une lettre, avec une majuscule, un chiffre, entre 6 et 12 caractères."],
  [401, 'Mot de passe non valide.'],
  [404, 'E-mail non valide.']
]);

// Subscribe listeners
const form = document.getElementById("login");
document.getElementById("login").addEventListener("submit", handleLogin);
form.querySelector('[name=email]').addEventListener('blur', handleValidate);
form.querySelector('[name=pwd]').addEventListener('blur', handleValidate);

// Create an element to display the error message
let errorElt = document.createElement('p');
const submitBtn = document.querySelector("[type=submit]");
submitBtn.parentNode.insertBefore(errorElt,submitBtn);

// Unsubscribe all listeners before unload
window.addEventListener('beforeunload', (e)=>{
   unsubscribeListeners();
});

/********************************** FUNCTIONS ************************** */

/**
 * The custom error
 */
class LoginCustomError extends Error {
  constructor(action,errorStatus) {
      super();
      this.name = "LoginCustomError";

      let errorMessage = MAP_LOGIN_ERROR.has(action) ? MAP_LOGIN_ERROR.get(action) + " " : "";
      let cause = CAUSE_LOGIN_ERROR.has(errorStatus) ? CAUSE_LOGIN_ERROR.get(errorStatus) :  "";

      this.message  = `${errorMessage} <br> ${cause}`;
  }

  /**
   * Error display management
   */
  handleError(isValide) {
      if(isValide) {
        errorElt.innerHTML = "";
        errorElt.classList.remove('error');
      }
      else {
        errorElt.innerHTML = this.message;
        errorElt.classList.add('error');
      }
  }
}

/**
 * Connect the user as Admin
 * @param {*} event 
 * @returns 
 */
async function handleLogin(event) {
  // Disable page loading
  event.preventDefault();

  try {
    // Log the user
    var userLogged = await logIn(event);

    // Store the token in localStorage
    let token = userLogged.token;
    window.sessionStorage.setItem(TOKEN_KEY, token);

    // Redirect to home page
    window.location.href = "../index.html";
  } catch (error) {
    if(error instanceof LoginCustomError) {
      error.handleError(false);
    }
    else {
      new LoginCustomError(INPUT_NAME.CONNECTION).handleError(false);
    }
  }
}

/**
 * Log the user passed as a parameter
 * @param {*} user The user to log
 * @returns A user with his token and id
 */
async function logIn(user) {  
    var userToLog = buildUser(user);
    const reponse = await fetch(HOST+"/users/login", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json" },
          body: JSON.stringify(userToLog)
    });

    if (!reponse.ok) {
      throw  new LoginCustomError(INPUT_NAME.CONNECTION,reponse.status);
    }

    return reponse.json();
}

/**
 * Build an user from the form
 * @param {*} event
 * @returns a user with his email and pwd
 */
function buildUser(event) {
    const userToLog = {
        email: event.target.querySelector("[name=email]").value,
        password: event.target.querySelector("[name=pwd]").value,
    };
  
    return userToLog;
}

/**
 * Validate the entry 
 * @param {*} event 
 */
function handleValidate(event) {
  const input =  event.target;
  const pattern = MAP_PATTERN.get(input.name);
  const value =  input.value.trim();
  const isValide = (value.length === 0 ? true :  pattern.test(value));  

  new LoginCustomError(input.name, input.name).handleError(isValide);
}

/**
 * Unsubscribe all listeners
 */
function unsubscribeListeners() {
  console.log("BYE unsubscribeListeners");
  const form = document.getElementById("login");
  document.getElementById("login").removeEventListener("submit", handleLogin);
  form.querySelector('[name=email]').removeEventListener('blur', handleValidate);
  form.querySelector('[name=pwd]').removeEventListener('blur', handleValidate);
}