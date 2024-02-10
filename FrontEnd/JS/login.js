const HOST = "http://localhost:5678";
const TOKEN_KEY = "sbtoken";

// Ecouter le formulaire
addListerForm();

/********************************** FONCTIONS ************************** */

/**
 * Ajouter un listener au formulaire
 */
function addListerForm() {
  const loginForm = document.getElementById("login");
  loginForm.addEventListener("submit", function (event) {
    // Désactiver le chargement de la page
    event.preventDefault();
    connect(event);
  });

  
  const email = document.getElementById("email");
  email.addEventListener("keyup", function (event) {
    if (email.validity.typeMismatch) {
      email.setCustomValidity("Veuillez entrer un email valide");
    } else {
      email.setCustomValidity("");
    }
  });
}

async function connect(event) {
  try {
    // Se logger
    var userLogged = await logIn(event);

    // Stocker le token dans localStorage
    let token = userLogged.token;
    window.localStorage.setItem(TOKEN_KEY, token);
    console.log(window.localStorage.getItem(TOKEN_KEY));

    // Redirection vers la page d'accueil
    window.location.href = "../index.html";
  } catch (error) {
    console.log(error);
  }
}

/**
 * Logger l'utilisateur passé en paramètre
 * @param {*} user L'utlisateur à logger
 * @returns L'utilisateur loggé contenant un token et un id
 */
async function logIn(user) {
    // Créer la charge utile
    var userToLog = getUser(user);
    var userJSon = JSON.stringify(userToLog);

    // Se logger
    try {
        const reponse = await fetch(HOST+"/api/users/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: userJSon,
        });

        if (!reponse.ok) {
            throw new Error(`Login Erreur : ${reponse.status}`);
        }

        return reponse.json();
    } catch (error) {
        // S'il est invalide, on affiche un message d'erreur personnalisé
        var errorElt = document.querySelector(".error");
        errorElt.innerHTML = "Login Erreur";
        errorElt.className = "error active";
        throw error;
    }
}

/**
 * Récupérer l'utilisateur à partir de l'évenement du formaulaire
 * @param {*} event
 * @returns Renvoyer un utilisateur avec son email et son mdp
 */
function getUser(event) {
    const userToLog = {
        // email: event.target.querySelector("[name=email]").value,
        // password: event.target.querySelector("[name=pwd]").value,
        // TEST - A ENLEVER
        email: "sophie.bluel@test.tld",
        password: "S0phie",
    };
  
    return userToLog;
}
  
