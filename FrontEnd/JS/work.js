const HOST = "http://localhost:5678";
const TOKEN_KEY = "sbtoken";
const BUTTON_ALL_ID = 0; // L'identifiant 0  est réservé pour le bouton Tous
const BUTTON_ALL_NAME = "Tous";

var categorySelectedBtn;
var currentModal;
var deleteModal;
var addModal;

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

// Open delete modal
document.querySelector('.btn-modify').addEventListener('click', opendDeleteModal);

// Open add modal
document.querySelector('.btn-add').addEventListener('click', opendAddModal);


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
        const figure = createImgElement(work);
        const figcaption = document.createElement("figcaption");
        figcaption.innerText = work.title;
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

function opendDeleteModal(event) {
    event.preventDefault();

    const modal = document.querySelector('.delete-modal');
    modal.style.display = null;
    modal.removeAttribute('aria-hidden');
    modal.setAttribute('aria-modal',true);

    modal.addEventListener('click', closeModal);
    modal.querySelector('.modal-close').addEventListener('click', closeModal);
    modal.querySelector('.modal-stop').addEventListener('click',stopPropagation);

    deleteModal = modal;
    currentModal = modal;

    generateWorksInModal(works);
}

function closeModal(event){
    event.preventDefault();

    if(currentModal === null) return;

    currentModal.style.display = "none";
    currentModal.setAttribute('aria-hidden',true);
    currentModal.removeAttribute('aria-modal');

    currentModal.removeEventListener('click', closeModal);
    currentModal.querySelector('.modal-close').removeEventListener('click', closeModal);
    currentModal.querySelector('.modal-stop').removeEventListener('click',stopPropagation);

    currentModal = currentModal === addModal ? deleteModal : null;
}

function stopPropagation(event) {
    event.stopPropagation(); 
}

function createImgElement(work ) {
    const figure = document.createElement("figure");
    figure.id = "work"+work.id;

    const img = document.createElement("img");
    img.src = work.imageUrl;
    img.alt = work.title;
    figure.appendChild(img);
    return figure;
}

function generateWorksInModal(works) {
    const gallery = document.querySelector(".modal-gallery");
    gallery.innerHTML = "";
  
    works.forEach((work) => {
        const figure = createImgElement(work);

        const trashImg = document.createElement("img");
        trashImg.classList.add("trash");
        trashImg.id = work.id;
        trashImg.src = "../assets/icons/trash-can-solid.png";
        trashImg.alt = "trash "+work.title;
        trashImg.addEventListener("click", (event) => {
            const id = event.target.id; 
            deleteWork(Number(id));
        });

        figure.appendChild(trashImg);
        gallery.appendChild(figure);
    });
}

/**
 * Supprimer un travail d'identifiant workId
 * @param {*} workId L'identifiant du travail à supprimer
 * @returns 
 */
async function deleteWork(workId){
    try{
        var debug = false; // POUR TEST - A ENLEVER
        if(debug) {
            // Mettre à jour la liste des travaux
            works = works.filter(work => work.id!==workId);
        
            // Mettre à jour la galerie
            const figureGalerie = document.getElementById("work"+workId);
            figureGalerie.remove();

            // Mettre à jour la modale
            const figureModale = document.getElementById("work"+workId);
            figureModale.remove();
        }
        else {
        var storedToken =window.localStorage.getItem(TOKEN_KEY);

        if(storedToken === null || storedToken === undefined) return;

        const reponse = await fetch(`http://localhost:5678/api/works/${workId}`, {
            method: "DELETE",
            headers: {  authorization : `Bearer ${storedToken}` }
        });

        if(reponse.status===204){
            // Mettre à jour la liste des travaux
            works = works.filter(work => work.id!==workId);
        
            // Mettre à jour la galerie
            const figureGalerie = document.getElementById("work"+workId);
            figureGalerie.remove();

            // Mettre à jour la modale
            const figureModale = document.getElementById("work"+workId);
            figureModale.remove();
        }
        else{
            throw new Error(`Suppression : ${reponse.status}`);
        }
    }
    }catch(error){
        console.log("Suppression : " + error);  
    }
}

function opendAddModal(event) {
    event.preventDefault();

    const modal = document.querySelector('.add-modal');
    modal.style.display = null;
    modal.removeAttribute('aria-hidden');
    modal.setAttribute('aria-modal',true);

    modal.addEventListener('click', closeModal);
    modal.querySelector('.modal-previous').addEventListener('click', previousModal);
    modal.querySelector('.modal-close').addEventListener('click', closeModal);
    modal.querySelector('.modal-stop').addEventListener('click',stopPropagation);

    const dataForm = document.getElementById("data-form");
    dataForm.addEventListener("submit", async function(event){
        // Désactiver le chargement de la page
        event.preventDefault();
        try {
            const work = await addProject(event);
            updateProject(work);

            // Redirection vers la page d'accueil
            window.location.href = "./index.html";
        } catch (error) {
            console.log(error);
        }
    });

    document.querySelector("input[type=file]").addEventListener("change", updateImageDisplay);

    addModal = modal;
    currentModal = modal;

    generateCategoriesOptions(categories);
}

function previousModal(event) {
    event.preventDefault();

    currentModal.style.display = "none";
    currentModal.setAttribute('aria-hidden',true);
    currentModal.removeAttribute('aria-modal');

    currentModal.removeEventListener('click', closeModal);
    currentModal.querySelector('.modal-close').removeEventListener('click', closeModal);
    currentModal.querySelector('.modal-stop').removeEventListener('click',stopPropagation);

    currentModal = deleteModal;
}

function generateCategoriesOptions(catégories) {
    const categoryElt = document.querySelector(".categorySelect");
    categoryElt.innerHTML="";
    var filterCategories = categories.filter(category => category.id !== BUTTON_ALL_ID )
    filterCategories.forEach((categorie) => {
        // Créer le bouton pour une catégorie
        const option = document.createElement("option");
        option.value = categorie.id;
        option.text = categorie.name;
        console.log(option);
        categoryElt.appendChild(option);
    });
}

function updateImageDisplay(event) {
    var preview = document.querySelector(".preview");
    while (preview.firstChild) {
      preview.removeChild(preview.firstChild);
    }

    var file = event.target.files[0];
    preview.src = window.URL.createObjectURL(file);
    preview.alt = file.name;
    preview.style.display = "block";

    var loadImage = document.querySelector(".loadImage");
    loadImage.style.display = "none";
 }

 async function addProject(event) {
    // Désactiver le chargement de la page
    event.preventDefault();
    var data = getFormData(event);
      
    try {
        var storedToken =window.localStorage.getItem(TOKEN_KEY);

        if(storedToken === null || storedToken === undefined) return;

        const reponse = await fetch(HOST+"/api/works", {
            method: "POST",
            headers: {  authorization : `Bearer ${storedToken}`},
            body: data,
    });

    if (!reponse.ok) {
        throw new Error(`Ajout Erreur : ${reponse.status}`);
    }

    return reponse.json();
    } catch (error) {
        throw error;
    }
}

function updateProject(work){
    // Mettre à jour la liste des travaux
    works.push(work);
            
    // Mettre à jour la galerie
    const gallery = document.querySelector(".gallery");
    const figure = createImgElement(work);
    const figcaption = document.createElement("figcaption");
    figcaption.innerText = work.title;
    figure.appendChild(figcaption);
    gallery.appendChild(figure);

    // Mettre à jour la modale
    const modaleGallery = document.querySelector(".modal-gallery");
    const modaleFigure = createImgElement(work);

    const trashImg = document.createElement("img");
    trashImg.classList.add("trash");
    trashImg.id = work.id;
    trashImg.src = "../assets/icons/trash-can-solid.png";
    trashImg.alt = "trash "+work.title;
    trashImg.addEventListener("click", (event) => {
        const id = event.target.id; 
        deleteWork(Number(id));
    });

    modaleFigure.appendChild(trashImg);
    modaleGallery.appendChild(figure);
}

function getFormData(event) {
    var image = event.target.querySelector("input[type=file]").files[0];
    const title = event.target.querySelector("[name=title]").value;
    const category = event.target.querySelector("[name=categorySelect]").value;
   
    const formData = new FormData();
    formData.append("image",image);
    formData.append("title",title);
    formData.append("category", Number(category));
  
    return formData;
}