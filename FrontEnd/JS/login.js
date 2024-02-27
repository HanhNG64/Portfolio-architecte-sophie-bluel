const HOST = "http://localhost:5678/api";
const TOKEN_KEY = "sbtoken";
const EMAIL_PATTERN =/^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/; // Regex for email
const PW_PATTERN = /^(?=.*[A-z])(?=.*[A-Z])(?=.*[0-9])\S{6,12}$/; // Regex for password : At least one letter, with a capital letter, a number, between 6 and 12 characters.

const INPUT_NAME = {
  EMAIL:"email",
  PWD : "pwd",
  IDENTIFIANT : "Identifiant",
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
  [INPUT_NAME.EMAIL, "Le format d'e-mail n'est pas valide."],
  [INPUT_NAME.PWD, "Le mot de passe doit avoir au moins une lettre, avec une majuscule, un chiffre, entre 6 et 12 caractères."],
  [INPUT_NAME.IDENTIFIANT, "Erreur d'identifiant"]
]);

// Subscribe listeners
document.getElementById("login-form").addEventListener("submit", handleLogin);

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
   * Error display management
   */
 function manageError(error) {
  let errorMessage = MAP_LOGIN_ERROR.has(error.message) ? MAP_LOGIN_ERROR.get(error.message) + " " : MAP_LOGIN_ERROR.get(INPUT_NAME.CONNECTION);
  let cause = CAUSE_LOGIN_ERROR.has(error.cause) ? CAUSE_LOGIN_ERROR.get(error.cause) :  "";

  errorElt.innerHTML =  `${errorMessage} <br> ${cause}`;
  errorElt.classList.add('error');
}

/**
 * Triggered when valid button is activated
 * @param {*} event 
 * @returns 
 */
async function handleLogin(event) {
  // Disable page loading
  event.preventDefault();

  try {

    // Validate informations 
    if(!validate(event)){
      return;
    }

    // Log the user
    var userLogged = await logIn(event);

    // Store the token in sessionStorage
    window.sessionStorage.setItem(TOKEN_KEY, userLogged.token);

    // Redirect to home page
    window.location.href = "../index.html";
  } catch (error) {
    manageError(error);
  }
}

/**
 * Validate pwd and email 
 * 
 * @param {*} event 
 * @returns True if all data is correct, false Otherwise
 */
function validate(event) {
  var email = event.target.querySelector("[name=email]").value;
  var password = event.target.querySelector("[name=pwd]").value;

  var emailValid = email === undefined ? false :  EMAIL_PATTERN.test(email.trim());  
  var pwValid = password === undefined ? false : PW_PATTERN.test(password.trim());  

  if(!emailValid) {
    manageError( new Error(INPUT_NAME.EMAIL,{ cause: INPUT_NAME.EMAIL }));
  }
  else if(!pwValid){
    manageError( new Error(INPUT_NAME.PWD,{ cause: INPUT_NAME.PWD }));
  }

  return  emailValid && pwValid;
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
        headers: {"Content-Type": "application/json" },
        body: JSON.stringify(userToLog)
    });

    if (!reponse.ok) {
      throw new Error(INPUT_NAME.CONNECTION,{ cause: INPUT_NAME.IDENTIFIANT });
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
        email: event.target.querySelector("[name=email]").value.toLowerCase(),
        password: event.target.querySelector("[name=pwd]").value,
    };
  
    return userToLog;
}

/**
 * Unsubscribe all listeners
 */
function unsubscribeListeners() {
  document.getElementById("login-form").removeEventListener("submit", handleLogin);
}