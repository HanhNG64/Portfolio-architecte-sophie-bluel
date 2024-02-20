const HOST = "http://localhost:5678/api";
const TOKEN_KEY = "sbtoken";
const BUTTON_ALL_ID = 0; // ID of the filter button for ALL
const BUTTON_ALL_NAME = "Tous"; // Name of the filter button for ALL
const TITLE_PATTERN = /^[a-zA-Z0-9._\séèàçù,"#?!@$%^&*;'+-]{3,50}$/; // Regex for image title
const IMG_EXT = ["png", "jpg"]; 
const ACTION = {
    GET_WORK:"0",
    GET_CATEGORY:"1",
    POST : "2",
    DELETE : "3",
    UPLOAD_FILE: "4",
    IMAGE_TITLE: "5",
    CATEGORY_SELECT: "6",
    CONNECTION: "7",
    OTHER: "10"
}
const MAP_ERROR = new Map([
    [ACTION.GET_WORK, 'Impossible de récupérer les travaux.'],
    [ACTION.GET_CATEGORY, 'Impossible de récupérer les catégories.'],
    [ACTION.POST, 'Impossible d\'ajouter le travail.'],
    [ACTION.DELETE, 'Impossible de supprimer le travail.'],
    [ACTION.UPLOAD_FILE, 'Le fichier est trop volumineux ou l\'extension non valide. <br>Taille maximale: 4Mo'],
    [ACTION.IMAGE_TITLE, 'Le titre doit être entre 3 et 50 caractères.'],
    [ACTION.CATEGORY_SELECT, 'La catégorie n\'est pas valide.'],
    [ACTION.CONNECTION, 'Connexion impossible.'],
    [ACTION.OTHER, 'Oups']
]);
const CAUSE_ERROR = new Map([
    [401, 'Authentification erronée.'],
    [404, 'Ressource non trouvée.']
]);
const MODE = {
    CONSULTATION :  0,
    EDITING : 1
}

let currentCategoryFilter;
let currentModal;
let deleteModal;
let addModal;
let fileChanged = false;  // Flag indicates that the user has already changed the file at least one
let categoryChanged = false; // Flag indicates that the user has already changed the options at least one

let works = [];
let categories = [{
    // Catégorie pour Tous
    "id": BUTTON_ALL_ID,
    "name": BUTTON_ALL_NAME
}];

const editingMode = (() => {
    let mode = MODE.CONSULTATION;

    return {
        updateEditing: () => { 
            var hasToken = window.sessionStorage.getItem(TOKEN_KEY) !== null;
            mode = hasToken ? MODE.EDITING : MODE.CONSULTATION;
        },
        isEditing: () => {return mode === MODE.EDITING}
    };
})();

// Unsubscribe all listeners before unload
window.addEventListener('beforeunload', (e)=>{
    unsubscribeListeners();
});

// Run the application
try {
    run();
} catch(error){
    manageError(new Error(ACTION.OTHER));
}
finally {
    // Adapt the home page according to the editing mode
    editingMode.updateEditing();
    refreshHomePage(editingMode.isEditing());
}

/************* FUNCTIONS EXECUTION *************/

/**
 * Execute the applciation
 * @returns 
 */
async function run() {
    // Add Mode Edition
    const editionModeButton = document.createElement("div");
    editionModeButton.innerHTML = "<div class='edition-mode'><img src='./assets/icons/vector.png' alt='vector'><span class='text'>Mode edition</span></div>";
    let header = document.querySelector("header");
    header.parentNode.insertBefore(editionModeButton,header);

    // Add the button "modifier" to edit
    const modifyButton = document.createElement("div");
    modifyButton.innerHTML = "<button class='btn-modify'><img src='./assets/icons/group.png' alt='group'><span class='text'>modifier</span></button>";
    let porfolio = document.getElementById("portfolio");
    porfolio.insertBefore(modifyButton,porfolio.querySelector("h2"));

    // Create an element to display the error message
    let homePageErrorElt = document.createElement('p');
    homePageErrorElt.classList.add('message-error');
    const filterElt = document.querySelector('.filter');
    filterElt.parentNode.insertBefore(homePageErrorElt,filterElt);

    let addModalErrorElt = document.createElement('p');
    const formElt = document.getElementById("data-form");
    formElt.parentNode.insertBefore(addModalErrorElt,formElt);

    // Hide modals
    document.querySelector('.add-modal').style.display = "none";
    document.querySelector('.delete-modal').style.display = "none";

    // Get and display works from API
    try {
        works = await getWorks();
        generateGalleryNode(works);
    }
    catch(error) {
        manageError(error);
    }

    // Get and display categories from API
    try {
        Array.prototype.push.apply(categories, await getCategories()); 
        generateFilterNode(categories);

        // Apply default filter
        const categorie = categories.filter(categorie=> categorie.id === BUTTON_ALL_ID).shift();
        if(categorie && currentCategoryFilter === undefined) {
            const btn = document.getElementById(categorie.id);
            btn.classList.add("selected");
            currentCategoryFilter = btn;
        }
    }
    catch(error) {
        manageError(error);
    }

    // Initialize listeners
    document.querySelector('.btn-modify').addEventListener('click', openDeleteModal);
    document.querySelector('.btn-add').addEventListener('click', opendAddModal);
    document.querySelector('.login').addEventListener('click', logout);

    window.addEventListener('newModalOpened', (e) => {
        if(e.detail !== currentModal ) {
            hideModal(e);
        }
    });
}

/**
 * Adapt the home page according to the editing mode. 
 * 
 * @param {*} isEditingMode 
 */
function refreshHomePage(isEditingMode){
    var loginElt = document.querySelector('.login');
    loginElt.innerText = isEditingMode ? "logout" :"login";
    loginElt.href =  isEditingMode ? "#" : "./login.html";
  
    var modifyElt = document.querySelector('.btn-modify');
    modifyElt.style.display = isEditingMode ? "block" : "none";

    var edtionModeElt = document.querySelector('.edition-mode');
    edtionModeElt.style.display = isEditingMode ? "flex" : "none";

    var headerElt = document.querySelector('header');
    headerElt.style.margin =  isEditingMode ? "38px auto 92px auto" : "50px auto 139px auto";

    var filterElt = document.querySelector('.filter');
    filterElt.style.display =  isEditingMode ? "none" : "flex";

    var galleryElt = document.querySelector('.gallery');
    galleryElt.style.paddingTop =  isEditingMode ? "51px" : "0";
}

/**
 * Logout the editing mode.
 * @param {*} event 
 */
function logout(event){
    if(editingMode.isEditing()) {
        // Remove token and refresh the home page
        window.sessionStorage.removeItem(TOKEN_KEY);
        window.location.href = "./index.html";
    }
}

/**************** FUNCTIONS API ***************/
 /**
   * Error display management
   */
function manageError(error) { 
    let errorMessage = MAP_ERROR.has(error.message) ? MAP_ERROR.get(error.message) + " " :  (error instanceof TypeError) ? MAP_ERROR.get(ACTION.CONNECTION) : MAP_ERROR.get(ACTION.OTHER);
    let cause = CAUSE_ERROR.has(error.cause) ? CAUSE_ERROR.get(error.cause) :  "";
    
    const page = currentModal ? currentModal : document;
    const errorElt = page.querySelector('.message-error');
    errorElt.innerHTML = `${errorMessage} <br> ${cause}`;
    errorElt.style.display = "block"; 
    errorElt.style.left = "50%";
    errorElt.style.transform= currentModal ? "translate(-50%,80%)" : "translate(-50%,-50%)";
}

/**
 * Get works from API 
 * @returns Return works
 */
async function getWorks() {
    const reponse = await fetch(`${HOST}/works`);
    if(!reponse.ok){
        throw new Error(ACTION.GET_WORK,{ cause: reponse.status });
    }
    return reponse.json();
}

/**
 * Post a new work to API
 * @param {*} work Work to post
 * @returns 
 */
async function postWork(work) {
    const reponse = await fetch(`${HOST}/works`, {
        method: "POST",
        headers: { 
            authorization : `Bearer ${window.sessionStorage.getItem(TOKEN_KEY)}`},
            body: work,
    });

    if (!reponse.ok) {
        throw new Error(ACTION.POST,{ cause: reponse.status });
    }
    return reponse.json();
}

/**
 * Delete a work from the API.
 * @param {*} workId the ID of the work to delete
 * @returns 
 */
async function deleteWork(workId){
    const reponse = await fetch(`${HOST}/worksr/${workId}`, {
            method: "DELETE",
            headers: {  authorization : `Bearer ${window.sessionStorage.getItem(TOKEN_KEY)}` }
    });

    if(!reponse.ok){
        throw new Error(ACTION.DELETE,{ cause: reponse.status });
    }
}

/**
 * Add new work in the API and refresh the display
 * @param {*} event 
 */
async function addWork(event){
    event.preventDefault();
    try {
        // Add a work in the API 
        var data = buildFormData(event);
        const work = await postWork(data);
        work.categoryId = Number(work.categoryId);

        // Update the display
        updateWorksList(work);

        // hide modal
        hideModal(event);
    } catch (error) {
        manageError(error);
    }
}

/**
 * Remove a work from the API and refresh the display
 * @param {*} event 
 */
async function removeWork(event) {
    try {
        const workId =Number(event.target.id);
        await deleteWork(workId);
      
        // Update works list
        works = works.filter(work => work.id!==workId);
    
        // Update the display
        unsubscribeTrashButton(workId);
        document.querySelectorAll(".work"+workId).forEach(work=> work.remove());
    } catch (error) {
        manageError(error);
    }
}

/**
 * Get categories from the API
 * @returns Return categories
 */
async function getCategories(){
    const reponse = await fetch(`${HOST}/categoriesd`);
    if(!reponse.ok) {
        throw new Error(ACTION.GET_CATEGORY,{ cause: reponse.status });
    }

    return reponse.json();
}

 /**
  * Update the list of works and refresh the display
  * @param {*} work New work to add in the list works
  */
 function updateWorksList(work){
    // Update the list of works
    works.push(work);

    // Refresh the display
    const gallery = document.querySelector('.gallery');
    const figure = createWorkNode(work);
    const figcaption = document.createElement("figcaption");
    figcaption.innerText = work.title;
    figure.appendChild(figcaption);
    gallery.appendChild(figure);
}

/*********** FUNCTIONS HTML ************** */

/**
 * Display works in the home page
 * @param {*} works Works to display
 */
function generateGalleryNode(works) {
    const gallery = document.querySelector('.gallery');
    gallery.innerHTML = "";
  
    works.forEach((work) => {
        // Create a node for the work
        const figure = createWorkNode(work);
        // Create a caption for the work
        const figcaption = document.createElement('figcaption');
        figcaption.innerText = work.title;

        figure.appendChild(figcaption);
        gallery.appendChild(figure);
    });
}

/**
 * Generate and display works in the modal
 * @param {*} works 
 */
function generateDeleteGalleryNode() {
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
            trashImg.addEventListener('click', removeWork);

            figure.appendChild(trashImg);
            gallery.appendChild(figure);
        } catch (error) {
            handleError(error);
        }
    });
}

/**
 * Generate buttons to filter categories
 * @param {*} categories Categories to filter
 * @param {*} works Works used for the filtering function
 */
function generateFilterNode(categories) {
    const filterElt = document.querySelector('.filter');
    categories.forEach((categorie) => {
        // Create button for a given category
        const btn = document.createElement("button");
        btn.className = categorie.name;
        btn.id = categorie.id;
        btn.innerText = categorie.name;
        filterElt.appendChild(btn);
  
        // Add listener
        btn.addEventListener('click', handleFilter);
    });
}

/**
 * Create a node for a work
 * @param {*} work Work to display
 * @returns Return the node
 */
function createWorkNode(work) {
    const figure = document.createElement("figure");
    figure.className = "work"+work.id;

    const img = document.createElement("img");
    img.src = work.imageUrl;
    img.alt = work.title;
    figure.appendChild(img);
    return figure;
}

/**
 * Generate the selected categories options
 * @param {*} catégories Category choices
 */
function buildCategoriesOptions() {
    const categoryElt = document.querySelector('.categorySelect');
    categoryElt.innerHTML="";

    categories.forEach((category) => {
        const option = document.createElement("option");
        option.value = category.id;
        option.text = category.id === BUTTON_ALL_ID ? " " : category.name;
        categoryElt.appendChild(option);
    });
}

/**
* Filter works in a category 
* @param {*} categorieId The category identifier to filter
* @param {*} works Works to filter
*/
function handleFilter(event) {
    const btn = event.target;
    btn.classList.add("selected");
    filter(Number(btn.id));

    if(currentCategoryFilter) currentCategoryFilter.classList.remove("selected");
    currentCategoryFilter = btn;    

    function filter(categorieId) {
        if(works.length) {
            var filterWorks = categorieId === BUTTON_ALL_ID ? works :  works.filter(work => categorieId === work.categoryId);
            generateGalleryNode(filterWorks);
        }
    }
}

/*********** FUNCTIONS MODAL ************** */

/**
 * Open the modal for adding new work
 * @param {*} event 
 */
function opendAddModal(event) {
    event.preventDefault();

    const modal = document.querySelector('.add-modal');
    modal.style.display = "flex";
    modal.removeAttribute('aria-hidden');
    modal.setAttribute('aria-modal',true);

    if(addModal === undefined) {
        // Create an element to display the error message
        let addModalErrorElt = document.createElement('p');
        addModalErrorElt.classList.add('message-error');
        const formModalElt = document.getElementById("data-form");
        formModalElt.parentNode.insertBefore(addModalErrorElt,formModalElt);

        modal.addEventListener('click', hideModal);
        modal.querySelector('.modal-previous').addEventListener('click', previousModal);
        modal.querySelector('.modal-close').addEventListener('click', hideModal);
        modal.querySelector('.modal-stop').addEventListener('click',stopPropagation);
        document.getElementById("data-form").addEventListener('submit', addWork);
        document.querySelector('input[type=file]').addEventListener('change', handleFile);
        document.querySelector('[name=title]').addEventListener('keyup', handleImageTitle);
        document.querySelector('[name=categorySelect]').addEventListener('change', handleCategorySelect);

        // Build select categories options
        buildCategoriesOptions();

        addModal = modal;
    }
    //hide error message
    modal.querySelector('.message-error').style.display = "none";

    fileChanged = false;
    document.getElementById("data-form").reset();
    refreshPreview(event);

    // Notify the opening of the current modal
    window.dispatchEvent(new CustomEvent("newModalOpened", { detail : modal}));

    currentModal = addModal;
}

/**
 * Open the modal for deleting work
 * @param {*} event 
 */
function openDeleteModal(event) {
    event.preventDefault();

    const modal = document.querySelector('.delete-modal');
    modal.style.display = "flex";
    modal.removeAttribute('aria-hidden');
    modal.setAttribute('aria-modal',true);

    if(deleteModal === undefined) {   
        // Create an element to display the error message
        let deletModalErrorElt = document.createElement('p');
        deletModalErrorElt.classList.add('message-error');
        const galleryModalElt = document.querySelector('.modal-gallery');
        galleryModalElt.parentNode.insertBefore(deletModalErrorElt,galleryModalElt);

        modal.addEventListener('click', hideModal);
        modal.querySelector('.modal-close').addEventListener('click', hideModal);
        modal.querySelector('.modal-stop').addEventListener('click', stopPropagation);

        deleteModal = modal;

        // Display works in the modal
        generateDeleteGalleryNode();
    }
    //hide error message
    modal.querySelector('.message-error').style.display = "none";

    // Notify the opening of the current modal
    window.dispatchEvent(new CustomEvent("newModalOpened", { detail : modal}));

    currentModal = deleteModal;
}

/**
 * Hide the current modal
 * @param {*} event 
 * @returns 
 */
function hideModal(event) {
    event.preventDefault();

    if(currentModal === undefined) return;

    currentModal.style.display = "none";
    currentModal.setAttribute('aria-hidden',true);
    currentModal.removeAttribute('aria-modal');

    stopPropagation(event);
}

/**
 * Open the previous modal
 * @param {*} event 
 */
function previousModal(event) {
    hideModal(event);
    openDeleteModal(event);
}

/**
 * Stop the propagation of the event
 * @param {*} event 
 */
function stopPropagation(event) {
    event.stopPropagation(); 
}

/**
 * Triggered when a file is entered
 * @param {*} event 
 */
function handleFile(event) {
    fileChanged = true;
    refreshPreview(event);
}

/**
 * Triggered when the title of work is entered
 * @param {*} event 
 */
function handleImageTitle(event) {
    enableValidateButton();
}

/**
 * Triggered when the category is selected
 * @param {*} event 
 */
function handleCategorySelect(event) {
    categoryChanged = true;
    enableValidateButton();
}

/**
 * Refresh the preview of new work
 */
function refreshPreview(event) {
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

    enableValidateButton();
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
 * Validate input and enable or disable the validate button
 */
function enableValidateButton() {
    const image = document.querySelector('input[type=file]').files[0];
    const title = document.querySelector('[name=title]').value;
    const category = Number(document.querySelector('[name=categorySelect]').value);
 
    var imageValid = image === undefined ? false : computeFileSizeMo(image.size) <= 4;// Accept only images less than 4MB
    var extensionValid = image === undefined ? false : IMG_EXT.includes(getFileExtension(image));
    var titleValid = title === undefined ? false : TITLE_PATTERN.test(title.trim());  
    var categoryValid = category !== BUTTON_ALL_ID;  
 
    if(fileChanged && (!imageValid || !extensionValid)) {
        manageError(new Error(ACTION.UPLOAD_FILE));
    }
    else if(title.trim().length > 0 && !titleValid) {
        manageError(new Error(ACTION.IMAGE_TITLE));
    }
    else if(categoryChanged && !categoryValid) {
        manageError(new Error(ACTION.CATEGORY_SELECT));
    }
    else {
        addModal.querySelector('.message-error').style.display = "none";
    }

    const valid =  titleValid && imageValid && categoryValid && extensionValid;
    document.querySelector('.btn-validate').disabled = !valid;
}


/**
 * Convert file size to Mo
 * @param {*} size size in Oct
 * @returns size in Mo
 */
function computeFileSizeMo(size){
    return (size/(1024*1024));
}

/**
 * Get file extension
 * @param {*} file The file
 * @returns the extension the of the file
 */
function getFileExtension(file){
    const [ext, ...fileName] = file.name.split('.').reverse();
    return ext;
}

/**
 * Unsubscribe all listeners
 */
function unsubscribeListeners() {
    document.querySelector('.btn-modify').addEventListener('click', openDeleteModal);
    document.querySelector('.btn-add').addEventListener('click', opendAddModal);
    document.querySelector('.login').addEventListener('click', logout);

    // AddModal
    if(addModal) {
        addModal.addEventListener('click', hideModal);
        addModal.querySelector('.modal-previous').removeEventListener('click', previousModal);
        addModal.querySelector('.modal-close').removeEventListener('click', hideModal);
        addModal.querySelector('.modal-stop').removeEventListener('click',stopPropagation);
        document.getElementById("data-form").removeEventListener('submit', addWork);
        document.getElementById("data-form").removeEventListener('submit', addWork);
        document.querySelector('input[type=file]').removeEventListener('change', handleFile);
        document.querySelector('[name=title]').removeEventListener('keyup', handleImageTitle);
        document.querySelector('[name=categorySelect]').removeEventListener('change', handleCategorySelect);
    }

    //DeleteModal
    if(deleteModal) {
        deleteModal.removeEventListener('click', hideModal);
        deleteModal.querySelector('.modal-close').removeEventListener('click',  hideModal);
        deleteModal.querySelector('.modal-stop').removeEventListener('click',stopPropagation);
    }

    // Unsubscribe filter buttons
    unsubscribeFilterButtons();

    // Unsubscribe trash buttons
    works.forEach(work => unsubscribeTrashButton(work.id));
}

/**
 * Unsubscribe listener from delete work button
 * @param {*} workId The ID of the trash button to unsubscribe
 */
function unsubscribeTrashButton(workId) {
    document.querySelector(".work"+workId).removeEventListener('click', removeWork);
}

/**
 *  Unsubscribe listener all filter buttons
 */
function unsubscribeFilterButtons() {    
    categories.forEach((category) => {
        document.querySelector("."+category.name).removeEventListener('click', handleFilter);
    });
}
