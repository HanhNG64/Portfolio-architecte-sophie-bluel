const HOST = "http://localhost:5678/api";
const TOKEN_KEY = "sbtoken";
const BUTTON_ALL_ID = 0; // ID of the filter button for ALL
const BUTTON_ALL_NAME = "Tous"; // Name of the filter button for ALL
const TITLE_PATTERN = /^[a-zA-Z0-9._\séèàçù,"#?!@$%^&*;'+-]{3,50}$/; // Regex for image title
const IMG_EXT = ["png", "jpg"]; 
const ACTION = {
    GET:0,
    POST : 1,
    DELETE : 2,
    OTHER: 4
}
const MAP_ERROR = new Map([
    [ACTION.GET, 'Récupération impossible.'],
    [ACTION.POST, 'Ajout impossible.'],
    [ACTION.DELETE, 'Suppression impossible.'],
    [ACTION.OTHER, 'Oups.']
]);
const CAUSE_ERROR = new Map([
    [401, 'Authentification erronée.'],
    [404, 'Ressource non trouvée.']
]);
const MODE = {
    CONSULTATION :  0,
    EDITING : 1
}

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

const modeEditing = (() => {
    let mode = MODE.CONSULTATION;

    return {
        updateEditing: () => { 
            var hasToken = window.sessionStorage.getItem(TOKEN_KEY) !== null;
            mode = hasToken ? MODE.EDITING : MODE.CONSULTATION;
        },
        isEditing: () => {return mode === MODE.EDITING}
    };
})();

window.addEventListener('beforeunload', (e)=>{
    unsubscribeListeners();
});

// Run the application
try {
    run();
} catch(error){
    new CustomError(ACTION.OTHER).handleError();
}
finally {
    // Adapt the home page according to the editing mode
    modeEditing.updateEditing();
    refreshHomePage(modeEditing.isEditing());
}

/************* FUNCTIONS EXECUTION *************/

/**
 * Execute the applciation
 * @returns 
 */
async function run() {
    // Get and display works from API
    try {
        works = await getWorks();
        generateGalleryNode(works);
    }
    catch(error) {
        if(error instanceof CustomError) {
            error.handleError();
        }
        else {
            new CustomError(ACTION.GET).handleError();
            return;
        }
    }

    // Get and display categories from API
    try {
        Array.prototype.push.apply(categories, await getCategories()); 
        generateFilterNode(categories);

        // Apply default filter
        const categorie = categories.filter(categorie=> categorie.id === BUTTON_ALL_ID).shift();
        if(categorie && categorySelectedBtn === undefined) {
            const btn = document.getElementById(categorie.id);
            btn.classList.add("selected");
            categorySelectedBtn = btn;
        }
    }
    catch(error) {
        if(error instanceof CustomError) {
            error.handleError();
        }
        else {
            new CustomError(ACTION.GET).handleError();
            return;
        }
    }

    // Initialize listeners
    document.querySelector('.btn-modify').addEventListener('click', openDeleteModal);
    document.querySelector('.btn-add').addEventListener('click', opendAddModal);
    document.querySelector('.logout').addEventListener('click', logout);
    window.addEventListener('modalOpened', (e) => {
        if(e.detail === addModal ) {
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
    var logoutDisplay = isEditingMode ? "block" : "none";
    var loginDisplay = isEditingMode ? "none" : "block";
    var editionModeDisplay = isEditingMode ? "flex" : "none";

    var loginElt = document.querySelector('.login');
    loginElt.style.display = loginDisplay;

    var logoutElt = document.querySelector('.logout');
    logoutElt.style.display = logoutDisplay;

    var modifyElt = document.querySelector('.btn-modify');
    modifyElt.style.display = logoutDisplay;

    var edtionModeElt = document.querySelector('.edition-mode');
    edtionModeElt.style.display = editionModeDisplay;

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
    // Remove token and refresh the home page
    window.sessionStorage.removeItem(TOKEN_KEY);
    refreshHomePage();
}

/**************** FUNCTIONS API ***************/

/**
 * The custom error
 */
class CustomError extends Error {
    constructor(action,errorStatus) {
        super();
        this.name = "CustomError";

        let errorMessage = MAP_ERROR.has(action) ? MAP_ERROR.get(action) + " " : "";
        let cause = CAUSE_ERROR.has(errorStatus) ? CAUSE_ERROR.get(errorStatus) :  "";

        this.message  = errorMessage + cause;
    }

    /**
     * Error display management
     */
    handleError() {
        const page = currentModal ? currentModal : document;
        const errorElt = page.querySelector('.message-error');
        errorElt.innerHTML = this.message;
        errorElt.className = "message-error active"; 
    }
}

/**
 * Get works from API 
 * @returns Return works
 */
async function getWorks() {
    const reponse = await fetch(HOST+"/works");
    if(!reponse.ok){
        throw new CustomError(ACTION.GET,reponse.status);
    }
    return reponse.json();
}

/**
 * Post a new work to API
 * @param {*} work Work to post
 * @returns 
 */
async function postWork(work) {
    const reponse = await fetch(HOST+"/works", {
        method: "POST",
        headers: { 
            authorization : `Bearer ${window.sessionStorage.getItem(TOKEN_KEY)}`},
            body: work,
    });

    if (!reponse.ok) {
        throw new CustomError(ACTION.POST,reponse.status);
    }
    return reponse.json();
}

/**
 * Delete a work from the API.
 * @param {*} workId the ID of the work to delete
 * @returns 
 */
async function deleteWork(workId){
    var storedToken =  window.sessionStorage.getItem(TOKEN_KEY);

    const reponse = await fetch(`http://localhost:5678/api/works/${workId}`, {
            method: "DELETE",
            headers: {  authorization : `Bearer ${storedToken}` }
    });

    if(!reponse.ok){
        throw new CustomError(ACTION.DELETE,reponse.status);
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
        if(error instanceof CustomError) {
            error.handleError();
        }
        else {
            new CustomError(ACTION.POST).handleError();
        }
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
        document.querySelectorAll(".work"+workId).forEach(work=> work.remove());
        unsubscribeTrashButton(workId);
    } catch (error) {
        if(error instanceof CustomError) {
            error.handleError();
        }
        else {
            new CustomError(ACTION.DELETE).handleError();
        }
    }
}

/**
 * Get categories from the API
 * @returns Return categories
 */
async function getCategories(){
    const reponse = await fetch(HOST+"/categories");
    if(!reponse.ok) {
        throw new CustomError(ACTION.GET,reponse.status);
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

    if(categorySelectedBtn) categorySelectedBtn.classList.remove("selected");
    categorySelectedBtn = btn;    

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
    modal.style.display = null;
    modal.removeAttribute('aria-hidden');
    modal.setAttribute('aria-modal',true);

    if(addModal === undefined) {
        modal.addEventListener('click', hideModal);
        modal.querySelector('.modal-previous').addEventListener('click', previousModal);
        modal.querySelector('.modal-close').addEventListener('click', hideModal);
        modal.querySelector('.modal-stop').addEventListener('click',stopPropagation);
        document.getElementById("data-form").addEventListener('submit', addWork);
        document.getElementById("data-form").addEventListener('submit', addWork);
        document.querySelector('input[type=file]').addEventListener('change', refreshPreview);
        document.querySelector('[name=title]').addEventListener('keyup', validateWork);
        document.querySelector('[name=categorySelect]').addEventListener('change', validateWork);

        addModal = modal;
    }

    document.getElementById("data-form").reset();
    refreshPreview();

    // Build select categories options
    buildCategoriesOptions();

    // Notify the opening of the current modal
    const target = event.target;
    window.dispatchEvent(new CustomEvent("modalOpened", { detail : modal}));

    currentModal = addModal;
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

    if(deleteModal === undefined) {
        modal.addEventListener('click', hideModal);
        modal.querySelector('.modal-close').addEventListener('click',  hideModal);
        modal.querySelector('.modal-stop').addEventListener('click',stopPropagation);

        deleteModal = modal;
    }

    currentModal = deleteModal;

    // Display works in the modal
    generateDeleteGalleryNode();
}

function hideModal(event) {
    event.preventDefault();

    if(currentModal === undefined) return;

    currentModal.style.display = "none";
    currentModal.setAttribute('aria-hidden',true);
    currentModal.removeAttribute('aria-modal');
    currentModal.querySelector('.message-error').innerHTML = "";

    stopPropagation(event);
}

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

    validateWork();
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
function validateWork() {
    const image = document.querySelector('input[type=file]').files[0];
    const title = document.querySelector('[name=title]').value;
    const category = Number(document.querySelector('[name=categorySelect]').value);
 
    var imageValid = image === undefined ? false : computeFileSizeMo(image.size) <= 4;// Accept only images less than 4MB
    var extensionValid = image === undefined ? false : IMG_EXT.includes(getFileExtension(image));
    var titleValid = title === undefined ? false : TITLE_PATTERN.test(title.trim());  
    var categoryValid = category !== BUTTON_ALL_ID;  
 
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
    document.querySelector('.logout').addEventListener('click', logout);

    // AddModal
    if(addModal) {
        addModal.addEventListener('click', hideModal);
        addModal.querySelector('.modal-previous').removeEventListener('click', previousModal);
        addModal.querySelector('.modal-close').removeEventListener('click', hideModal);
        addModal.querySelector('.modal-stop').removeEventListener('click',stopPropagation);
        document.getElementById("data-form").removeEventListener('submit', addWork);
        document.getElementById("data-form").removeEventListener('submit', addWork);
        document.querySelector('input[type=file]').removeEventListener('change', refreshPreview);
        document.querySelector('[name=title]').removeEventListener('keyup', validateWork);
        document.querySelector('[name=categorySelect]').removeEventListener('change', validateWork);
    }

    //DeleteModal
    if(deleteModal) {
        deleteModal.addEventListener('click', hideModal);
        deleteModal.querySelector('.modal-close').addEventListener('click',  hideModal);
        deleteModal.querySelector('.modal-stop').addEventListener('click',stopPropagation);
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
