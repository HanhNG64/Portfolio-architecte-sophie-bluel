const HOST = "http://localhost:5678/api";
const TOKEN_KEY = "sbtoken";
const BUTTON_ALL_ID = 0; // ID of the filter button for ALL
const BUTTON_ALL_NAME = "Tous"; // Name of the filter button for ALL
const TITLE_PATTERN = /^[a-zA-Z0-9._\séèàç,"#?!@$%^&*;'+-]{3,50}$/; // Regex for image title
const IMG_EXT = ["png", "jpg"]; 

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

// After closing of modals
window.addEventListener('modalClosed', (e) => {
    if(e.detail.currentModal === addModal ) {
        currentModal = deleteModal;

        // if close by cliking on the outside modal or on the xmark or after adding work from the form
        if(e.detail.currentTarget === addModal || e.detail.currentTarget === addModal.querySelector('.modal-close') ||  e.detail.currentTarget === document.getElementById("data-form")) {
            closeModal(e);
        }

        // Notify the closure of the modal
        addModal.dispatchEvent(new CustomEvent("modalClosed"));
    }
    else{
        currentModal = null;
    }
});

// Connexion mode
updateConnectionMode();
document.querySelector('.logout').addEventListener('click', (event)=>{
    window.localStorage.removeItem(TOKEN_KEY);
    updateConnectionMode();
});

// Get and display works from API
try {
    works = await getWorks();
    generateWorks(works);
}
catch(error) {
    console.log(error);
}

 // Get and display categories from API
try {
    Array.prototype.push.apply(categories, await getCategories()); 
}
catch(error) {
    console.log(error);
}
generateFilters(categories);

// Apply default filter
const categorie = categories.filter(categorie=> categorie.id === BUTTON_ALL_ID).shift();
if(categorie && categorySelectedBtn === undefined) {
    const btn = document.getElementById(categorie.id);
    btn.classList.add("selected");
    categorySelectedBtn = btn;
}

// Open delete modal
document.querySelector('.btn-modify').addEventListener('click', openDeleteModal);

// Open add modal
document.querySelector('.btn-add').addEventListener('click', opendAddModal);


/********************************** FUNCTIONS ************************** */

/**
 * Adapt the home page according to the connection mode
 */
function updateConnectionMode(){
    var isAdminMode = window.localStorage.getItem(TOKEN_KEY);

    var logoutDisplay = isAdminMode ? "block" : "none";
    var loginDisplay = isAdminMode ? "none" : "block";
    var editionModeDisplay = isAdminMode ? "flex" : "none";

    var loginElt = document.querySelector('.login');
    loginElt.style.display = loginDisplay;

    var logoutElt = document.querySelector('.logout');
    logoutElt.style.display = logoutDisplay;

    var modifyElt = document.querySelector('.btn-modify');
    modifyElt.style.display = logoutDisplay;

    var edtionModeElt = document.querySelector('.edition-mode');
    edtionModeElt.style.display = editionModeDisplay;
}

/**
 * Get works from API 
 * @returns Return works
 */
async function getWorks() {
    const reponse = await fetch(HOST+"/works");
    if(!reponse.ok){
        throw new Error("Récupération de travaux: "+ reponse.status);
    }
    return reponse.json();
}

/**
 * Post a new work to API
 * @param {*} work Work to post
 * @returns 
 */
async function postWork(work) {
    try {
        var storedToken = window.localStorage.getItem(TOKEN_KEY);

        if(storedToken === null || storedToken === undefined) return;

        const reponse = await fetch(HOST+"/works", {
            method: "POST",
            headers: {  authorization : `Bearer ${storedToken}`},
            body: work,
    });

    if (!reponse.ok) {
        throw new Error(`Ajout Erreur : ${reponse.status}`);
    }

    return reponse.json();
    } catch (error) {
        throw error;
    }
}

/**
 * Delete a work from the API.
 * @param {*} workId the ID of the work to delete
 * @returns 
 */
async function deleteWork(workId){
    try{
        var storedToken =window.localStorage.getItem(TOKEN_KEY);

        if(storedToken === null || storedToken === undefined) return;

        const reponse = await fetch(`http://localhost:5678/api/works/${workId}`, {
            method: "DELETE",
            headers: {  authorization : `Bearer ${storedToken}` }
        });

        if(reponse.status===204){
            // Update works list
            console.log("AV SUP:"+works.length);
            works = works.filter(work => work.id!==workId);
            console.log("AP SUP:"+works.length);
            // Update the display
            document.querySelectorAll(".work"+workId).forEach(work=> {
                work.remove();
            })
        }
        else{
            throw new Error(`Suppression : ${reponse.status}`);
        }
    }catch(error){
        console.log("Suppression : " + error);  
    }
}

/**
 * Display works in the home page
 * @param {*} works Works to display
 */
function generateWorks(works) {
    const gallery = document.querySelector('.gallery');
    gallery.innerHTML = "";
  
    works.forEach((work) => {
        try {
            // Create a node for the work
            const figure = createWorkNode(work);
            // Create a caption for the work
            const figcaption = document.createElement('figcaption');
            figcaption.innerText = work.title;

            figure.appendChild(figcaption);
            gallery.appendChild(figure);
        } catch (error) {
            console.log(error);
        }
    });
}

/**
 * Get categories from the API
 * @returns Return categories
 */
async function getCategories(){
    const reponse = await fetch(HOST+"/categories");
    if(!reponse.ok) {
        throw new Error("Récupération de catégories: "+ reponse.status);
    }

    return reponse.json();
}

/**
 * Generate buttons to filter categories
 * @param {*} categories Categories to filter
 * @param {*} works Works used for the filtering function
 */
function generateFilters(categories) {
    const filterElt = document.querySelector('.filter');
    categories.forEach((categorie) => {
        // Create button for a given category
        const btn = document.createElement("button");
        btn.className = categorie.name;
        btn.id = categorie.id;
        btn.innerText = categorie.name;
        filterElt.appendChild(btn);
  
        // Add listener
        btn.addEventListener('click', (event) => {
            btn.classList.add("selected");
            filter(Number(event.target.id));

           if(categorySelectedBtn) categorySelectedBtn.classList.remove("selected");
            categorySelectedBtn = btn;    
        });
    });

    /**
     * Filter works in a category 
     * @param {*} categorieId The category identifier to filter
     * @param {*} works Works to filter
     */
    function filter(categorieId) {
        if(works.length) {
            var filterWorks = categorieId === BUTTON_ALL_ID ? works :  works.filter(work => categorieId === work.categoryId);
            generateWorks(filterWorks);
        }
    }
}

/**
 * Open the modal for deleting work
 * @param {*} event 
 */
function openDeleteModal(event) {
    event.preventDefault();

    const modal = document.querySelector('.delete-modal');
    modal.style.display = null;
    modal.removeAttribute('aria-hidden');
    modal.setAttribute('aria-modal',true);

    modal.addEventListener('click', closeModal);
    modal.querySelector('.modal-close').addEventListener('click',  closeModal);
    modal.querySelector('.modal-stop').addEventListener('click',stopPropagation);

    deleteModal = modal;
    currentModal = deleteModal;

    // Display works in the modal
    generateWorksInModal();
}

/**
 * Open the modal for adding new work
 * @param {*} event 
 */
function opendAddModal(event) {
    event.preventDefault();

    const modal = document.querySelector('.add-modal');
    modal.style.display = null;
    modal.removeAttribute('aria-hidden');
    modal.setAttribute('aria-modal',true);

    modal.addEventListener('modalClosed', (e)=>{
        e.preventDefault();
        document.getElementById("data-form").reset();
        refreshPreview();
    });

    modal.addEventListener('click', closeModal);
    modal.querySelector('.modal-previous').addEventListener('click', closeModal);
    modal.querySelector('.modal-close').addEventListener('click', closeModal);
    modal.querySelector('.modal-stop').addEventListener('click',stopPropagation);
    document.getElementById("data-form").addEventListener('submit', addWork);
    document.querySelector('input[type=file]').addEventListener('change', refreshPreview);

    addModal = modal;
    currentModal = addModal;

    // Build select catetogies options
    generateCategoriesOptions();
}

/**
 * Add new work in the API and refresh the display
 * @param {*} event 
 */
async function addWork(event){
    event.preventDefault();
    try {
        //Validate 
        if(!validateWork(event)) {
            var errorElt = document.querySelector(".add-modal-error");
            errorElt.style.display = "block";
            errorElt.innerHTML = "Les conditions ne sont pas requises.";
            errorElt.className = "add-modal-error active";
            return;
        }

        // Add a work in the API 
        var data = buildFormData(event);
        const work = await postWork(data);
        work.categoryId = Number(work.categoryId);

        // Update the display
        updateWorksList(work);

        // Close modal
        closeModal(event);
    } catch (error) {
        console.log(error);
    }
}

/**
 * Close current modal
 * @param {*} event 
 * @returns 
 */
function closeModal(event){
    event.preventDefault();

    if(currentModal === undefined) return;

    currentModal.style.display = "none";
    currentModal.setAttribute('aria-hidden',true);
    currentModal.removeAttribute('aria-modal');

    currentModal.removeEventListener('click', closeModal);
    currentModal.querySelector('.modal-close').removeEventListener('click', closeModal);
    currentModal.querySelector('.modal-stop').removeEventListener('click', stopPropagation);

    stopPropagation(event);

    // Notify the closing of the current modal
    const target = event.target;
    window.dispatchEvent(new CustomEvent("modalClosed", { detail : {currentModal, currentTarget: target}}));
}

/**
 * Stop the propagation of the event
 * @param {*} event 
 */
function stopPropagation(event) {
    event.stopPropagation(); 
}

/**
 * Create a node for a work
 * @param {*} work Work to display
 * @returns Return the node
 */
function createWorkNode(work) {
    try {
        const figure = document.createElement("figure");
        figure.className = "work"+work.id;

        const img = document.createElement("img");
        img.src = work.imageUrl;
        img.alt = work.title;
        figure.appendChild(img);
        return figure;
    } catch (error) {
        throw new Error("Work invalid");
    }
}

/**
 * Generate and display works in the modal
 * @param {*} works 
 */
function generateWorksInModal() {
    const gallery = document.querySelector('.modal-gallery');
    gallery.innerHTML = "";
  
    works.forEach((work) => {
        try {
            const figure = createWorkNode(work);

            const trashImg = document.createElement("img");
            trashImg.classList.add("trash");
            trashImg.id = work.id;
            trashImg.src = "../assets/icons/trash-can-solid.png";
            trashImg.alt = "trash "+work.title;
            trashImg.addEventListener('click', (event) => {
                deleteWork(Number(event.target.id));
            });

            figure.appendChild(trashImg);
            gallery.appendChild(figure);
        } catch (error) {
            console.log(error);
        }
    });
}

/**
 * Generate the selected categories options
 * @param {*} catégories Category choices
 */
function generateCategoriesOptions() {
    const categoryElt = document.querySelector('.categorySelect');
    categoryElt.innerHTML="";
    var filterCategories = categories.filter(category => category.id !== BUTTON_ALL_ID )
    filterCategories.forEach((categorie) => {
        const option = document.createElement("option");
        option.value = categorie.id;
        option.text = categorie.name;
        categoryElt.appendChild(option);
    });
}

/**
 * Refresh the preview of new work
 */
function refreshPreview() {
    var file = document.querySelector('input[type=file]').files[0];

    var preview = document.querySelector('.preview');
    var loadImage = document.querySelector('.loadImage');

    while (preview.firstChild) {
        preview.removeChild(preview.firstChild);
    }

    if(file) {
        preview.src = window.URL.createObjectURL(file);
        preview.alt = file.name;
        preview.style.display = "block";
        loadImage.style.display = "none";
    }
    else{
        preview.style.display = "none";
        loadImage.style.display = "flex";
    }
 }

 /**
  * Update the list of works and refresh the display
  * @param {*} work New work to add in the list works
  */
function updateWorksList(work){
    // Update the list of works
    works.push(work);

    // Refresh the display
    try {
        const gallery = document.querySelector('.gallery');
        const figure = createWorkNode(work);
        const figcaption = document.createElement("figcaption");
        figcaption.innerText = work.title;
        figure.appendChild(figcaption);
        gallery.appendChild(figure);
    } catch (error) {
        console.log(error);
    }
}

/**
 * Build FormData from a form
 * @param {*} event 
 * @returns a FormData
 */
function buildFormData(event) {
    const image = event.target.querySelector('input[type=file]').files[0];
    const title = event.target.querySelector('[name=title]').value;
    const category = event.target.querySelector('[name=categorySelect]').value;
   
    const formData = new FormData();
    formData.append("image",image);
    formData.append("title",title);
    formData.append("category", Number(category));
  
    return formData;
}

/**
 * Valid new work to add
 * @param {*} event 
 * @returns True if all data is required, false Otherwise
 */
function validateWork(event) {
    const image = event.target.querySelector('input[type=file]').files[0];
    const title = event.target.querySelector('[name=title]').value;
    const category = event.target.querySelector('[name=categorySelect]').value;
    
    var imageValid = image === undefined ? false : fileSizeMo(image.size) <= 4;// Accept only images less than 4MB
    var extensionValid = image === undefined ? false : IMG_EXT.includes(fileExtension(image));
    var titleValid = title === undefined ? false : TITLE_PATTERN.test(title.trim());  
    var categoryValid = category !== undefined;  
 
    console.log("fileExtension(image)"+fileExtension(image)+ "  " + extensionValid);
    return  titleValid && imageValid && categoryValid && extensionValid;
}

/**
 * Convert file size to Mo
 * @param {*} size size in Oct
 * @returns size in Mo
 */
function fileSizeMo(size){
    return (size/(1024*1024));
}

/**
 * Get file extension
 * @param {*} file The file
 * @returns the extension the of the file
 */
function fileExtension(file){
    const [ext, ...fileName] = file.name.split('.').reverse();
    return ext;
}