const HOST = "http://localhost:5678/api";
const TOKEN_KEY = "sbtoken";
const EMAIL_PATTERN =/^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/; // Regex for email
const PW_PATTERN = /^(?=.*[A-z])(?=.*[A-Z])(?=.*[0-9])\S{6,12}$/; // Regex for password : At least one letter, with a capital letter, a number, between 6 and 12 characters.


// Add a listener to the form
const loginForm = document.getElementById("login");
loginForm.addEventListener("submit", function (event) {
  // Disable page loading
  event.preventDefault();
  connect(event);
});


/********************************** FUNCTIONS ************************** */

/**
 * Connect the user as Admin
 * @param {*} event 
 * @returns 
 */
async function connect(event) {
  try {
    // Validate the data entered
    if(!validate(event)){
        var errorElt = document.querySelector(".error");
        errorElt.innerHTML = "Nom d'utilisateur ou mot de passe incorrect, veuillez corriger les informations saisies.";
        errorElt.className = "error active";
        return;
    }

    // Log the user
    var userLogged = await logIn(event);

    // Store the token in localStorage
    let token = userLogged.token;
    window.localStorage.setItem(TOKEN_KEY, token);

    // Redirect to home page
    window.location.href = "../index.html";
  } catch (error) {
    console.log(error);
  }
}

/**
 * Log the user passed as a parameter
 * @param {*} user The user to log
 * @returns A user with his token and id
 */
async function logIn(user) {  
    var userToLog = buildUser(user);
    // Log the user
    try {
        const reponse = await fetch(HOST+"/users/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(userToLog)
        });

        if (!reponse.ok) {
            throw new Error(`Login Erreur : ${reponse.status}`);
        }

        return reponse.json();
    } catch (error) {
        // Display an error message
        var errorElt = document.querySelector(".error");
        errorElt.innerHTML = "Identifiant invalide.";
        errorElt.className = "error active";
        throw error;
    }
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
 * Validate user 
 * @param {*} event 
 * @returns True if all data is required, false Otherwise
 */
function validate(event) {
  var email = event.target.querySelector("[name=email]").value;
  var password = event.target.querySelector("[name=pwd]").value;

  var emailValid = email === undefined ? false :  EMAIL_PATTERN.test(email.trim());  
  var pwValid = password === undefined ? false : PW_PATTERN.test(password.trim());  

  return  emailValid && pwValid;
}
