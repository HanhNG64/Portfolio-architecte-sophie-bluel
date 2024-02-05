const HOST = "http://localhost:5678";
const BUTTON_ALL_ID = 0; // L'identifiant 0  est réservé pour le bouton Tous
const BUTTON_ALL_NAME = "Tous";

var categorySelectedBtn;

var works = [];
var categories = [{
    // Catégorie pour Tous
    "id": BUTTON_ALL_ID,
    "name": BUTTON_ALL_NAME
}];

// Récupérer et générer les travaux
try {
    works = await getWorks();
    generateWorks(works);
}
catch(error) {
    console.log(error);
}

 // Récupérer e générer les catégories
try {
    Array.prototype.push.apply(categories ,await getCategories()); 
}
catch(error) {
    console.log(error);
}
generateFilters(categories, works);



/********************************** FONCTIONS ************************** */

/**
 * Récupérer les travaux de l'API
 * @returns Renvoyer les travaux
 */
async function getWorks() {
    const reponse = await fetch(HOST+"/api/works");
    if(!reponse.ok){
        throw new Error("Récupération de travaux: "+ reponse.status);
    }
    return reponse.json();
}

/**
 * Générer les travaux donnés dans la page web
 * @param {*} works travaux à mettre dans la page web
 */
function generateWorks(works) {
    const gallery = document.querySelector(".gallery");
    gallery.innerHTML = "";
  
    works.forEach((work) => {
      const figure = document.createElement("figure");
  
      const img = document.createElement("img");
      img.src = work.imageUrl;
      img.alt = work.title;
  
      const figcaption = document.createElement("figcaption");
      figcaption.innerText = work.title;
  
      figure.appendChild(img);
      figure.appendChild(figcaption);
      gallery.appendChild(figure);
    });
}

/**
 * Récupérer les catégories de l'API
 * @returns Renvoyer les catégories
 */
async function getCategories(){
    const reponse = await fetch(HOST+"/api/categories");
    if(!reponse.ok) {
        throw new Error("Récupération de catégories: "+ reponse.status);
    }

    return reponse.json();
}

/**
 * Générer les boutons de filtrage par catégorie
 * @param {*} categories Les catégories existantes
 * @param {*} works Les travaux servant pour la fonction de filtrage
 */
function generateFilters(categories,works) {
    const filterElt = document.querySelector(".filter");
    categories.forEach((categorie) => {
        // Créer le bouton pour une catégorie
        const btn = document.createElement("button");
        btn.className = categorie.name;
        btn.id = categorie.id;
        btn.innerText = categorie.name;
        filterElt.appendChild(btn);
  
        // Ajouter un listener au bouton
        btn.addEventListener("click", (event) => {
            const id = event.target.id;
            btn.classList.add("selected");
            filter(Number(id),works);

            categorySelectedBtn.classList.remove("selected");
            categorySelectedBtn = btn;    
        });

        if(categorie.id === BUTTON_ALL_ID && categorySelectedBtn === undefined){
            categorySelectedBtn = btn;
        }
    });
}

/**
 * Filtrer les travaux d'une catégorie à partir de son identifiant
 * @param {*} categorieId L'identifiant de la catégorie souhaité
 * @param {*} works Les travaux à filtrer
 */
function filter(categorieId, works) {
    if(works.length) {
        var filterWorks = categorieId === BUTTON_ALL_ID ? works :  works.filter(work => categorieId === work.categoryId);
        generateWorks(filterWorks);
    }
}
  