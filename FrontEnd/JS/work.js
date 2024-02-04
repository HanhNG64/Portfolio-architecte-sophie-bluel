const HOST = "http://localhost:5678";

// Récuperer les travaux
const works = await getWorks();

// Générer les travaux dans Html
generateWorks(works);

/**
 * Récupérer les travaux de l'API
 * @returns Renvoyer les travaux
 */
async function getWorks() {
    const reponse = await fetch(HOST+"/api/works");
    if(!reponse.ok){
        console.log("Erreur : "+ reponse.status);
    }
    return reponse.json();
}


/********************************** FONCTIONS ************************** */

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
  